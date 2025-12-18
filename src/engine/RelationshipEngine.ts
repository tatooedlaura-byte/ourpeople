/**
 * RelationshipEngine - Platform-agnostic relationship calculation engine
 *
 * This module handles all relationship logic including:
 * - Computing relationship paths between people
 * - Generating plain-language relationship descriptions
 * - Managing the relationship graph
 *
 * This module has NO dependencies on React, DOM, or any UI framework.
 */

import type { Person, Relationship, RelationshipType, RelationshipPath, PersonWithRelations, StorageAdapter } from '../types';

export class RelationshipEngine {
  private storage: StorageAdapter;
  private peopleCache: Map<string, Person> = new Map();
  private relationshipsCache: Map<string, Relationship> = new Map();
  private adjacencyList: Map<string, Array<{ personId: string; type: RelationshipType; relationshipId: string }>> = new Map();

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  /**
   * Load all data from storage into memory for fast graph operations
   */
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

    listA.push({ personId: rel.personBId, type: rel.type, relationshipId: rel.id });
    listB.push({ personId: rel.personAId, type: this.getInverseType(rel.type), relationshipId: rel.id });

    this.adjacencyList.set(rel.personAId, listA);
    this.adjacencyList.set(rel.personBId, listB);
  }

  private getInverseType(type: RelationshipType): RelationshipType {
    switch (type) {
      case 'parent': return 'child';
      case 'child': return 'parent';
      case 'spouse': return 'spouse';
      case 'sibling': return 'sibling';
      case 'partner': return 'partner';
    }
  }

  // ==================== Person Operations ====================

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

  // ==================== Relationship Operations ====================

  async addRelationship(
    personAId: string,
    personBId: string,
    type: RelationshipType,
    options?: { startDate?: string; endDate?: string; notes?: string }
  ): Promise<Relationship | undefined> {
    if (!this.peopleCache.has(personAId) || !this.peopleCache.has(personBId)) {
      return undefined;
    }

    // Check for duplicate relationship
    const existingRels = this.adjacencyList.get(personAId) || [];
    const duplicate = existingRels.find(r => r.personId === personBId && r.type === type);
    if (duplicate) return this.relationshipsCache.get(duplicate.relationshipId);

    const now = new Date().toISOString();
    const relationship: Relationship = {
      id: crypto.randomUUID(),
      personAId,
      personBId,
      type,
      startDate: options?.startDate,
      endDate: options?.endDate,
      notes: options?.notes,
      createdAt: now,
      updatedAt: now
    };

    await this.storage.saveRelationship(relationship);
    this.relationshipsCache.set(relationship.id, relationship);
    this.addToAdjacencyList(relationship);

    // Auto-create inverse sibling relationships
    if (type === 'sibling') {
      await this.addRelationship(personBId, personAId, 'sibling');
    }

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

  // ==================== Person with Relations ====================

  getPersonWithRelations(id: string): PersonWithRelations | undefined {
    const person = this.peopleCache.get(id);
    if (!person) return undefined;

    const relations = this.adjacencyList.get(id) || [];

    const parents: Person[] = [];
    const children: Person[] = [];
    const spouses: Person[] = [];
    const siblings: Person[] = [];
    const partners: Person[] = [];

    for (const rel of relations) {
      const relatedPerson = this.peopleCache.get(rel.personId);
      if (!relatedPerson) continue;

      switch (rel.type) {
        case 'parent':
          parents.push(relatedPerson);
          break;
        case 'child':
          children.push(relatedPerson);
          break;
        case 'spouse':
          spouses.push(relatedPerson);
          break;
        case 'sibling':
          siblings.push(relatedPerson);
          break;
        case 'partner':
          partners.push(relatedPerson);
          break;
      }
    }

    return {
      ...person,
      parents,
      children,
      spouses,
      siblings,
      partners
    };
  }

  // ==================== Relationship Path Finding ====================

  /**
   * Find the relationship path between two people using BFS
   */
  findRelationshipPath(fromId: string, toId: string): RelationshipPath | undefined {
    if (fromId === toId) {
      const person = this.peopleCache.get(fromId);
      return person ? {
        fromPersonId: fromId,
        toPersonId: toId,
        path: [fromId],
        relationshipChain: [],
        description: 'self'
      } : undefined;
    }

    // BFS to find shortest path
    const visited = new Set<string>();
    const queue: Array<{ personId: string; path: string[]; types: RelationshipType[] }> = [];

    queue.push({ personId: fromId, path: [fromId], types: [] });
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.adjacencyList.get(current.personId) || [];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor.personId)) continue;

        const newPath = [...current.path, neighbor.personId];
        const newTypes = [...current.types, neighbor.type];

        if (neighbor.personId === toId) {
          return {
            fromPersonId: fromId,
            toPersonId: toId,
            path: newPath,
            relationshipChain: newTypes,
            description: this.describeRelationship(newTypes, fromId, toId)
          };
        }

        visited.add(neighbor.personId);
        queue.push({ personId: neighbor.personId, path: newPath, types: newTypes });
      }
    }

    return undefined;
  }

  /**
   * Generate a plain-English description of a relationship chain
   */
  private describeRelationship(chain: RelationshipType[], _fromId: string, toId: string): string {
    const toPerson = this.peopleCache.get(toId);
    const toName = toPerson ? toPerson.firstName : 'them';

    if (chain.length === 0) return 'self';

    if (chain.length === 1) {
      return this.describeDirect(chain[0], toName);
    }

    // Handle common compound relationships
    const key = chain.join('-');

    // Parent's parent = grandparent
    if (key === 'parent-parent') return `${toName} is your grandparent`;
    if (key === 'child-child') return `${toName} is your grandchild`;
    if (key === 'parent-parent-parent') return `${toName} is your great-grandparent`;
    if (key === 'child-child-child') return `${toName} is your great-grandchild`;

    // Parent's sibling = aunt/uncle
    if (key === 'parent-sibling') return `${toName} is your aunt/uncle`;
    if (key === 'sibling-child') return `${toName} is your niece/nephew`;

    // Sibling's child = niece/nephew
    // Parent's sibling's child = cousin
    if (key === 'parent-sibling-child') return `${toName} is your cousin`;

    // Spouse relationships
    if (key === 'spouse-parent') return `${toName} is your parent-in-law`;
    if (key === 'spouse-sibling') return `${toName} is your sibling-in-law`;
    if (key === 'sibling-spouse') return `${toName} is your sibling-in-law`;

    // Step relationships
    if (key === 'parent-spouse') return `${toName} is your step-parent`;
    if (key === 'parent-spouse-child') return `${toName} is your step-sibling`;

    // Fallback: describe the chain
    return `${toName} is ${chain.length} relationship steps away`;
  }

  private describeDirect(type: RelationshipType, name: string): string {
    switch (type) {
      case 'parent': return `${name} is your parent`;
      case 'child': return `${name} is your child`;
      case 'spouse': return `${name} is your spouse`;
      case 'sibling': return `${name} is your sibling`;
      case 'partner': return `${name} is your partner`;
    }
  }

  // ==================== Data Export/Import ====================

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
