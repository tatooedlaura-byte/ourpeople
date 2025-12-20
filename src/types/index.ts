/**
 * Our People - Type Definitions
 *
 * A family directory that explains relationships through names you know.
 * Users input only 5 relationship types. Everything else is explained through paths.
 */

// =============================================================================
// PERSON
// =============================================================================

export interface Person {
  id: string;
  name: string;              // Display name: "Betty", "Joe"
  gender?: 'male' | 'female';  // Used for gendered labels (mom/dad, aunt/uncle)
  isUser?: boolean;          // Legacy - now we use perspective instead
  photo?: string;            // Base64 or blob URL
  notes?: string;
  birthday?: string;         // ISO date string (YYYY-MM-DD)
  deceased?: boolean;        // Whether person has passed
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RELATIONSHIPS - Users only input these 5 types
// =============================================================================

export type RelationshipType =
  | 'parent'    // A is parent of B
  | 'child'     // A is child of B
  | 'sibling'   // A and B are siblings
  | 'spouse'    // A and B are married/partnered
  | 'friend';   // Family friend - included in directory but not traversed

export interface Relationship {
  id: string;
  personAId: string;
  personBId: string;
  type: RelationshipType;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RELATIONSHIP WORDS - Simple gendered labels for basic types
// =============================================================================

export interface RelationshipWord {
  neutral: string;
  female: string;
  male: string;
}

export const RELATIONSHIP_WORDS: Record<RelationshipType, RelationshipWord> = {
  parent:  { neutral: 'parent',  female: 'mom',      male: 'dad' },
  child:   { neutral: 'child',   female: 'daughter', male: 'son' },
  sibling: { neutral: 'sibling', female: 'sister',   male: 'brother' },
  spouse:  { neutral: 'spouse',  female: 'wife',     male: 'husband' },
  friend:  { neutral: 'friend',  female: 'friend',   male: 'friend' },
};

// =============================================================================
// SHORTCUT LABELS - Common multi-hop relationships we name directly
// =============================================================================

export interface ShortcutLabel {
  neutral: string;
  female?: string;
  male?: string;
}

// Path patterns (dot-separated) mapped to shortcut labels
// Only the most common/useful ones - everything else uses name chains
export const SHORTCUT_LABELS: Record<string, ShortcutLabel> = {
  // Grandparents & great-grandparents
  'parent.parent':             { neutral: 'grandparent', female: 'grandma', male: 'grandpa' },
  'parent.parent.parent':      { neutral: 'great-grandparent', female: 'great-grandma', male: 'great-grandpa' },

  // Grandchildren & great-grandchildren
  'child.child':               { neutral: 'grandchild', female: 'granddaughter', male: 'grandson' },
  'child.child.child':         { neutral: 'great-grandchild', female: 'great-granddaughter', male: 'great-grandson' },

  // Aunts & Uncles (blood)
  'parent.sibling':            { neutral: 'aunt/uncle', female: 'aunt', male: 'uncle' },

  // Nieces & Nephews
  'sibling.child':             { neutral: 'niece/nephew', female: 'niece', male: 'nephew' },

  // Cousins
  'parent.sibling.child':      { neutral: 'cousin' },

  // In-laws (immediate)
  'spouse.parent':             { neutral: 'parent-in-law', female: 'mother-in-law', male: 'father-in-law' },
  'spouse.sibling':            { neutral: 'sibling-in-law', female: 'sister-in-law', male: 'brother-in-law' },
  'sibling.spouse':            { neutral: 'sibling-in-law', female: 'sister-in-law', male: 'brother-in-law' },
  'child.spouse':              { neutral: 'child-in-law', female: 'daughter-in-law', male: 'son-in-law' },

  // Step-family
  'parent.spouse':             { neutral: 'step-parent', female: 'step-mom', male: 'step-dad' },
  'parent.spouse.child':       { neutral: 'step-sibling', female: 'step-sister', male: 'step-brother' },
};

// =============================================================================
// NAMETAG - Reunion-style introduction
// =============================================================================

export interface NametagLine {
  label: string;    // "Father of", "Married to", etc.
  names: string[];  // ["Karen", "Amy", "Joe"]
}

export interface Nametag {
  personId: string;
  name: string;
  lines: NametagLine[];
}

// =============================================================================
// EXPLANATION - How someone is related (from a perspective)
// =============================================================================

export interface PersonExplanation {
  personId: string;
  name: string;
  explanations: string[];  // ["your grandma", "Joe's mom"]
}

// =============================================================================
// STORAGE INTERFACE
// =============================================================================

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
