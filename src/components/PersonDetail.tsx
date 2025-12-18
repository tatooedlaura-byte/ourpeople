import { useState } from 'react';
import type { Person, PersonWithRelations } from '../types';
import { PersonCard } from './PersonCard';
import { PersonForm } from './PersonForm';
import { RelationshipForm } from './RelationshipForm';
import { useUpdatePerson, useDeletePerson } from '../hooks/useEngine';
import './PersonDetail.css';

interface PersonDetailProps {
  personWithRelations: PersonWithRelations;
  onPersonClick: (id: string) => void;
  onClose: () => void;
}

export function PersonDetail({ personWithRelations, onPersonClick, onClose }: PersonDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddRelationship, setShowAddRelationship] = useState(false);

  const updatePerson = useUpdatePerson();
  const deletePerson = useDeletePerson();

  const { parents, children, spouses, siblings, partners, ...person } = personWithRelations;

  const handleUpdate = async (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    await updatePerson(person.id, data);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to delete ${person.firstName} ${person.lastName}? This will also remove all their relationships.`)) {
      await deletePerson(person.id);
      onClose();
    }
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

  const displayName = person.nickname
    ? `${person.firstName} "${person.nickname}" ${person.lastName}`
    : `${person.firstName} ${person.lastName}`;

  return (
    <div className="person-detail">
      <div className="detail-header">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <div className="detail-avatar">
          {person.photo ? (
            <img src={person.photo} alt={displayName} />
          ) : (
            <span className="avatar-placeholder-large">
              {person.firstName[0]}{person.lastName[0]}
            </span>
          )}
        </div>
        <h1>{displayName}</h1>
        {person.birthDate && (
          <p className="dates">
            {formatDate(person.birthDate)}
            {person.deathDate && ` - ${formatDate(person.deathDate)}`}
          </p>
        )}
        {person.notes && <p className="notes">{person.notes}</p>}

        <div className="detail-actions">
          <button className="btn-secondary" onClick={() => setIsEditing(true)}>
            Edit
          </button>
          <button className="btn-secondary" onClick={() => setShowAddRelationship(true)}>
            Add Relationship
          </button>
          <button className="btn-danger" onClick={handleDelete}>
            Delete
          </button>
        </div>
      </div>

      <div className="relationships-section">
        {parents.length > 0 && (
          <RelationshipGroup
            title="Parents"
            people={parents}
            onPersonClick={onPersonClick}
          />
        )}

        {siblings.length > 0 && (
          <RelationshipGroup
            title="Siblings"
            people={siblings}
            onPersonClick={onPersonClick}
          />
        )}

        {spouses.length > 0 && (
          <RelationshipGroup
            title="Spouse"
            people={spouses}
            onPersonClick={onPersonClick}
          />
        )}

        {partners.length > 0 && (
          <RelationshipGroup
            title="Partner"
            people={partners}
            onPersonClick={onPersonClick}
          />
        )}

        {children.length > 0 && (
          <RelationshipGroup
            title="Children"
            people={children}
            onPersonClick={onPersonClick}
          />
        )}

        {parents.length === 0 && siblings.length === 0 && spouses.length === 0 &&
         partners.length === 0 && children.length === 0 && (
          <p className="no-relationships">
            No relationships added yet. Click "Add Relationship" to connect this person to others.
          </p>
        )}
      </div>
    </div>
  );
}

interface RelationshipGroupProps {
  title: string;
  people: Person[];
  onPersonClick: (id: string) => void;
}

function RelationshipGroup({ title, people, onPersonClick }: RelationshipGroupProps) {
  return (
    <div className="relationship-group">
      <h3>{title}</h3>
      <div className="relationship-cards">
        {people.map(person => (
          <PersonCard
            key={person.id}
            person={person}
            onClick={() => onPersonClick(person.id)}
          />
        ))}
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}
