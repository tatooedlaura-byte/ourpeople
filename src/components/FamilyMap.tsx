import { useMemo } from 'react';
import { useEngine, usePerspective } from '../hooks/useEngine';
import type { Person } from '../types';
import './FamilyMap.css';

interface FamilyMapProps {
  onSelectPerson: (personId: string) => void;
  onClose: () => void;
}

interface TreeNode {
  person: Person;
  generation: number;
  spouseId?: string;
}

export function FamilyMap({ onSelectPerson, onClose }: FamilyMapProps) {
  const { people, engine } = useEngine();
  const { perspectiveId } = usePerspective();

  // Build tree structure based on perspective
  const { generations, unconnected } = useMemo(() => {
    if (!engine || people.length === 0) {
      return { generations: new Map<number, TreeNode[]>(), unconnected: [] };
    }

    const perspectivePerson = perspectiveId ? engine.getPerson(perspectiveId) : null;
    const startPerson = perspectivePerson || people[0];

    if (!startPerson) {
      return { generations: new Map<number, TreeNode[]>(), unconnected: people };
    }

    const visited = new Set<string>();
    const nodeMap = new Map<string, TreeNode>();
    const generations = new Map<number, TreeNode[]>();

    // BFS to assign generations (0 = perspective person)
    const queue: Array<{ personId: string; generation: number }> = [
      { personId: startPerson.id, generation: 0 }
    ];
    visited.add(startPerson.id);

    while (queue.length > 0) {
      const { personId, generation } = queue.shift()!;
      const person = engine.getPerson(personId);
      if (!person) continue;

      const rels = engine.getDirectRelationships(personId);

      // Find spouse
      const spouseRel = rels.find(r => r.type === 'spouse');
      const spouseId = spouseRel?.person.id;

      const node: TreeNode = { person, generation, spouseId };
      nodeMap.set(personId, node);

      // Add to generation
      if (!generations.has(generation)) {
        generations.set(generation, []);
      }
      generations.get(generation)!.push(node);

      // Process relationships
      for (const rel of rels) {
        if (visited.has(rel.person.id)) continue;

        let nextGen = generation;
        if (rel.type === 'parent') {
          nextGen = generation - 1; // Parents are one generation up
        } else if (rel.type === 'child') {
          nextGen = generation + 1; // Children are one generation down
        } else if (rel.type === 'sibling') {
          nextGen = generation; // Siblings are same generation
        } else if (rel.type === 'spouse') {
          nextGen = generation; // Spouse is same generation
        } else {
          continue; // Skip friends for tree
        }

        visited.add(rel.person.id);
        queue.push({ personId: rel.person.id, generation: nextGen });
      }
    }

    // Find unconnected people
    const unconnected = people.filter(p => !visited.has(p.id));

    // Sort each generation and pair spouses
    for (const [gen, nodes] of generations) {
      // Group by couples
      const processed = new Set<string>();
      const sorted: TreeNode[] = [];

      for (const node of nodes) {
        if (processed.has(node.person.id)) continue;
        processed.add(node.person.id);
        sorted.push(node);

        // Add spouse right after if they exist
        if (node.spouseId && !processed.has(node.spouseId)) {
          const spouseNode = nodes.find(n => n.person.id === node.spouseId);
          if (spouseNode) {
            processed.add(node.spouseId);
            sorted.push(spouseNode);
          }
        }
      }

      generations.set(gen, sorted);
    }

    return { generations, unconnected };
  }, [people, engine, perspectiveId]);

  // Get sorted generation keys
  const genKeys = Array.from(generations.keys()).sort((a, b) => a - b);

  const getGenerationLabel = (gen: number): string => {
    if (gen === 0) return perspectiveId ? 'You & Siblings' : 'Base Generation';
    if (gen === -1) return 'Parents';
    if (gen === -2) return 'Grandparents';
    if (gen < -2) return 'Great-Grandparents';
    if (gen === 1) return 'Children';
    if (gen === 2) return 'Grandchildren';
    return 'Great-Grandchildren';
  };

  return (
    <div className="family-map">
      <div className="map-header">
        <h2>Family Tree</h2>
        <button className="close-btn" onClick={onClose}>&times;</button>
      </div>

      {!perspectiveId && people.length > 0 && (
        <div className="tree-hint">
          Select yourself from "Viewing as" to see the tree from your perspective
        </div>
      )}

      <div className="tree-container">
        {genKeys.map((gen, index) => {
          const nodes = generations.get(gen) || [];
          const isLast = index === genKeys.length - 1;

          return (
            <div key={gen} className="generation-row">
              <div className="generation-label">{getGenerationLabel(gen)}</div>
              <div className="generation-people">
                {nodes.map((node, nodeIndex) => {
                  const isSpouse = nodeIndex > 0 &&
                    nodes[nodeIndex - 1]?.spouseId === node.person.id;
                  const hasSpouseNext = node.spouseId &&
                    nodes[nodeIndex + 1]?.person.id === node.spouseId;

                  return (
                    <div
                      key={node.person.id}
                      className={`tree-node-wrapper ${isSpouse ? 'is-spouse' : ''} ${hasSpouseNext ? 'has-spouse' : ''}`}
                    >
                      <button
                        className={`tree-node ${node.person.id === perspectiveId ? 'is-you' : ''}`}
                        onClick={() => onSelectPerson(node.person.id)}
                      >
                        <div className="tree-avatar">
                          {node.person.photo ? (
                            <img src={node.person.photo} alt={node.person.name} />
                          ) : (
                            <span>{node.person.name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="tree-name">{node.person.name}</span>
                      </button>
                      {hasSpouseNext && <div className="spouse-connector" />}
                    </div>
                  );
                })}
              </div>
              {!isLast && <div className="generation-connector" />}
            </div>
          );
        })}
      </div>

      {unconnected.length > 0 && (
        <div className="unconnected-section">
          <h3 className="section-title section-warning">
            Not Connected to Tree
          </h3>
          <p className="section-hint">
            Add relationships to include these people in the tree
          </p>
          <div className="unconnected-list">
            {unconnected.map(person => (
              <button
                key={person.id}
                className="unconnected-chip"
                onClick={() => onSelectPerson(person.id)}
              >
                {person.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {people.length === 0 && (
        <div className="empty-map">
          <p>No people added yet.</p>
          <p>Add some family members to see the tree!</p>
        </div>
      )}
    </div>
  );
}
