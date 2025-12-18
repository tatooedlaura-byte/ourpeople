import { useState } from 'react';
import { EngineProvider, useEngine, useAddPerson, usePersonWithRelations, useDataOperations } from './hooks/useEngine';
import { PersonCard, PersonForm, PersonDetail } from './components';
import type { Person } from './types';
import './App.css';

function AppContent() {
  const { isLoading, error, people } = useEngine();
  const addPerson = useAddPerson();
  const { exportData, importData } = useDataOperations();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPerson = usePersonWithRelations(selectedPersonId);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading your family tree...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Something went wrong</h2>
        <p>{error}</p>
      </div>
    );
  }

  const handleAddPerson = async (data: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newPerson = await addPerson(data);
    setShowAddForm(false);
    if (newPerson) {
      setSelectedPersonId(newPerson.id);
    }
  };

  const handleExport = async () => {
    const data = await exportData();
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `our-people-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.people && data.relationships) {
          await importData(data);
          setSelectedPersonId(null);
        } else {
          alert('Invalid backup file format');
        }
      } catch {
        alert('Failed to import backup file');
      }
    };
    input.click();
  };

  const filteredPeople = people.filter(person => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      person.firstName.toLowerCase().includes(query) ||
      person.lastName.toLowerCase().includes(query) ||
      person.nickname?.toLowerCase().includes(query)
    );
  });

  // Sort by last name, then first name
  filteredPeople.sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName);
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.firstName.localeCompare(b.firstName);
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>Our People</h1>
        <p className="tagline">Your private family tree</p>
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <input
              type="search"
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button className="btn-primary add-btn" onClick={() => setShowAddForm(true)}>
              + Add Person
            </button>
          </div>

          <div className="people-list">
            {filteredPeople.length === 0 ? (
              <div className="empty-state">
                {people.length === 0 ? (
                  <>
                    <p>No people yet</p>
                    <p className="hint">Add your first family member to get started</p>
                  </>
                ) : (
                  <p>No matches found</p>
                )}
              </div>
            ) : (
              filteredPeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  isSelected={person.id === selectedPersonId}
                  onClick={() => setSelectedPersonId(person.id)}
                />
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <button className="btn-text" onClick={handleExport}>Export Backup</button>
            <button className="btn-text" onClick={handleImport}>Import Backup</button>
          </div>
        </aside>

        <section className="content">
          {showAddForm ? (
            <PersonForm
              onSubmit={handleAddPerson}
              onCancel={() => setShowAddForm(false)}
            />
          ) : selectedPerson ? (
            <PersonDetail
              personWithRelations={selectedPerson}
              onPersonClick={setSelectedPersonId}
              onClose={() => setSelectedPersonId(null)}
            />
          ) : (
            <div className="welcome">
              <h2>Welcome to Our People</h2>
              <p>Select a person from the list or add someone new to begin building your family tree.</p>
              <div className="features">
                <div className="feature">
                  <strong>Private</strong>
                  <span>All data stays on your device</span>
                </div>
                <div className="feature">
                  <strong>Offline</strong>
                  <span>Works without internet</span>
                </div>
                <div className="feature">
                  <strong>Portable</strong>
                  <span>Export and import your data anytime</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <EngineProvider>
      <AppContent />
    </EngineProvider>
  );
}

export default App;
