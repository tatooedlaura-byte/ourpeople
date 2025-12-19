import type { Person } from '../types';
import './PersonCard.css';

interface PersonCardProps {
  person: Person;
  onClick?: () => void;
  isSelected?: boolean;
  showAsUser?: boolean;
}

export function PersonCard({ person, onClick, isSelected, showAsUser }: PersonCardProps) {
  return (
    <div
      className={`person-card ${isSelected ? 'selected' : ''} ${showAsUser ? 'is-user' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="person-avatar">
        {person.photo ? (
          <img src={person.photo} alt={person.name} />
        ) : (
          <span className="avatar-placeholder">
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="person-info">
        <h3 className="person-name">{person.name}</h3>
        {showAsUser && <span className="you-badge">You</span>}
      </div>
    </div>
  );
}
