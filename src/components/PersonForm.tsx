import { useState, type FormEvent } from 'react';
import type { Person } from '../types';
import './PersonForm.css';

interface PersonFormProps {
  person?: Person;
  onSubmit: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isFirstPerson?: boolean;
}

export function PersonForm({ person, onSubmit, onCancel, isFirstPerson }: PersonFormProps) {
  const [name, setName] = useState(person?.name ?? '');
  const [gender, setGender] = useState<Person['gender']>(person?.gender);
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [isUser, setIsUser] = useState(person?.isUser ?? isFirstPerson ?? false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      gender,
      notes: notes.trim() || undefined,
      isUser
    });
  };

  return (
    <form className="person-form" onSubmit={handleSubmit}>
      <h2>{person ? 'Edit Person' : 'Add Person'}</h2>

      <div className="form-group">
        <label htmlFor="name">Name *</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Betty, Joe, Mom"
          required
          autoFocus
        />
        <p className="form-hint">
          Just their first name or what you call them
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="gender">Gender</label>
        <select
          id="gender"
          value={gender ?? ''}
          onChange={(e) => setGender(e.target.value as Person['gender'] || undefined)}
        >
          <option value="">Not specified</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
        <p className="form-hint">
          Helps with labels like "mom" vs "dad", "aunt" vs "uncle"
        </p>
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            checked={isUser}
            onChange={(e) => setIsUser(e.target.checked)}
          />
          <span>This is me</span>
        </label>
        <p className="form-hint">
          Mark yourself so explanations can say "your mom", "your cousin", etc.
        </p>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes..."
          rows={2}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {person ? 'Save' : 'Add Person'}
        </button>
      </div>
    </form>
  );
}
