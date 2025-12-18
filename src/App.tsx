import { useState } from 'react';
import { EngineProvider, useEngine, useAddPerson, useDataOperations } from './hooks/useEngine';
import { PersonCard, PersonForm, PersonDetail } from './components';
import type { Person } from './types';
import './App.css';

function AppContent() {
  const { isLoading, error, people, user } = useEngine();
  const addPerson = useAddPerson();
  const { exportData, importData } = useDataOperations();

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading...</p>
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

  // Filter and sort people alphabetically
  const filteredPeople = people
    .filter(person => {
      if (!searchQuery) return true;
      return person.name.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const isFirstPerson = people.length === 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>Our People</h1>
        {user && <p className="user-indicator">Viewing as: {user.name}</p>}
      </header>

      <main className="app-main">
        <aside className="sidebar">
          <div className="sidebar-header">
            <input
              type="search"
              placeholder="Search..."
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
                    <p className="hint">Add yourself first to get started!</p>
                  </>
                ) : (
                  <p>No matches</p>
                )}
              </div>
            ) : (
              filteredPeople.map(person => (
                <PersonCard
                  key={person.id}
                  person={person}
                  isSelected={person.id === selectedPersonId}
                  showAsUser={person.isUser}
                  onClick={() => setSelectedPersonId(person.id)}
                />
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <button className="btn-text" onClick={handleExport}>Export</button>
            <button className="btn-text" onClick={handleImport}>Import</button>
          </div>
        </aside>

        <section className="content">
          {showAddForm ? (
            <PersonForm
              onSubmit={handleAddPerson}
              onCancel={() => setShowAddForm(false)}
              isFirstPerson={isFirstPerson}
            />
          ) : selectedPerson ? (
            <PersonDetail
              person={selectedPerson}
              onClose={() => setSelectedPersonId(null)}
            />
          ) : (
            <div className="welcome">
              <h2>Our People</h2>
              <p>
                A simple way to remember how everyone in your life is connected.
              </p>
              <div className="how-it-works">
                <div className="step">
                  <span className="step-number">1</span>
                  <span>Add people with just their name</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span>Define simple relationships (parent, child, sibling, spouse, friend)</span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span>Tap anyone to see who they are in plain language</span>
                </div>
              </div>
              <p className="tagline">
                No charts. No genealogy. Just clear explanations.
              </p>
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
