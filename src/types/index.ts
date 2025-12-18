/**
 * Our People - Type Definitions
 *
 * This is NOT a genealogy app. It's a plain-language explainer.
 * Users input only 5 relationship types. Everything else is derived.
 */

// =============================================================================
// PERSON
// =============================================================================

export interface Person {
  id: string;
  name: string;              // Display name: "Betty", "Joe"
  gender?: 'male' | 'female';  // Used for gendered labels (mom/dad, aunt/uncle)
  isUser?: boolean;          // True for "you" - the primary reference point
  photo?: string;            // Base64 or blob URL
  notes?: string;
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
  | 'friend';   // Terminal - never traversed

export interface Relationship {
  id: string;
  personAId: string;
  personBId: string;
  type: RelationshipType;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// DERIVED LABELS - Generated from paths, never input by users
// =============================================================================

export interface DerivedLabel {
  label: string;
  gendered?: [string, string];  // [female, male] e.g., ['mom', 'dad']
}

// Path patterns mapped to human-readable labels
// Read as: "from me, follow these relationship types"
export const DERIVED_LABELS: Record<string, DerivedLabel> = {
  // Direct relationships
  'parent':                    { label: 'parent', gendered: ['mom', 'dad'] },
  'child':                     { label: 'child', gendered: ['daughter', 'son'] },
  'sibling':                   { label: 'sibling', gendered: ['sister', 'brother'] },
  'spouse':                    { label: 'spouse', gendered: ['wife', 'husband'] },
  'friend':                    { label: 'friend' },

  // Grandparents & great-grandparents
  'parent.parent':             { label: 'grandparent', gendered: ['grandma', 'grandpa'] },
  'parent.parent.parent':      { label: 'great-grandparent', gendered: ['great-grandma', 'great-grandpa'] },

  // Grandchildren
  'child.child':               { label: 'grandchild', gendered: ['granddaughter', 'grandson'] },
  'child.child.child':         { label: 'great-grandchild', gendered: ['great-granddaughter', 'great-grandson'] },

  // Aunts & Uncles
  'parent.sibling':            { label: 'aunt/uncle', gendered: ['aunt', 'uncle'] },
  'parent.parent.sibling':     { label: 'great-aunt/uncle', gendered: ['great-aunt', 'great-uncle'] },

  // Nieces & Nephews
  'sibling.child':             { label: 'niece/nephew', gendered: ['niece', 'nephew'] },
  'sibling.child.child':       { label: 'grandniece/grandnephew', gendered: ['grandniece', 'grandnephew'] },

  // Cousins (just "cousin" - no second/removed nonsense)
  'parent.sibling.child':      { label: 'cousin' },

  // In-laws
  'spouse.parent':             { label: 'parent-in-law', gendered: ['mother-in-law', 'father-in-law'] },
  'spouse.parent.parent':      { label: 'grandparent-in-law', gendered: ['grandma-in-law', 'grandpa-in-law'] },
  'spouse.sibling':            { label: 'sibling-in-law', gendered: ['sister-in-law', 'brother-in-law'] },
  'sibling.spouse':            { label: 'sibling-in-law', gendered: ['sister-in-law', 'brother-in-law'] },
  'child.spouse':              { label: 'child-in-law', gendered: ['daughter-in-law', 'son-in-law'] },
  'child.child.spouse':        { label: 'grandchild-in-law', gendered: ['granddaughter-in-law', 'grandson-in-law'] },
  'parent.sibling.spouse':     { label: 'aunt/uncle', gendered: ['aunt', 'uncle'] },  // Married-in aunt/uncle
  'spouse.sibling.child':      { label: 'niece/nephew', gendered: ['niece', 'nephew'] },  // Spouse's niece/nephew

  // Step-family (through parent's spouse)
  'parent.spouse':             { label: 'step-parent', gendered: ['step-mom', 'step-dad'] },
  'parent.spouse.child':       { label: 'step-sibling', gendered: ['step-sister', 'step-brother'] },
};

// =============================================================================
// EXPLANATION OUTPUT
// =============================================================================

export interface Explanation {
  sentence: string;    // "is your mom's sister"
  clarity: number;     // Higher = better (for sorting)
}

export interface PersonExplanation {
  personId: string;
  displayName: string;       // "Aunt Betty" (derived) or just "Betty"
  explanations: string[];    // ["is your aunt", "is your mom's sister", ...]
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

// =============================================================================
// CONFIGURATION
// =============================================================================

export const ENGINE_CONFIG = {
  MAX_TRAVERSAL_DEPTH: 3,      // Never go deeper than 3 hops
  MAX_EXPLANATIONS: 5,         // Show at most 5 explanations per person
  TERMINAL_TYPES: ['friend'] as RelationshipType[],  // Never traverse beyond these
};
