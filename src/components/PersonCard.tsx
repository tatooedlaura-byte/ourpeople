import type { Person } from '../types';
import { useDisplayName } from '../hooks/useEngine';
import './PersonCard.css';

interface PersonCardProps {
  person: Person;
  onClick?: () => void;
  isSelected?: boolean;
  showAsUser?: boolean;
}

export function PersonCard({ person, onClick, isSelected, showAsUser }: PersonCardProps) {
  const displayName = useDisplayName(person.id);

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
          <img src={person.photo} alt={displayName} />
        ) : (
          <span className="avatar-placeholder">
            {person.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="person-info">
        <h3 className="person-name">{displayName || person.name}</h3>
        {person.isUser && <span className="you-badge">You</span>}
      </div>
    </div>
  );
}
