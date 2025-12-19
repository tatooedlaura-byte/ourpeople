/**
 * Our People - Family Engine
 *
 * A simplified relationship engine that explains people through names you know.
 * Instead of computing genealogy labels like "great-aunt", it says "Grandma Mary's sister".
 */

import type {
  Person,
  Relationship,
  RelationshipType,
  PersonExplanation,
  Nametag,
  NametagLine,
  StorageAdapter,
} from '../types';
import { RELATIONSHIP_WORDS, SHORTCUT_LABELS } from '../types';

// =============================================================================
// FAMILY ENGINE
// =============================================================================

export class FamilyEngine {
  private storage: StorageAdapter;
  private peopleCache: Map<string, Person> = new Map();
  private relationshipsCache: Map<string, Relationship> = new Map();

  // Adjacency list: personId -> [{ personId, type, relationshipId }]
  private adjacencyList: Map<string, Array<{
    personId: string;
    type: RelationshipType;
    relationshipId: string;
  }>> = new Map();

  // Current perspective - who is "you" when viewing
  private perspectiveId: string | null = null;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  async initialize(): Promise<void> {
    const [people, relationships] = await Promise.all([
      this.storage.getAllPeople(),
      this.storage.getAllRelationships()
    ]);

    this.peopleCache.clear();
    this.relationshipsCache.clear();
    this.adjacencyList.clear();

    for (const person of people) {
      this.peopleCache.set(person.id, person);
      this.adjacencyList.set(person.id, []);
    }

    for (const rel of relationships) {
      this.relationshipsCache.set(rel.id, rel);
      this.addToAdjacencyList(rel);
    }

    // Set initial perspective from legacy isUser flag if present
    const legacyUser = people.find(p => p.isUser);
    if (legacyUser) {
      this.perspectiveId = legacyUser.id;
    }
  }

  private addToAdjacencyList(rel: Relationship): void {
    const listA = this.adjacencyList.get(rel.personAId) || [];
    const listB = this.adjacencyList.get(rel.personBId) || [];

    // "A is [type] of B" means:
    // - From B going to A: B follows [type] to reach A
    // - From A going to B: A follows inverse type
    listA.push({ personId: rel.personBId, type: this.getInverseType(rel.type), relationshipId: rel.id });
    listB.push({ personId: rel.personAId, type: rel.type, relationshipId: rel.id });

    this.adjacencyList.set(rel.personAId, listA);
    this.adjacencyList.set(rel.personBId, listB);
  }

  private getInverseType(type: RelationshipType): RelationshipType {
    switch (type) {
      case 'parent': return 'child';
      case 'child': return 'parent';
      case 'sibling': return 'sibling';
      case 'spouse': return 'spouse';
      case 'friend': return 'friend';
    }
  }

  // ===========================================================================
  // PERSPECTIVE
  // ===========================================================================

  setPerspective(personId: string | null): void {
    this.perspectiveId = personId;
  }

  getPerspective(): Person | undefined {
    if (!this.perspectiveId) return undefined;
    return this.peopleCache.get(this.perspectiveId);
  }

  getPerspectiveId(): string | null {
    return this.perspectiveId;
  }

  // ===========================================================================
  // PERSON OPERATIONS
  // ===========================================================================

  async addPerson(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
    const now = new Date().toISOString();
    const newPerson: Person = {
      ...person,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    await this.storage.savePerson(newPerson);
    this.peopleCache.set(newPerson.id, newPerson);
    this.adjacencyList.set(newPerson.id, []);

    return newPerson;
  }

  async updatePerson(id: string, updates: Partial<Omit<Person, 'id' | 'createdAt'>>): Promise<Person | undefined> {
    const existing = this.peopleCache.get(id);
    if (!existing) return undefined;

    const updated: Person = {
      ...existing,
      ...updates,
      id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };

    await this.storage.savePerson(updated);
    this.peopleCache.set(id, updated);

    return updated;
  }

  async deletePerson(id: string): Promise<void> {
    // Delete all relationships involving this person
    const rels = this.adjacencyList.get(id) || [];
    for (const rel of rels) {
      await this.storage.deleteRelationship(rel.relationshipId);
      this.relationshipsCache.delete(rel.relationshipId);
    }

    await this.storage.deletePerson(id);
    this.peopleCache.delete(id);
    this.adjacencyList.delete(id);

    // Clear perspective if deleted person was the perspective
    if (this.perspectiveId === id) {
      this.perspectiveId = null;
    }

    // Clean up reverse references
    for (const [, list] of this.adjacencyList) {
      const idx = list.findIndex(r => r.personId === id);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  getPerson(id: string): Person | undefined {
    return this.peopleCache.get(id);
  }

  getAllPeople(): Person[] {
    return Array.from(this.peopleCache.values());
  }

  // ===========================================================================
  // RELATIONSHIP OPERATIONS
  // ===========================================================================

  async addRelationship(
    personAId: string,
    personBId: string,
    type: RelationshipType
  ): Promise<Relationship | undefined> {
    if (!this.peopleCache.has(personAId) || !this.peopleCache.has(personBId)) {
      return undefined;
    }

    // Check for duplicate
    const existingRels = this.adjacencyList.get(personAId) || [];
    const duplicate = existingRels.find(r => r.personId === personBId && r.type === type);
    if (duplicate) return this.relationshipsCache.get(duplicate.relationshipId);

    const now = new Date().toISOString();
    const relationship: Relationship = {
      id: crypto.randomUUID(),
      personAId,
      personBId,
      type,
      createdAt: now,
      updatedAt: now
    };

    await this.storage.saveRelationship(relationship);
    this.relationshipsCache.set(relationship.id, relationship);
    this.addToAdjacencyList(relationship);

    return relationship;
  }

  async deleteRelationship(id: string): Promise<void> {
    const rel = this.relationshipsCache.get(id);
    if (!rel) return;

    await this.storage.deleteRelationship(id);
    this.relationshipsCache.delete(id);

    // Remove from adjacency lists
    const listA = this.adjacencyList.get(rel.personAId);
    const listB = this.adjacencyList.get(rel.personBId);

    if (listA) {
      const idx = listA.findIndex(r => r.relationshipId === id);
      if (idx !== -1) listA.splice(idx, 1);
    }

    if (listB) {
      const idx = listB.findIndex(r => r.relationshipId === id);
      if (idx !== -1) listB.splice(idx, 1);
    }
  }

  getDirectRelationships(personId: string): Array<{ person: Person; type: RelationshipType; relationshipId: string }> {
    const edges = this.adjacencyList.get(personId) || [];
    return edges
      .map(edge => ({
        person: this.peopleCache.get(edge.personId)!,
        type: edge.type,
        relationshipId: edge.relationshipId
      }))
      .filter(r => r.person);
  }

  // ===========================================================================
  // PATH FINDING
  // ===========================================================================

  /**
   * Find the shortest path between two people using BFS
   */
  private findShortestPath(
    fromId: string,
    toId: string,
    maxDepth: number = 4
  ): { personIds: string[]; types: RelationshipType[] } | undefined {
    if (fromId === toId) {
      return { personIds: [fromId], types: [] };
    }

    const queue: Array<{ personId: string; path: string[]; types: RelationshipType[] }> = [];
    const visited = new Set<string>();

    queue.push({ personId: fromId, path: [fromId], types: [] });
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.types.length >= maxDepth) continue;

      const edges = this.adjacencyList.get(current.personId) || [];

      for (const edge of edges) {
        if (visited.has(edge.personId)) continue;

        // Friends are terminal - don't traverse through them (except to reach them directly)
        if (edge.type === 'friend' && edge.personId !== toId) {
          continue;
        }

        const newPath = [...current.path, edge.personId];
        const newTypes = [...current.types, edge.type];

        if (edge.personId === toId) {
          return { personIds: newPath, types: newTypes };
        }

        visited.add(edge.personId);
        queue.push({ personId: edge.personId, path: newPath, types: newTypes });
      }
    }

    return undefined;
  }

  // ===========================================================================
  // RELATIONSHIP WORDS
  // ===========================================================================

  /**
   * Get the relationship word for a type with gender
   */
  private getRelationshipWord(type: RelationshipType, gender?: 'male' | 'female'): string {
    const words = RELATIONSHIP_WORDS[type];
    if (gender === 'female') return words.female;
    if (gender === 'male') return words.male;
    return words.neutral;
  }

  /**
   * Get shortcut label for a path if one exists
   */
  private getShortcutLabel(types: RelationshipType[], gender?: 'male' | 'female'): string | null {
    const key = types.join('.');
    const shortcut = SHORTCUT_LABELS[key];
    if (!shortcut) return null;

    if (gender === 'female' && shortcut.female) return shortcut.female;
    if (gender === 'male' && shortcut.male) return shortcut.male;
    return shortcut.neutral;
  }

  // ===========================================================================
  // EXPLANATION GENERATION - The core feature!
  // ===========================================================================

  /**
   * Generate plain-language explanations for a person
   * Uses shortcuts for common relationships, name chains for distant ones
   */
  explainPerson(personId: string): PersonExplanation {
    const person = this.peopleCache.get(personId);
    if (!person) {
      return { personId, name: 'Unknown', explanations: [] };
    }

    const explanations: string[] = [];
    const perspective = this.getPerspective();

    // If this IS the perspective person
    if (perspective && personId === perspective.id) {
      return {
        personId,
        name: person.name,
        explanations: ['This is you!']
      };
    }

    // Generate explanation from perspective
    if (perspective) {
      const path = this.findShortestPath(perspective.id, personId);

      if (path && path.types.length > 0) {
        // Try shortcut label first
        const shortcut = this.getShortcutLabel(path.types, person.gender);
        if (shortcut) {
          explanations.push(`your ${shortcut}`);
        } else {
          // Build name chain
          const chain = this.buildNameChain(path, 'your');
          if (chain) explanations.push(chain);
        }
      }
    }

    // Also add explanations through close family members (if different from direct path)
    if (perspective) {
      const closeFamily = this.getDirectRelationships(perspective.id)
        .filter(r => r.type !== 'friend');

      for (const familyMember of closeFamily.slice(0, 3)) {
        if (familyMember.person.id === personId) continue;

        const pathFromFamily = this.findShortestPath(familyMember.person.id, personId, 2);
        if (!pathFromFamily || pathFromFamily.types.length === 0) continue;
        if (pathFromFamily.types.length > 2) continue;

        const chain = this.buildNameChain(pathFromFamily, `${familyMember.person.name}'s`);
        if (chain && !explanations.includes(chain)) {
          explanations.push(chain);
        }
      }
    }

    // If no perspective or no path found, show direct relationships
    if (explanations.length === 0) {
      const direct = this.getDirectRelationships(personId);
      for (const rel of direct.slice(0, 3)) {
        const word = this.getRelationshipWord(rel.type, person.gender);
        explanations.push(`${rel.person.name}'s ${word}`);
      }
    }

    return {
      personId,
      name: person.name,
      explanations: explanations.slice(0, 4)
    };
  }

  /**
   * Build a name chain like "your mom's sister" or "Uncle Joe's wife"
   */
  private buildNameChain(
    path: { personIds: string[]; types: RelationshipType[] },
    startLabel: string
  ): string | null {
    if (path.types.length === 0) return null;

    const targetPerson = this.peopleCache.get(path.personIds[path.personIds.length - 1]);
    if (!targetPerson) return null;

    // Single hop: "your mom", "your brother"
    if (path.types.length === 1) {
      const word = this.getRelationshipWord(path.types[0], targetPerson.gender);
      return `${startLabel} ${word}`;
    }

    // Two hops: try shortcut, else chain through middle person
    if (path.types.length === 2) {
      const shortcut = this.getShortcutLabel(path.types, targetPerson.gender);
      if (shortcut) {
        return `${startLabel} ${shortcut}`;
      }

      // Chain through middle person's name
      const middlePerson = this.peopleCache.get(path.personIds[1]);
      if (!middlePerson) return null;

      const middleWord = this.getRelationshipWord(path.types[0], middlePerson.gender);
      const targetWord = this.getRelationshipWord(path.types[1], targetPerson.gender);

      return `${startLabel} ${middleWord}'s ${targetWord}`;
    }

    // Three+ hops: try shortcut, else use middle person's name as anchor
    if (path.types.length >= 3) {
      const shortcut = this.getShortcutLabel(path.types, targetPerson.gender);
      if (shortcut) {
        return `${startLabel} ${shortcut}`;
      }

      // Use middle person as anchor: "connected through [Name]"
      const middlePerson = this.peopleCache.get(path.personIds[1]);
      if (middlePerson) {
        return `connected through ${middlePerson.name}`;
      }
    }

    return null;
  }

  // ===========================================================================
  // NAMETAG GENERATION - Reunion-style introductions
  // ===========================================================================

  /**
   * Generate a nametag for someone like:
   * "I'm Joe - Father of Karen, Amy; Grandpa to Abby, Josh; Son of Josephine"
   */
  generateNametag(personId: string): Nametag {
    const person = this.peopleCache.get(personId);
    if (!person) {
      return { personId, name: 'Unknown', lines: [] };
    }

    const lines: NametagLine[] = [];
    const relationships = this.getDirectRelationships(personId);

    // Group by type
    const byType: Record<RelationshipType, Person[]> = {
      spouse: [],
      parent: [],
      child: [],
      sibling: [],
      friend: []
    };

    for (const rel of relationships) {
      byType[rel.type].push(rel.person);
    }

    // Spouse
    if (byType.spouse.length > 0) {
      const label = person.gender === 'female' ? 'Wife of' : person.gender === 'male' ? 'Husband of' : 'Married to';
      lines.push({ label, names: byType.spouse.map(p => p.name) });
    }

    // Children
    if (byType.child.length > 0) {
      const label = person.gender === 'female' ? 'Mother of' : person.gender === 'male' ? 'Father of' : 'Parent of';
      lines.push({ label, names: byType.child.map(p => p.name) });
    }

    // Grandchildren (children's children)
    const grandchildren: Person[] = [];
    for (const child of byType.child) {
      const childsChildren = this.getDirectRelationships(child.id)
        .filter(r => r.type === 'child')
        .map(r => r.person);
      grandchildren.push(...childsChildren);
    }
    if (grandchildren.length > 0) {
      const label = person.gender === 'female' ? 'Grandma to' : person.gender === 'male' ? 'Grandpa to' : 'Grandparent of';
      lines.push({ label, names: grandchildren.map(p => p.name) });
    }

    // Parents
    if (byType.parent.length > 0) {
      const label = person.gender === 'female' ? 'Daughter of' : person.gender === 'male' ? 'Son of' : 'Child of';
      lines.push({ label, names: byType.parent.map(p => p.name) });
    }

    // Siblings
    if (byType.sibling.length > 0) {
      const label = person.gender === 'female' ? 'Sister of' : person.gender === 'male' ? 'Brother of' : 'Sibling of';
      lines.push({ label, names: byType.sibling.map(p => p.name) });
    }

    return {
      personId,
      name: person.name,
      lines
    };
  }

  // ===========================================================================
  // DATA EXPORT/IMPORT
  // ===========================================================================

  async exportData(): Promise<{ people: Person[]; relationships: Relationship[] }> {
    return this.storage.exportData();
  }

  async importData(data: { people: Person[]; relationships: Relationship[] }): Promise<void> {
    await this.storage.importData(data);
    await this.initialize();
  }

  async clearAll(): Promise<void> {
    await this.storage.clearAll();
    this.peopleCache.clear();
    this.relationshipsCache.clear();
    this.adjacencyList.clear();
    this.perspectiveId = null;
  }
}
