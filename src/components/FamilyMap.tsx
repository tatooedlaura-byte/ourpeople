import { useMemo } from 'react';
import { useEngine } from '../hooks/useEngine';
import './FamilyMap.css';

interface FamilyMapProps {
  onSelectPerson: (personId: string) => void;
  onClose: () => void;
}

export function FamilyMap({ onSelectPerson, onClose }: FamilyMapProps) {
  const { people, engine } = useEngine();

  // Calculate connections for each person
  const peopleWithConnections = useMemo(() => {
    if (!engine) return [];

    return people.map(person => {
      const rels = engine.getDirectRelationships(person.id);
      return {
        person,
        connectionCount: rels.length,
        connections: rels.map(r => ({ person: r.person, type: r.type }))
      };
    });
  }, [people, engine]);

  // Separate into connected and unconnected
  const connected = peopleWithConnections.filter(p => p.connectionCount > 0);
  const unconnected = peopleWithConnections.filter(p => p.connectionCount === 0);

  // Sort connected by number of connections (most connected first)
  connected.sort((a, b) => b.connectionCount - a.connectionCount);

  const totalPeople = people.length;
  const connectedCount = connected.length;
  const unconnectedCount = unconnected.length;

  return (
    <div className="family-map">
      <div className="map-header">
        <h2>Family Map</h2>
      </div>

      <div className="map-stats">
        <div className="stat">
          <span className="stat-number">{totalPeople}</span>
          <span className="stat-label">People</span>
        </div>
        <div className="stat stat-good">
          <span className="stat-number">{connectedCount}</span>
          <span className="stat-label">Connected</span>
        </div>
        {unconnectedCount > 0 && (
          <div className="stat stat-warning">
            <span className="stat-number">{unconnectedCount}</span>
            <span className="stat-label">Unconnected</span>
          </div>
        )}
      </div>

      {unconnectedCount > 0 && (
        <div className="unconnected-section">
          <h3 className="section-title section-warning">
            Needs Connections
          </h3>
          <p className="section-hint">
            These people don't have any relationships defined yet
          </p>
          <div className="people-grid">
            {unconnected.map(({ person }) => (
              <button
                key={person.id}
                className="person-node unconnected"
                onClick={() => onSelectPerson(person.id)}
              >
                <div className="node-avatar">
                  {person.photo ? (
                    <img src={person.photo} alt={person.name} />
                  ) : (
                    <span>{person.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="node-name">{person.name}</span>
                <span className="node-status">No connections</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {connected.length > 0 && (
        <div className="connected-section">
          <h3 className="section-title">
            Connected Family
          </h3>
          <div className="people-grid">
            {connected.map(({ person, connectionCount, connections }) => (
              <button
                key={person.id}
                className="person-node connected"
                onClick={() => onSelectPerson(person.id)}
              >
                <div className="node-avatar">
                  {person.photo ? (
                    <img src={person.photo} alt={person.name} />
                  ) : (
                    <span>{person.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <span className="node-name">{person.name}</span>
                <span className="node-connections">
                  {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
                </span>
                <div className="connection-preview">
                  {connections.slice(0, 3).map((c, i) => (
                    <span key={i} className="connection-tag">
                      {c.person.name}
                    </span>
                  ))}
                  {connections.length > 3 && (
                    <span className="connection-more">+{connections.length - 3}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {totalPeople === 0 && (
        <div className="empty-map">
          <p>No people added yet.</p>
          <p>Add some family members to see the map!</p>
        </div>
      )}

      <div className="map-footer">
        <button className="btn-close-map" onClick={onClose}>
          Close Family Map
        </button>
      </div>
    </div>
  );
}
