/**
 * IndexedDB Storage Adapter
 *
 * Implements the StorageAdapter interface using IndexedDB for
 * persistent, offline-first local storage.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Person, Relationship, StorageAdapter } from '../types';

const DB_NAME = 'our-people-db';
const DB_VERSION = 1;

interface OurPeopleDB {
  people: Person;
  relationships: Relationship;
}

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase<OurPeopleDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OurPeopleDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // People store
        if (!db.objectStoreNames.contains('people')) {
          const peopleStore = db.createObjectStore('people', { keyPath: 'id' });
          peopleStore.createIndex('lastName', 'lastName');
          peopleStore.createIndex('updatedAt', 'updatedAt');
        }

        // Relationships store
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relStore.createIndex('personAId', 'personAId');
          relStore.createIndex('personBId', 'personBId');
          relStore.createIndex('type', 'type');
        }
      }
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<OurPeopleDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // ==================== Person Operations ====================

  async getAllPeople(): Promise<Person[]> {
    const db = await this.ensureDB();
    return db.getAll('people');
  }

  async getPerson(id: string): Promise<Person | undefined> {
    const db = await this.ensureDB();
    return db.get('people', id);
  }

  async savePerson(person: Person): Promise<void> {
    const db = await this.ensureDB();
    await db.put('people', person);
  }

  async deletePerson(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('people', id);
  }

  // ==================== Relationship Operations ====================

  async getAllRelationships(): Promise<Relationship[]> {
    const db = await this.ensureDB();
    return db.getAll('relationships');
  }

  async getRelationship(id: string): Promise<Relationship | undefined> {
    const db = await this.ensureDB();
    return db.get('relationships', id);
  }

  async getRelationshipsForPerson(personId: string): Promise<Relationship[]> {
    const db = await this.ensureDB();
    const allRels = await db.getAll('relationships');
    return allRels.filter(r => r.personAId === personId || r.personBId === personId);
  }

  async saveRelationship(relationship: Relationship): Promise<void> {
    const db = await this.ensureDB();
    await db.put('relationships', relationship);
  }

  async deleteRelationship(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('relationships', id);
  }

  // ==================== Bulk Operations ====================

  async exportData(): Promise<{ people: Person[]; relationships: Relationship[] }> {
    const [people, relationships] = await Promise.all([
      this.getAllPeople(),
      this.getAllRelationships()
    ]);
    return { people, relationships };
  }

  async importData(data: { people: Person[]; relationships: Relationship[] }): Promise<void> {
    const db = await this.ensureDB();

    const tx = db.transaction(['people', 'relationships'], 'readwrite');

    // Clear existing data
    await tx.objectStore('people').clear();
    await tx.objectStore('relationships').clear();

    // Import new data
    for (const person of data.people) {
      await tx.objectStore('people').put(person);
    }
    for (const rel of data.relationships) {
      await tx.objectStore('relationships').put(rel);
    }

    await tx.done;
  }

  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const tx = db.transaction(['people', 'relationships'], 'readwrite');
    await tx.objectStore('people').clear();
    await tx.objectStore('relationships').clear();
    await tx.done;
  }
}
