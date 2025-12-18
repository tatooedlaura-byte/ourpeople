import { useState, type FormEvent } from 'react';
import type { Person } from '../types';
import './PersonForm.css';

interface PersonFormProps {
  person?: Person;
  onSubmit: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function PersonForm({ person, onSubmit, onCancel }: PersonFormProps) {
  const [firstName, setFirstName] = useState(person?.firstName ?? '');
  const [lastName, setLastName] = useState(person?.lastName ?? '');
  const [nickname, setNickname] = useState(person?.nickname ?? '');
  const [birthDate, setBirthDate] = useState(person?.birthDate ?? '');
  const [deathDate, setDeathDate] = useState(person?.deathDate ?? '');
  const [gender, setGender] = useState<Person['gender']>(person?.gender);
  const [notes, setNotes] = useState(person?.notes ?? '');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim()) return;

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nickname.trim() || undefined,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
      gender,
      notes: notes.trim() || undefined
    });
  };

  return (
    <form className="person-form" onSubmit={handleSubmit}>
      <h2>{person ? 'Edit Person' : 'Add Person'}</h2>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="nickname">Nickname</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="gender">Gender</label>
          <select
            id="gender"
            value={gender ?? ''}
            onChange={(e) => setGender(e.target.value as Person['gender'] || undefined)}
          >
            <option value="">Not specified</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="birthDate">Birth Date</label>
          <input
            id="birthDate"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="deathDate">Death Date</label>
          <input
            id="deathDate"
            type="date"
            value={deathDate}
            onChange={(e) => setDeathDate(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {person ? 'Save Changes' : 'Add Person'}
        </button>
      </div>
    </form>
  );
}
