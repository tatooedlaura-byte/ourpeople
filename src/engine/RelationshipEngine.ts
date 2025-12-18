/**
 * Our People - Relationship Engine
 *
 * This is NOT a genealogy engine. It generates plain-language explanations.
 *
 * Core question: "Who is this person, explained using people I already know?"
 *
 * Users input only 5 relationship types. Everything else is derived.
 */

import type {
  Person,
  Relationship,
  RelationshipType,
  Explanation,
  PersonExplanation,
  StorageAdapter,
} from '../types';
import { DERIVED_LABELS, ENGINE_CONFIG } from '../types';

// =============================================================================
// RELATIONSHIP ENGINE
// =============================================================================

export class RelationshipEngine {
  private storage: StorageAdapter;
  private peopleCache: Map<string, Person> = new Map();
  private relationshipsCache: Map<string, Relationship> = new Map();

  // Adjacency list: personId -> [{ personId, type, direction }]
  private adjacencyList: Map<string, Array<{
    personId: string;
    type: RelationshipType;
    relationshipId: string;
  }>> = new Map();

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
  }

  private addToAdjacencyList(rel: Relationship): void {
    const listA = this.adjacencyList.get(rel.personAId) || [];
    const listB = this.adjacencyList.get(rel.personBId) || [];

    // "A is [type] of B" means:
    // - From B going to A: B follows [type] to reach A (e.g., B goes to their parent A)
    // - From A going to B: A follows inverse (e.g., A goes to their child B)
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

  getUser(): Person | undefined {
    return Array.from(this.peopleCache.values()).find(p => p.isUser);
  }

  async setUser(id: string): Promise<void> {
    // Clear existing user flag
    for (const person of this.peopleCache.values()) {
      if (person.isUser && person.id !== id) {
        await this.updatePerson(person.id, { isUser: false });
      }
    }
    // Set new user
    await this.updatePerson(id, { isUser: true });
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

  getDirectRelationships(personId: string): Array<{ person: Person; type: RelationshipType }> {
    const edges = this.adjacencyList.get(personId) || [];
    return edges
      .map(edge => ({
        person: this.peopleCache.get(edge.personId)!,
        type: edge.type
      }))
      .filter(r => r.person);
  }

  // ===========================================================================
  // PATH FINDING
  // ===========================================================================

  /**
   * Find the shortest path between two people
   */
  private findShortestPath(
    fromId: string,
    toId: string
  ): { personIds: string[]; types: RelationshipType[] } | undefined {
    if (fromId === toId) {
      return { personIds: [fromId], types: [] };
    }

    // BFS for shortest path
    const queue: Array<{ personId: string; path: string[]; types: RelationshipType[] }> = [];
    const visited = new Set<string>();

    queue.push({ personId: fromId, path: [fromId], types: [] });
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.types.length >= ENGINE_CONFIG.MAX_TRAVERSAL_DEPTH) continue;

      const edges = this.adjacencyList.get(current.personId) || [];

      for (const edge of edges) {
        if (visited.has(edge.personId)) continue;

        // Friends are terminal
        if (ENGINE_CONFIG.TERMINAL_TYPES.includes(edge.type) && edge.personId !== toId) {
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
  // LABEL GENERATION
  // ===========================================================================

  /**
   * Get a human-readable label for a path (e.g., "aunt", "grandpa")
   */
  private getLabelForPath(types: RelationshipType[], targetGender?: 'male' | 'female'): string | null {
    const key = types.join('.');
    const entry = DERIVED_LABELS[key];

    if (!entry) return null;

    if (targetGender && entry.gendered) {
      return targetGender === 'female' ? entry.gendered[0] : entry.gendered[1];
    }

    return entry.label;
  }

  /**
   * Get the relationship word for a single hop
   */
  private getRelationshipWord(type: RelationshipType, gender?: 'male' | 'female'): string {
    const entry = DERIVED_LABELS[type];
    if (entry && gender && entry.gendered) {
      return gender === 'female' ? entry.gendered[0] : entry.gendered[1];
    }
    return type;
  }

  /**
   * Generate a derived display name like "Aunt Betty" or "Grandpa Joe"
   */
  getDisplayName(personId: string): string {
    const person = this.peopleCache.get(personId);
    if (!person) return 'Unknown';

    const user = this.getUser();
    if (!user || user.id === personId) return person.name;

    const path = this.findShortestPath(user.id, personId);
    if (!path || path.types.length === 0) return person.name;

    const label = this.getLabelForPath(path.types, person.gender);

    // Add title prefix for certain relationships
    if (label && ['aunt', 'uncle', 'grandma', 'grandpa', 'great-grandma', 'great-grandpa', 'cousin'].includes(label)) {
      // Capitalize first letter
      const title = label.charAt(0).toUpperCase() + label.slice(1);
      return `${title} ${person.name}`;
    }

    return person.name;
  }

  // ===========================================================================
  // EXPLANATION GENERATION - The core feature!
  // ===========================================================================

  /**
   * Generate plain-language explanations for a person
   * This is the main feature of the app.
   */
  getExplanations(personId: string): PersonExplanation {
    const person = this.peopleCache.get(personId);
    if (!person) {
      return { personId, displayName: 'Unknown', explanations: [] };
    }

    const user = this.getUser();
    const explanations: Explanation[] = [];

    // If this IS the user
    if (person.isUser) {
      return {
        personId,
        displayName: person.name,
        explanations: ['is you!']
      };
    }

    // === Generate explanations from user's perspective ===
    if (user) {
      const pathFromUser = this.findShortestPath(user.id, personId);

      if (pathFromUser && pathFromUser.types.length > 0) {
        // Try to get a direct label ("is your aunt")
        const label = this.getLabelForPath(pathFromUser.types, person.gender);
        if (label) {
          explanations.push({
            sentence: `is your ${label}`,
            clarity: 100
          });
        } else {
          // Only show path explanation if we don't have a clean label
          const pathExplanation = this.describePathThrough(pathFromUser, 'your');
          if (pathExplanation) {
            explanations.push({
              sentence: pathExplanation,
              clarity: 90
            });
          }
        }
      }

      // === Generate explanations through well-known people ===
      // Only add these if they provide new context (not just restating the direct relationship)
      const wellKnown = this.getWellKnownPeople(user.id);

      for (const knownPerson of wellKnown) {
        if (knownPerson.id === personId) continue;

        // Skip if this known person is your SPOUSE and is in the direct path to the target
        // (e.g., don't say "is Chris's mom" when we already said "is your mother-in-law")
        // But allow children in path - "is Abby's husband" is useful even if Abby is in the path
        if (pathFromUser && pathFromUser.personIds.includes(knownPerson.id)) {
          const isSpouse = this.getDirectRelationships(user.id)
            .some(r => r.type === 'spouse' && r.person.id === knownPerson.id);
          if (isSpouse) {
            continue;
          }
        }

        const pathFromKnown = this.findShortestPath(knownPerson.id, personId);
        if (!pathFromKnown || pathFromKnown.types.length === 0 || pathFromKnown.types.length > 2) {
          continue;
        }

        // Skip circular paths through spouse (e.g., "Chris's wife's dad" when you ARE the wife)
        // But allow paths through children (e.g., "Abby's grandma") - those are useful context
        const knownPersonRelation = this.getDirectRelationships(user.id)
          .find(r => r.person.id === knownPerson.id);

        if (knownPersonRelation?.type === 'spouse') {
          // Any path from spouse that goes through you is circular - skip it
          if (pathFromKnown.personIds.includes(user.id)) {
            continue;
          }
        }

        const explanation = this.describePathThrough(pathFromKnown, `${knownPerson.name}'s`);
        if (explanation) {
          // Avoid duplicates
          const isDuplicate = explanations.some(e => e.sentence === explanation);
          if (!isDuplicate) {
            explanations.push({
              sentence: explanation,
              clarity: 70 - pathFromKnown.types.length * 10
            });
          }
        }
      }
    }

    // If no user set, just show direct relationships
    if (explanations.length === 0) {
      const direct = this.getDirectRelationships(personId);
      for (const rel of direct.slice(0, 3)) {
        const word = this.getRelationshipWord(rel.type, rel.person.gender);
        explanations.push({
          sentence: `is ${rel.person.name}'s ${word}`,
          clarity: 50
        });
      }
    }

    // Sort by clarity and limit
    const sorted = explanations
      .sort((a, b) => b.clarity - a.clarity)
      .slice(0, ENGINE_CONFIG.MAX_EXPLANATIONS);

    return {
      personId,
      displayName: this.getDisplayName(personId),
      explanations: sorted.map(e => e.sentence)
    };
  }

  /**
   * Describe a path through relationships
   * e.g., "is your mom's sister"
   */
  private describePathThrough(
    path: { personIds: string[]; types: RelationshipType[] },
    startLabel: string
  ): string | null {
    if (path.types.length === 0) return null;

    if (path.types.length === 1) {
      const targetPerson = this.peopleCache.get(path.personIds[path.personIds.length - 1]);
      const word = this.getRelationshipWord(path.types[0], targetPerson?.gender);
      return `is ${startLabel} ${word}`;
    }

    if (path.types.length === 2) {
      const targetPerson = this.peopleCache.get(path.personIds[path.personIds.length - 1]);

      // Try to get a simple label (e.g., "grandma" instead of "dad's mom")
      const label = this.getLabelForPath(path.types, targetPerson?.gender);
      if (label) {
        return `is ${startLabel} ${label}`;
      }

      // Fallback to the verbose form
      const middlePerson = this.peopleCache.get(path.personIds[1]);
      if (!middlePerson) return null;

      const firstWord = this.getRelationshipWord(path.types[0], middlePerson.gender);
      const secondWord = this.getRelationshipWord(path.types[1], targetPerson?.gender);

      return `is ${startLabel} ${firstWord}'s ${secondWord}`;
    }

    if (path.types.length === 3) {
      // For 3-hop paths, try to use a label if we have one
      const targetPerson = this.peopleCache.get(path.personIds[path.personIds.length - 1]);
      const label = this.getLabelForPath(path.types, targetPerson?.gender);

      if (label) {
        return `is ${startLabel} ${label}`;
      }

      // Fallback: "connected through [middle person]"
      const middlePerson = this.peopleCache.get(path.personIds[1]);
      if (middlePerson) {
        return `is connected through ${middlePerson.name}`;
      }
    }

    return null;
  }

  /**
   * Get "well-known" people relative to the user
   * These are people we can use as reference points in explanations
   */
  private getWellKnownPeople(userId: string): Person[] {
    const wellKnown: Person[] = [];
    const edges = this.adjacencyList.get(userId) || [];

    for (const edge of edges) {
      const person = this.peopleCache.get(edge.personId);
      if (!person) continue;

      // Parents, siblings, spouse, children are well-known
      if (['parent', 'sibling', 'spouse', 'child'].includes(edge.type)) {
        wellKnown.push(person);
      }
    }

    // Also include grandparents
    for (const parentEdge of edges.filter(e => e.type === 'parent')) {
      const parentEdges = this.adjacencyList.get(parentEdge.personId) || [];
      for (const gpEdge of parentEdges.filter(e => e.type === 'parent')) {
        const gp = this.peopleCache.get(gpEdge.personId);
        if (gp) wellKnown.push(gp);
      }
    }

    // Also include children's spouses (son/daughter-in-law)
    for (const childEdge of edges.filter(e => e.type === 'child')) {
      const childEdges = this.adjacencyList.get(childEdge.personId) || [];
      for (const spouseEdge of childEdges.filter(e => e.type === 'spouse')) {
        const inLaw = this.peopleCache.get(spouseEdge.personId);
        if (inLaw) wellKnown.push(inLaw);
      }
    }

    return wellKnown;
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
  }
}
