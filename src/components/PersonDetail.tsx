import { useState } from 'react';
import type { Person } from '../types';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { QuickAddFamily } from './QuickAddFamily';
import { useUpdatePerson, useDeletePerson, useExplanations, useNametag, usePerspective } from '../hooks/useEngine';
import './PersonDetail.css';

interface PersonDetailProps {
  person: Person;
  onClose: () => void;
}

export function PersonDetail({ person, onClose }: PersonDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddRelationship, setShowAddRelationship] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const { perspectiveId, setPerspective } = usePerspective();
  const explanationData = useExplanations(person.id);
  const nametag = useNametag(person.id);

  const isCurrentPerspective = person.id === perspectiveId;

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

  if (showAddRelationship) {
    return (
      <div className="person-detail">
        <RelationshipForm
          person={person}
          onClose={() => setShowAddRelationship(false)}
        />
      </div>
    );
  }

  if (showQuickAdd) {
    return (
      <div className="person-detail">
        <QuickAddFamily
          person={person}
          onClose={() => setShowQuickAdd(false)}
          onComplete={() => setShowQuickAdd(false)}
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
      <div className="explanations-section">
        {explanationData && explanationData.explanations.length > 0 ? (
          <ul className="explanations-list">
            {explanationData.explanations.map((explanation, index) => (
              <li key={index} className="explanation-item">
                {explanation}
              </li>
            ))}
          </ul>
        ) : !isCurrentPerspective && (
          <p className="no-explanations">
            Add relationships to see how {person.name} is connected to you.
          </p>
        )}
      </div>

      {/* Nametag Section */}
      {nametag && nametag.lines.length > 0 && (
        <div className="nametag-section">
          <h3 className="nametag-header">Family Connections</h3>
          <div className="nametag-lines">
            {nametag.lines.map((line, index) => (
              <div key={index} className="nametag-line">
                <span className="nametag-label">{line.label}</span>
                <span className="nametag-names">{line.names.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {person.notes && (
        <div className="notes-section">
          <p className="person-notes">{person.notes}</p>
        </div>
      )}

      <div className="detail-actions">
        <button className="btn-action btn-quick-add" onClick={() => setShowQuickAdd(true)}>
          + Add Family
        </button>
        <button className="btn-action" onClick={() => setShowAddRelationship(true)}>
          Add Relationship
        </button>
        <button className="btn-action" onClick={() => setIsEditing(true)}>
          Edit
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
