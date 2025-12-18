import { useState, type FormEvent } from 'react';
import type { Person, RelationshipType } from '../types';
import { useEngine, useAddRelationship } from '../hooks/useEngine';
import './RelationshipForm.css';

interface RelationshipFormProps {
  person: Person;
  onClose: () => void;
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
  const addRelationship = useAddRelationship();

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('parent');

  const otherPeople = people.filter(p => p.id !== person.id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPersonId) return;

    await addRelationship(person.id, selectedPersonId, relationshipType);
    onClose();
  };

  const selectedOption = RELATIONSHIP_OPTIONS.find(o => o.type === relationshipType);

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
