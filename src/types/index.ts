// Core types for the relationship engine - framework agnostic

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  birthDate?: string; // ISO date string
  deathDate?: string; // ISO date string
  gender?: 'male' | 'female' | 'other';
  photo?: string; // Base64 or blob URL
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type RelationshipType =
  | 'parent'      // A is parent of B
  | 'child'       // A is child of B
  | 'spouse'      // A is spouse of B
  | 'sibling'     // A is sibling of B
  | 'partner';    // A is partner of B (unmarried)

export interface Relationship {
  id: string;
  personAId: string;
  personBId: string;
  type: RelationshipType;
  startDate?: string; // e.g., marriage date
  endDate?: string;   // e.g., divorce date
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Computed relationship descriptions
export interface RelationshipPath {
  fromPersonId: string;
  toPersonId: string;
  path: string[];           // Person IDs in the path
  relationshipChain: RelationshipType[];
  description: string;      // Plain English description
}

// For the UI - a person with their direct relationships resolved
export interface PersonWithRelations extends Person {
  parents: Person[];
  children: Person[];
  spouses: Person[];
  siblings: Person[];
  partners: Person[];
}

// Storage interface - any storage implementation must satisfy this
export interface StorageAdapter {
  // Person operations
  getAllPeople(): Promise<Person[]>;
  getPerson(id: string): Promise<Person | undefined>;
  savePerson(person: Person): Promise<void>;
  deletePerson(id: string): Promise<void>;

  // Relationship operations
  getAllRelationships(): Promise<Relationship[]>;
  getRelationship(id: string): Promise<Relationship | undefined>;
  getRelationshipsForPerson(personId: string): Promise<Relationship[]>;
  saveRelationship(relationship: Relationship): Promise<void>;
  deleteRelationship(id: string): Promise<void>;

  // Bulk operations
  exportData(): Promise<{ people: Person[]; relationships: Relationship[] }>;
  importData(data: { people: Person[]; relationships: Relationship[] }): Promise<void>;
  clearAll(): Promise<void>;
}
