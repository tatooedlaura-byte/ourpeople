import { useState } from 'react';
import type { Person, RelationshipType } from '../types';
import { PersonForm } from './PersonForm';
import {
  useEngine,
  useUpdatePerson,
  useDeletePerson,
  useExplanations,
  useDirectRelationships,
  useAddPerson,
  useAddRelationship,
  useDeleteRelationship,
  usePerspective
} from '../hooks/useEngine';
import './PersonDetail.css';

interface PersonDetailProps {
  person: Person;
  onClose: () => void;
}

interface RelationshipSectionProps {
  label: string;
  people: Array<{ person: Person; relationshipId: string }>;
  allPeople: Person[];
  currentPersonId: string;
  onAdd: (personId: string | null, name: string, gender?: Person['gender']) => void;
  onRemove: (relationshipId: string) => void;
  onSelect: (personId: string) => void;
  singleOnly?: boolean;
}

function RelationshipSection({
  label,
  people,
  allPeople,
  currentPersonId,
  onAdd,
  onRemove,
  onSelect,
  singleOnly = false
}: RelationshipSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Person['gender']>();
  const [selectedExisting, setSelectedExisting] = useState('');

  // Filter out people already in this relationship and the current person
  const existingIds = new Set(people.map(p => p.person.id));
  existingIds.add(currentPersonId);
  const availablePeople = allPeople.filter(p => !existingIds.has(p.id));

  const handleAdd = () => {
    if (selectedExisting) {
      onAdd(selectedExisting, '', undefined);
    } else if (newName.trim()) {
      onAdd(null, newName.trim(), newGender);
    }
    setNewName('');
    setNewGender(undefined);
    setSelectedExisting('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewName('');
      setSelectedExisting('');
    }
  };

  const showAddButton = !singleOnly || people.length === 0;

  return (
    <div className="relationship-section">
      <div className="section-label">{label}</div>
      <div className="section-content">
        {people.map(({ person: p, relationshipId }) => (
          <div key={p.id} className="relationship-chip">
            <button
              className="chip-name"
              onClick={() => onSelect(p.id)}
            >
              {p.name}
            </button>
            <button
              className="chip-remove"
              onClick={() => onRemove(relationshipId)}
              title="Remove"
            >
              &times;
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="add-inline">
            <select
              value={selectedExisting}
              onChange={(e) => {
                setSelectedExisting(e.target.value);
                if (e.target.value) setNewName('');
              }}
              className="add-select"
            >
              <option value="">-- New person --</option>
              {availablePeople
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>

            {!selectedExisting && (
              <>
                <input
                  type="text"
                  placeholder="Name..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="add-input"
                  autoFocus
                />
                <select
                  value={newGender || ''}
                  onChange={(e) => setNewGender(e.target.value as Person['gender'] || undefined)}
                  className="add-gender"
                >
                  <option value="">Gender</option>
                  <option value="female">F</option>
                  <option value="male">M</option>
                </select>
              </>
            )}

            <button
              className="add-confirm"
              onClick={handleAdd}
              disabled={!selectedExisting && !newName.trim()}
            >
              ✓
            </button>
            <button
              className="add-cancel"
              onClick={() => {
                setIsAdding(false);
                setNewName('');
                setSelectedExisting('');
              }}
            >
              ✕
            </button>
          </div>
        ) : showAddButton ? (
          <button
            className="add-btn-inline"
            onClick={() => setIsAdding(true)}
          >
            + add
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PersonDetail({ person, onClose }: PersonDetailProps) {
  const [isEditing, setIsEditing] = useState(false);

  const { people } = useEngine();
  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const addPerson = useAddPerson();
  const addRelationship = useAddRelationship();
  const deleteRelationship = useDeleteRelationship();
  const { perspectiveId, setPerspective } = usePerspective();
  const explanationData = useExplanations(person.id);
  const directRelationships = useDirectRelationships(person.id);

  const isCurrentPerspective = person.id === perspectiveId;

  // Group relationships by type
  const relationshipsByType: Record<RelationshipType, Array<{ person: Person; relationshipId: string }>> = {
    spouse: [],
    parent: [],
    child: [],
    sibling: [],
    friend: []
  };

  for (const rel of directRelationships) {
    relationshipsByType[rel.type].push({
      person: rel.person,
      relationshipId: rel.relationshipId
    });
  }

  const handleUpdate = async (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    await updatePerson(person.id, data);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to remove ${person.name}? This will also remove all their relationships.`)) {
      await deletePerson(person.id);
      onClose();
    }
  };

  const handleSetAsPerspective = () => {
    setPerspective(person.id);
  };

  const handleAddRelationship = async (
    type: RelationshipType,
    existingPersonId: string | null,
    name: string,
    gender?: Person['gender']
  ) => {
    let targetId = existingPersonId;

    // Create new person if needed
    if (!targetId && name) {
      const newPerson = await addPerson({ name, gender });
      if (newPerson) {
        targetId = newPerson.id;
      }
    }

    if (targetId) {
      // Add relationship based on type
      // The relationship is stored as "person A [type] of person B"
      // So we need to handle the direction correctly
      if (type === 'parent') {
        // Target is a parent OF current person
        await addRelationship(targetId, person.id, 'parent');
      } else if (type === 'child') {
        // Current person is parent OF target (target is child)
        await addRelationship(person.id, targetId, 'parent');
      } else {
        // Symmetric relationships: spouse, sibling, friend
        await addRelationship(person.id, targetId, type);
      }
    }
  };

  const handleRemoveRelationship = async (relationshipId: string) => {
    await deleteRelationship(relationshipId);
  };

  const handleSelectPerson = (personId: string) => {
    // This would ideally navigate to that person, but for now we'll just log
    // The parent component handles selection, so we need to pass this up
    // For now, let's trigger a close and the parent will handle it
    // Actually, let's just close and set the selected person via the URL or state
    window.dispatchEvent(new CustomEvent('selectPerson', { detail: personId }));
  };

  if (isEditing) {
    return (
      <div className="person-detail">
        <PersonForm
          person={person}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="person-detail">
      <button className="close-btn" onClick={onClose}>&times;</button>

      <div className="detail-header">
        <div className="detail-avatar">
          {person.photo ? (
            <img src={person.photo} alt={person.name} />
          ) : (
            <span className="avatar-placeholder-large">
              {person.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <h1 className="detail-name">
          {person.name}
        </h1>

        {isCurrentPerspective && (
          <span className="you-badge-large">This is you</span>
        )}
      </div>

      {/* Relationship Explanations */}
      {explanationData && explanationData.explanations.length > 0 && !isCurrentPerspective && (
        <div className="explanations-section">
          <ul className="explanations-list">
            {explanationData.explanations.map((explanation, index) => (
              <li key={index} className="explanation-item">
                {explanation}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Inline Relationship Editing */}
      <div className="relationships-editor">
        <RelationshipSection
          label="Spouse"
          people={relationshipsByType.spouse}
          allPeople={people}
          currentPersonId={person.id}
          onAdd={(id, name, gender) => handleAddRelationship('spouse', id, name, gender)}
          onRemove={handleRemoveRelationship}
          onSelect={handleSelectPerson}
          singleOnly={true}
        />

        <RelationshipSection
          label="Parents"
          people={relationshipsByType.parent}
          allPeople={people}
          currentPersonId={person.id}
          onAdd={(id, name, gender) => handleAddRelationship('parent', id, name, gender)}
          onRemove={handleRemoveRelationship}
          onSelect={handleSelectPerson}
        />

        <RelationshipSection
          label="Children"
          people={relationshipsByType.child}
          allPeople={people}
          currentPersonId={person.id}
          onAdd={(id, name, gender) => handleAddRelationship('child', id, name, gender)}
          onRemove={handleRemoveRelationship}
          onSelect={handleSelectPerson}
        />

        <RelationshipSection
          label="Siblings"
          people={relationshipsByType.sibling}
          allPeople={people}
          currentPersonId={person.id}
          onAdd={(id, name, gender) => handleAddRelationship('sibling', id, name, gender)}
          onRemove={handleRemoveRelationship}
          onSelect={handleSelectPerson}
        />

        <RelationshipSection
          label="Friends"
          people={relationshipsByType.friend}
          allPeople={people}
          currentPersonId={person.id}
          onAdd={(id, name, gender) => handleAddRelationship('friend', id, name, gender)}
          onRemove={handleRemoveRelationship}
          onSelect={handleSelectPerson}
        />
      </div>

      {person.notes && (
        <div className="notes-section">
          <p className="person-notes">{person.notes}</p>
        </div>
      )}

      <div className="detail-actions">
        <button className="btn-action" onClick={() => setIsEditing(true)}>
          Edit Profile
        </button>
        {!isCurrentPerspective && (
          <button className="btn-action btn-set-me" onClick={handleSetAsPerspective}>
            View as {person.name}
          </button>
        )}
        <button className="btn-action btn-danger" onClick={handleDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}
