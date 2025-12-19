import { useState, type FormEvent } from 'react';
import type { Person } from '../types';
import { useAddPerson, useAddRelationship } from '../hooks/useEngine';
import './QuickAddFamily.css';

interface FamilyMember {
  name: string;
  gender: Person['gender'];
}

interface QuickAddFamilyProps {
  person: Person;  // The person we're adding family to
  onClose: () => void;
  onComplete: () => void;
}

export function QuickAddFamily({ person, onClose, onComplete }: QuickAddFamilyProps) {
  const addPerson = useAddPerson();
  const addRelationship = useAddRelationship();

  const [spouse, setSpouse] = useState<FamilyMember>({ name: '', gender: undefined });
  const [addSpouse, setAddSpouse] = useState(true);
  const [children, setChildren] = useState<FamilyMember[]>([
    { name: '', gender: undefined }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddChild = () => {
    setChildren([...children, { name: '', gender: undefined }]);
  };

  const handleRemoveChild = (index: number) => {
    setChildren(children.filter((_, i) => i !== index));
  };

  const handleChildChange = (index: number, field: keyof FamilyMember, value: string) => {
    const updated = [...children];
    if (field === 'gender') {
      updated[index].gender = value as Person['gender'] || undefined;
    } else {
      updated[index].name = value;
    }
    setChildren(updated);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let spouseId: string | undefined;

      // Add spouse if specified
      if (addSpouse && spouse.name.trim()) {
        const newSpouse = await addPerson({
          name: spouse.name.trim(),
          gender: spouse.gender
        });
        if (newSpouse) {
          spouseId = newSpouse.id;
          await addRelationship(newSpouse.id, person.id, 'spouse');
        }
      }

      // Add children
      for (const child of children) {
        if (child.name.trim()) {
          const newChild = await addPerson({
            name: child.name.trim(),
            gender: child.gender
          });
          if (newChild) {
            // Person is parent of child
            await addRelationship(person.id, newChild.id, 'parent');
            // Spouse is also parent of child (if added)
            if (spouseId) {
              await addRelationship(spouseId, newChild.id, 'parent');
            }
          }
        }
      }

      onComplete();
    } catch (error) {
      console.error('Error adding family:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const validChildren = children.filter(c => c.name.trim()).length;
  const hasValidData = (addSpouse && spouse.name.trim()) || validChildren > 0;

  return (
    <div className="quick-add-family">
      <h2>Add Family for {person.name}</h2>
      <p className="quick-add-hint">
        Quickly add {person.name}'s spouse and children at once
      </p>

      <form onSubmit={handleSubmit}>
        {/* Spouse Section */}
        <div className="family-section">
          <div className="section-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={addSpouse}
                onChange={(e) => setAddSpouse(e.target.checked)}
              />
              <span>Add Spouse</span>
            </label>
          </div>

          {addSpouse && (
            <div className="member-row">
              <input
                type="text"
                placeholder="Spouse's name"
                value={spouse.name}
                onChange={(e) => setSpouse({ ...spouse, name: e.target.value })}
                className="name-input"
              />
              <select
                value={spouse.gender || ''}
                onChange={(e) => setSpouse({ ...spouse, gender: e.target.value as Person['gender'] || undefined })}
                className="gender-select"
              >
                <option value="">Gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          )}
        </div>

        {/* Children Section */}
        <div className="family-section">
          <div className="section-header">
            <h3>Children</h3>
            <button type="button" className="btn-add-child" onClick={handleAddChild}>
              + Add Child
            </button>
          </div>

          <div className="children-list">
            {children.map((child, index) => (
              <div key={index} className="member-row">
                <input
                  type="text"
                  placeholder={`Child ${index + 1}'s name`}
                  value={child.name}
                  onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                  className="name-input"
                />
                <select
                  value={child.gender || ''}
                  onChange={(e) => handleChildChange(index, 'gender', e.target.value)}
                  className="gender-select"
                >
                  <option value="">Gender</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
                {children.length > 1 && (
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveChild(index)}
                    title="Remove"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        {hasValidData && (
          <div className="add-summary">
            Will add:
            {addSpouse && spouse.name.trim() && (
              <span className="summary-item">
                {spouse.name} as spouse
              </span>
            )}
            {validChildren > 0 && (
              <span className="summary-item">
                {validChildren} {validChildren === 1 ? 'child' : 'children'}
              </span>
            )}
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={!hasValidData || isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add Family'}
          </button>
        </div>
      </form>
    </div>
  );
}
