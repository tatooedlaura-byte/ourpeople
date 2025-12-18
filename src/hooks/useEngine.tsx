/**
 * React Context and Hooks for the Relationship Engine
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { RelationshipEngine } from '../engine/RelationshipEngine';
import { IndexedDBAdapter } from '../storage/IndexedDBAdapter';
import type { Person, RelationshipType, PersonWithRelations, RelationshipPath } from '../types';

interface EngineContextValue {
  engine: RelationshipEngine | null;
  isLoading: boolean;
  error: string | null;
  people: Person[];
  refreshPeople: () => void;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export function EngineProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<RelationshipEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);

  useEffect(() => {
    async function initEngine() {
      try {
        const storage = new IndexedDBAdapter();
        await storage.init();

        const eng = new RelationshipEngine(storage);
        await eng.initialize();

        setEngine(eng);
        setPeople(eng.getAllPeople());
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
    }
  }, [engine]);

  return (
    <EngineContext.Provider value={{ engine, isLoading, error, people, refreshPeople }}>
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

// Hook for getting a person with all their relations
export function usePersonWithRelations(id: string | null): PersonWithRelations | undefined {
  const { engine } = useEngine();

  if (!engine || !id) return undefined;
  return engine.getPersonWithRelations(id);
}

// Hook for adding a relationship
export function useAddRelationship() {
  const { engine, refreshPeople } = useEngine();

  return useCallback(async (
    personAId: string,
    personBId: string,
    type: RelationshipType,
    options?: { startDate?: string; endDate?: string; notes?: string }
  ) => {
    if (!engine) return undefined;
    const rel = await engine.addRelationship(personAId, personBId, type, options);
    refreshPeople();
    return rel;
  }, [engine, refreshPeople]);
}

// Hook for finding relationship between two people
export function useFindRelationship(fromId: string | null, toId: string | null): RelationshipPath | undefined {
  const { engine } = useEngine();

  if (!engine || !fromId || !toId) return undefined;
  return engine.findRelationshipPath(fromId, toId);
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
