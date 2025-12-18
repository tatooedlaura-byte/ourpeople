/**
 * React Context and Hooks for the Relationship Engine
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { RelationshipEngine } from '../engine/RelationshipEngine';
import { IndexedDBAdapter } from '../storage/IndexedDBAdapter';
import type { Person, RelationshipType, PersonExplanation } from '../types';

interface EngineContextValue {
  engine: RelationshipEngine | null;
  isLoading: boolean;
  error: string | null;
  people: Person[];
  user: Person | undefined;
  refreshPeople: () => void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<RelationshipEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [user, setUser] = useState<Person | undefined>();

  useEffect(() => {
    async function initEngine() {
      try {
        const storage = new IndexedDBAdapter();
        await storage.init();

        const eng = new RelationshipEngine(storage);
        await eng.initialize();

        setEngine(eng);
        setPeople(eng.getAllPeople());
        setUser(eng.getUser());
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
      setUser(engine.getUser());
    }
  }, [engine]);

  return (
    <EngineContext.Provider value={{ engine, isLoading, error, people, user, refreshPeople }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine() {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within an EngineProvider');
  }
  return context;
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

// Hook for setting the user ("you")
export function useSetUser() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (id: string) => {
    if (!engine) return;
    await engine.setUser(id);
    refreshPeople();
  }, [engine, refreshPeople]);
}

// Hook for getting explanations for a person
export function useExplanations(personId: string | null): PersonExplanation | undefined {
  const { engine } = useEngine();

  if (!engine || !personId) return undefined;
  return engine.getExplanations(personId);
}

// Hook for getting display name
export function useDisplayName(personId: string | null): string {
  const { engine } = useEngine();

  if (!engine || !personId) return '';
  return engine.getDisplayName(personId);
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

  const importData = useCallback(async (data: { people: Person[]; relationships: any[] }) => {
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
