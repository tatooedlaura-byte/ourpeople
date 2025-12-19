import { useState, type FormEvent } from 'react';
import type { Person, RelationshipType } from '../types';
import { useEngine, useAddPerson, useAddRelationship } from '../hooks/useEngine';
import './RelationshipForm.css';

interface RelationshipFormProps {
  person: Person;
  onClose: () => void;
}

interface Suggestion {
  message: string;
  action: string;
  type: RelationshipType;
  fromPerson: Person;
}

// Only these 5 types - everything else is derived!
const RELATIONSHIP_OPTIONS: { type: RelationshipType; label: string; description: string }[] = [
  { type: 'parent', label: 'is a parent of', description: 'Mom, Dad, etc.' },
  { type: 'child', label: 'is a child of', description: 'Son, Daughter, etc.' },
  { type: 'sibling', label: 'is a sibling of', description: 'Brother, Sister' },
  { type: 'spouse', label: 'is married to / partnered with', description: 'Husband, Wife, Partner' },
  { type: 'friend', label: 'is a friend of', description: 'Family friend' },
];

export function RelationshipForm({ person, onClose }: RelationshipFormProps) {
  const { people } = useEngine();
  const addPerson = useAddPerson();
  const addRelationship = useAddRelationship();

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('parent');

  // Suggestion state
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddGender, setQuickAddGender] = useState<Person['gender']>();
  const [suggestionSelectedId, setSuggestionSelectedId] = useState('');

  const otherPeople = people.filter(p => p.id !== person.id);

  const generateSuggestion = (type: RelationshipType, targetPerson: Person): Suggestion | null => {
    switch (type) {
      case 'parent':
        // Added a parent → suggest adding siblings
        return {
          message: `Does ${person.name} have any siblings?`,
          action: `Add a sibling for ${person.name}`,
          type: 'sibling',
          fromPerson: person
        };
      case 'child':
        // Added a child → suggest adding more children
        return {
          message: `Does ${person.name} have more children?`,
          action: `Add another child for ${person.name}`,
          type: 'child',
          fromPerson: person
        };
      case 'spouse':
        // Added a spouse → suggest adding children
        return {
          message: `Do ${person.name} and ${targetPerson.name} have children?`,
          action: `Add a child`,
          type: 'child',
          fromPerson: person
        };
      case 'sibling':
        // Added a sibling → suggest adding more siblings
        return {
          message: `Are there more siblings?`,
          action: `Add another sibling`,
          type: 'sibling',
          fromPerson: person
        };
      default:
        return null;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPersonId) return;

    await addRelationship(person.id, selectedPersonId, relationshipType);

    const targetPerson = people.find(p => p.id === selectedPersonId);
    if (targetPerson) {
      const newSuggestion = generateSuggestion(relationshipType, targetPerson);
      if (newSuggestion) {
        setSuggestion(newSuggestion);
        setShowSuggestion(true);
        setSelectedPersonId('');
        return;
      }
    }

    onClose();
  };

  const handleQuickAdd = async (e: FormEvent) => {
    e.preventDefault();

    if (!quickAddName.trim() || !suggestion) return;

    // Create the new person
    const newPerson = await addPerson({
      name: quickAddName.trim(),
      gender: quickAddGender
    });

    if (newPerson) {
      // Add the suggested relationship
      await addRelationship(suggestion.fromPerson.id, newPerson.id, suggestion.type);

      // Generate next suggestion
      const nextSuggestion = generateSuggestion(suggestion.type, newPerson);
      if (nextSuggestion) {
        setSuggestion(nextSuggestion);
        setQuickAddName('');
        setQuickAddGender(undefined);
        return;
      }
    }

    onClose();
  };

  const handleSelectExisting = async () => {
    if (!suggestionSelectedId || !suggestion) return;

    const selectedPerson = people.find(p => p.id === suggestionSelectedId);
    await addRelationship(suggestion.fromPerson.id, suggestionSelectedId, suggestion.type);

    if (selectedPerson) {
      const nextSuggestion = generateSuggestion(suggestion.type, selectedPerson);
      if (nextSuggestion) {
        setSuggestion(nextSuggestion);
        setSuggestionSelectedId('');
        return;
      }
    }
    onClose();
  };

  const selectedOption = RELATIONSHIP_OPTIONS.find(o => o.type === relationshipType);

  // Show suggestion view
  if (showSuggestion && suggestion) {
    return (
      <div className="relationship-form">
        <h2>Relationship Added!</h2>

        <div className="suggestion-box">
          <p className="suggestion-message">{suggestion.message}</p>

          <form onSubmit={handleQuickAdd} className="quick-add-form">
            <div className="quick-add-row">
              <input
                type="text"
                placeholder="Name..."
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                className="quick-add-input"
                autoFocus
              />
              <select
                value={quickAddGender || ''}
                onChange={(e) => setQuickAddGender(e.target.value as Person['gender'] || undefined)}
                className="quick-add-gender"
              >
                <option value="">Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <button type="submit" className="btn-primary" disabled={!quickAddName.trim()}>
                Add
              </button>
            </div>
          </form>

          <p className="suggestion-hint">
            Or select an existing person:
          </p>

          <div className="existing-person-select">
            <select
              value={suggestionSelectedId}
              onChange={(e) => setSuggestionSelectedId(e.target.value)}
            >
              <option value="">Choose someone...</option>
              {otherPeople
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
            <button
              type="button"
              className="btn-primary"
              disabled={!suggestionSelectedId}
              onClick={handleSelectExisting}
            >
              Add
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="relationship-form" onSubmit={handleSubmit}>
      <h2>Add Relationship</h2>

      <p className="form-description">
        Define how <strong>{person.name}</strong> is related to someone else.
        <br />
        <em>Labels like "aunt" or "grandpa" are figured out automatically!</em>
      </p>

      <div className="relationship-builder">
        <div className="relationship-person">
          <span className="person-name-tag">{person.name}</span>
        </div>

        <div className="relationship-type-select">
          {RELATIONSHIP_OPTIONS.map(option => (
            <label
              key={option.type}
              className={`type-option ${relationshipType === option.type ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="relationshipType"
                value={option.type}
                checked={relationshipType === option.type}
                onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
              />
              <span className="type-label">{option.label}</span>
              <span className="type-hint">{option.description}</span>
            </label>
          ))}
        </div>

        <div className="relationship-target">
          <select
            value={selectedPersonId}
            onChange={(e) => setSelectedPersonId(e.target.value)}
            required
          >
            <option value="">Select person...</option>
            {otherPeople.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedPersonId && selectedOption && (
        <div className="relationship-preview">
          <strong>{person.name}</strong> {selectedOption.label} <strong>
            {otherPeople.find(p => p.id === selectedPersonId)?.name}
          </strong>
        </div>
      )}

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={!selectedPersonId}>
          Add Relationship
        </button>
      </div>
    </form>
  );
}
