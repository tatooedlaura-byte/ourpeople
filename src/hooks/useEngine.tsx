/**
 * React Context and Hooks for the Family Engine
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { FamilyEngine } from '../engine/FamilyEngine';
import { IndexedDBAdapter } from '../storage/IndexedDBAdapter';
import type { Person, Relationship, RelationshipType, PersonExplanation, Nametag } from '../types';

// =============================================================================
// CONTEXT
// =============================================================================

interface EngineContextValue {
  engine: FamilyEngine | null;
  isLoading: boolean;
  error: string | null;
  people: Person[];
  perspective: Person | undefined;
  perspectiveId: string | null;
  refreshPeople: () => void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

const PERSPECTIVE_STORAGE_KEY = 'ourpeople-perspective';

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<FamilyEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [perspective, setPerspective] = useState<Person | undefined>();
  const [perspectiveId, setPerspectiveId] = useState<string | null>(null);

  useEffect(() => {
    async function initEngine() {
      try {
        const storage = new IndexedDBAdapter();
        await storage.init();

        const eng = new FamilyEngine(storage);
        await eng.initialize();

        // Restore perspective from localStorage
        const savedPerspectiveId = localStorage.getItem(PERSPECTIVE_STORAGE_KEY);
        if (savedPerspectiveId && eng.getPerson(savedPerspectiveId)) {
          eng.setPerspective(savedPerspectiveId);
        }

        setEngine(eng);
        setPeople(eng.getAllPeople());
        setPerspective(eng.getPerspective());
        setPerspectiveId(eng.getPerspectiveId());
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setIsLoading(false);
      }
    }

    initEngine();
  }, []);

  const refreshPeople = useCallback(() => {
    if (engine) {
      setPeople(engine.getAllPeople());
      setPerspective(engine.getPerspective());
      setPerspectiveId(engine.getPerspectiveId());
    }
  }, [engine]);

  return (
    <EngineContext.Provider value={{
      engine,
      isLoading,
      error,
      people,
      perspective,
      perspectiveId,
      refreshPeople
    }}>
      {children}
    </EngineContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useEngine() {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
}

// Hook for perspective management
export function usePerspective() {
  const { engine, perspectiveId, refreshPeople } = useEngine();

  const setPerspective = useCallback((personId: string | null) => {
    if (!engine) return;
    engine.setPerspective(personId);

    // Persist to localStorage
    if (personId) {
      localStorage.setItem(PERSPECTIVE_STORAGE_KEY, personId);
    } else {
      localStorage.removeItem(PERSPECTIVE_STORAGE_KEY);
    }

    refreshPeople();
  }, [engine, refreshPeople]);

  return { perspectiveId, setPerspective };
}

// Hook for adding a person
export function useAddPerson() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!engine) return undefined;
    const newPerson = await engine.addPerson(person);
    refreshPeople();
    return newPerson;
  }, [engine, refreshPeople]);
}

// Hook for updating a person
export function useUpdatePerson() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (id: string, updates: Partial<Omit<Person, 'id' | 'createdAt'>>) => {
    if (!engine) return undefined;
    const updated = await engine.updatePerson(id, updates);
    refreshPeople();
    return updated;
  }, [engine, refreshPeople]);
}

// Hook for deleting a person
export function useDeletePerson() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (id: string) => {
    if (!engine) return;
    await engine.deletePerson(id);
    refreshPeople();
  }, [engine, refreshPeople]);
}

// Hook for getting explanations for a person
export function useExplanations(personId: string | null): PersonExplanation | undefined {
  const { engine } = useEngine();

  if (!engine || !personId) return undefined;
  return engine.explainPerson(personId);
}

// Hook for getting nametag for a person
export function useNametag(personId: string | null): Nametag | undefined {
  const { engine } = useEngine();

  if (!engine || !personId) return undefined;
  return engine.generateNametag(personId);
}

// Hook for adding a relationship
export function useAddRelationship() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (
    personAId: string,
    personBId: string,
    type: RelationshipType
  ) => {
    if (!engine) return undefined;
    const rel = await engine.addRelationship(personAId, personBId, type);
    refreshPeople();
    return rel;
  }, [engine, refreshPeople]);
}

// Hook for deleting a relationship
export function useDeleteRelationship() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (id: string) => {
    if (!engine) return;
    await engine.deleteRelationship(id);
    refreshPeople();
  }, [engine, refreshPeople]);
}

// Hook for getting direct relationships
export function useDirectRelationships(personId: string | null) {
  const { engine } = useEngine();

  if (!engine || !personId) return [];
  return engine.getDirectRelationships(personId);
}

// Hook for data export/import
export function useDataOperations() {
  const { engine, refreshPeople } = useEngine();

  const exportData = useCallback(async () => {
    if (!engine) return null;
    return engine.exportData();
  }, [engine]);

  const importData = useCallback(async (data: { people: Person[]; relationships: Relationship[] }) => {
    if (!engine) return;
    await engine.importData(data);
    refreshPeople();
  }, [engine, refreshPeople]);

  const clearAll = useCallback(async () => {
    if (!engine) return;
    await engine.clearAll();
    refreshPeople();
  }, [engine, refreshPeople]);

  return { exportData, importData, clearAll };
}
