import type { Person } from '../types';
import './PersonCard.css';

interface PersonCardProps {
  person: Person;
  onClick?: () => void;
  isSelected?: boolean;
}

export function PersonCard({ person, onClick, isSelected }: PersonCardProps) {
  const displayName = person.nickname
    ? `${person.firstName} "${person.nickname}" ${person.lastName}`
    : `${person.firstName} ${person.lastName}`;

  const age = person.birthDate ? calculateAge(person.birthDate, person.deathDate) : null;

  return (
    <div
      className={`person-card ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="person-avatar">
        {person.photo ? (
          <img src={person.photo} alt={displayName} />
        ) : (
          <span className="avatar-placeholder">
            {person.firstName[0]}{person.lastName[0]}
          </span>
        )}
      </div>
      <div className="person-info">
        <h3 className="person-name">{displayName}</h3>
        {age !== null && (
          <p className="person-age">
            {person.deathDate ? `Lived ${age} years` : `Age ${age}`}
          </p>
        )}
        {person.birthDate && (
          <p className="person-dates">
            {formatDate(person.birthDate)}
            {person.deathDate && ` - ${formatDate(person.deathDate)}`}
          </p>
        )}
      </div>
    </div>
  );
}

function calculateAge(birthDate: string, deathDate?: string): number {
  const birth = new Date(birthDate);
  const end = deathDate ? new Date(deathDate) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const monthDiff = end.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
