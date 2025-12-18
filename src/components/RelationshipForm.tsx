import { useState, type FormEvent } from 'react';
import type { Person, RelationshipType } from '../types';
import { useEngine, useAddRelationship } from '../hooks/useEngine';
import './RelationshipForm.css';

interface RelationshipFormProps {
  person: Person;
  onClose: () => void;
}

export function RelationshipForm({ person, onClose }: RelationshipFormProps) {
  const { people } = useEngine();
  const addRelationship = useAddRelationship();

  const [selectedPersonId, setSelectedPersonId] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('parent');
  const [startDate, setStartDate] = useState('');

  const otherPeople = people.filter(p => p.id !== person.id);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPersonId) return;

    await addRelationship(
      person.id,
      selectedPersonId,
      relationshipType,
      startDate ? { startDate } : undefined
    );

    onClose();
  };

  const relationshipLabels: Record<RelationshipType, string> = {
    parent: 'is a parent of',
    child: 'is a child of',
    spouse: 'is married to',
    sibling: 'is a sibling of',
    partner: 'is a partner of'
  };

  return (
    <form className="relationship-form" onSubmit={handleSubmit}>
      <h2>Add Relationship</h2>

      <div className="relationship-sentence">
        <span className="person-name">{person.firstName}</span>

        <select
          value={relationshipType}
          onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
          className="relationship-select"
        >
          {Object.entries(relationshipLabels).map(([type, label]) => (
            <option key={type} value={type}>{label}</option>
          ))}
        </select>

        <select
          value={selectedPersonId}
          onChange={(e) => setSelectedPersonId(e.target.value)}
          className="person-select"
          required
        >
          <option value="">Select person...</option>
          {otherPeople.map(p => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </select>
      </div>

      {(relationshipType === 'spouse' || relationshipType === 'partner') && (
        <div className="form-group">
          <label htmlFor="startDate">
            {relationshipType === 'spouse' ? 'Marriage Date' : 'Start Date'}
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
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
