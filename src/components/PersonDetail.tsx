import { useState } from 'react';
import type { Person } from '../types';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { useUpdatePerson, useDeletePerson, useExplanations, useSetUser } from '../hooks/useEngine';
import './PersonDetail.css';

interface PersonDetailProps {
  person: Person;
  onClose: () => void;
}

export function PersonDetail({ person, onClose }: PersonDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddRelationship, setShowAddRelationship] = useState(false);

  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();
  const setUser = useSetUser();
  const explanationData = useExplanations(person.id);

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

  const handleSetAsMe = async () => {
    await setUser(person.id);
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
          {explanationData?.displayName || person.name}
        </h1>

        {person.isUser && (
          <span className="you-badge-large">This is you</span>
        )}
      </div>

      <div className="explanations-section">
        {explanationData && explanationData.explanations.length > 0 ? (
          <ul className="explanations-list">
            {explanationData.explanations.map((explanation, index) => (
              <li key={index} className="explanation-item">
                {explanation}
              </li>
            ))}
          </ul>
        ) : (
          <p className="no-explanations">
            Add relationships to see how {person.name} is connected to your family.
          </p>
        )}
      </div>

      {person.notes && (
        <div className="notes-section">
          <p className="person-notes">{person.notes}</p>
        </div>
      )}

      <div className="detail-actions">
        <button className="btn-action" onClick={() => setShowAddRelationship(true)}>
          Add Relationship
        </button>
        <button className="btn-action" onClick={() => setIsEditing(true)}>
          Edit
        </button>
        {!person.isUser && (
          <button className="btn-action btn-set-me" onClick={handleSetAsMe}>
            Set as Me
          </button>
        )}
        <button className="btn-action btn-danger" onClick={handleDelete}>
          Remove
        </button>
      </div>
    </div>
  );
}
