import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import type { Person } from '../types';
import './PersonForm.css';

interface PersonFormProps {
  person?: Person;
  onSubmit: (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isFirstPerson?: boolean;
}

export function PersonForm({ person, onSubmit, onCancel }: PersonFormProps) {
  const [name, setName] = useState(person?.name ?? '');
  const [gender, setGender] = useState<Person['gender']>(person?.gender);
  const [notes, setNotes] = useState(person?.notes ?? '');
  const [photo, setPhoto] = useState<string | undefined>(person?.photo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    onSubmit({
      name: name.trim(),
      gender,
      notes: notes.trim() || undefined,
      photo
    });
  };

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        <label>Photo</label>
        <div className="photo-upload">
          {photo ? (
            <div className="photo-preview">
              <img src={photo} alt="Preview" />
              <button
                type="button"
                className="btn-remove-photo"
                onClick={handleRemovePhoto}
                title="Remove photo"
              >
                &times;
              </button>
            </div>
          ) : (
            <div className="photo-placeholder">
              <span>{name ? name[0].toUpperCase() : '?'}</span>
            </div>
          )}
          <div className="photo-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="photo-input"
              id="photo-input"
            />
            <label htmlFor="photo-input" className="btn-secondary photo-btn">
              {photo ? 'Change Photo' : 'Add Photo'}
            </label>
          </div>
        </div>
        <p className="form-hint">
          Optional - helps recognize people at reunions!
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
