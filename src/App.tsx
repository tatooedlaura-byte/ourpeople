import { useState, useEffect } from 'react';
import { EngineProvider, useEngine, useAddPerson, useDataOperations, usePerspective } from './hooks/useEngine';
import { PersonCard, PersonForm, PersonDetail, FamilyMap } from './components';
import { createShareLink, getSharedDataFromUrl, clearShareFromUrl, copyToClipboard } from './utils/sharing';
import type { Person } from './types';
import './App.css';

function AppContent() {
  const { isLoading, error, people, perspective } = useEngine();
  const { perspectiveId, setPerspective } = usePerspective();
  const addPerson = useAddPerson();
  const { exportData, importData, clearAll } = useDataOperations();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [incomingShare, setIncomingShare] = useState<{ people: Person[]; relationships: any[] } | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFamilyMap, setShowFamilyMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedPerson = people.find(p => p.id === selectedPersonId);

  // Listen for person selection from relationship chips
  useEffect(() => {
    const handleSelectPerson = (e: CustomEvent<string>) => {
      setSelectedPersonId(e.detail);
      setShowFamilyMap(false);
      setShowAddForm(false);
    };

    window.addEventListener('selectPerson', handleSelectPerson as EventListener);
    return () => {
      window.removeEventListener('selectPerson', handleSelectPerson as EventListener);
    };
  }, []);

  // Check for incoming shared data in URL
  useEffect(() => {
    const sharedData = getSharedDataFromUrl();
    if (sharedData) {
      setIncomingShare(sharedData);
    }
  }, []);

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
      // If this is the first person, set them as the perspective
      if (people.length === 0) {
        setPerspective(newPerson.id);
      }
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
          // Clear perspective - user will need to select who they are
          setPerspective(null);
        } else {
          alert('Invalid backup file format');
        }
      } catch {
        alert('Failed to import backup file');
      }
    };
    input.click();
  };

  const handleClearAll = async () => {
    await clearAll();
    setSelectedPersonId(null);
    setPerspective(null);
    setShowClearConfirm(false);
  };

  const handleShare = async () => {
    const data = await exportData();
    if (!data || data.people.length === 0) {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2000);
      return;
    }

    const shareLink = createShareLink(data);
    const success = await copyToClipboard(shareLink);

    if (success) {
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 3000);
    } else {
      setShareStatus('error');
      setTimeout(() => setShareStatus('idle'), 2000);
    }
  };

  const handleAcceptShare = async () => {
    if (!incomingShare) return;
    await importData(incomingShare);
    setIncomingShare(null);
    clearShareFromUrl();
    setSelectedPersonId(null);
    setPerspective(null);
  };

  const handleDeclineShare = () => {
    setIncomingShare(null);
    clearShareFromUrl();
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
        <div className="perspective-selector">
          <label htmlFor="perspective-select">Viewing as:</label>
          <select
            id="perspective-select"
            value={perspectiveId || ''}
            onChange={(e) => setPerspective(e.target.value || null)}
          >
            <option value="">Select yourself...</option>
            {people
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(person => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))
            }
          </select>
        </div>
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
            <div className="sidebar-buttons">
              <button className="btn-primary add-btn" onClick={() => setShowAddForm(true)}>
                + Add Person
              </button>
              {people.length > 0 && (
                <button className="btn-map" onClick={() => setShowFamilyMap(true)}>
                  Family Map
                </button>
              )}
            </div>
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
                  showAsUser={person.id === perspectiveId}
                  onClick={() => setSelectedPersonId(person.id)}
                />
              ))
            )}
          </div>

          <div className="sidebar-footer">
            <button
              className={`btn-share ${shareStatus === 'copied' ? 'btn-success' : ''}`}
              onClick={handleShare}
              disabled={people.length === 0}
            >
              {shareStatus === 'copied' ? 'Link Copied!' : shareStatus === 'error' ? 'Failed' : 'Share Link'}
            </button>
            <div className="footer-secondary">
              <button className="btn-text" onClick={handleExport}>Export</button>
              <button className="btn-text" onClick={handleImport}>Import</button>
              <button className="btn-text btn-danger" onClick={() => setShowClearConfirm(true)}>Clear</button>
            </div>
          </div>

          {showClearConfirm && (
            <div className="confirm-overlay">
              <div className="confirm-dialog">
                <h3>Clear All Data?</h3>
                <p>This will permanently delete all people and relationships. This cannot be undone.</p>
                <div className="confirm-actions">
                  <button className="btn-secondary" onClick={() => setShowClearConfirm(false)}>
                    Cancel
                  </button>
                  <button className="btn-danger-solid" onClick={handleClearAll}>
                    Yes, Delete Everything
                  </button>
                </div>
              </div>
            </div>
          )}

          {incomingShare && (
            <div className="confirm-overlay">
              <div className="confirm-dialog share-dialog">
                <h3>Family Data Shared With You</h3>
                <p>
                  Someone shared their family directory with you!
                  It contains <strong>{incomingShare.people.length} people</strong> and{' '}
                  <strong>{incomingShare.relationships.length} relationships</strong>.
                </p>
                <p className="share-warning">
                  This will replace any existing data you have.
                </p>
                <div className="confirm-actions">
                  <button className="btn-secondary" onClick={handleDeclineShare}>
                    No Thanks
                  </button>
                  <button className="btn-primary" onClick={handleAcceptShare}>
                    Load Family Data
                  </button>
                </div>
              </div>
            </div>
          )}
        </aside>

        <section className="content">
          {showFamilyMap ? (
            <FamilyMap
              onSelectPerson={(id) => {
                setSelectedPersonId(id);
                setShowFamilyMap(false);
              }}
              onClose={() => setShowFamilyMap(false)}
            />
          ) : showAddForm ? (
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
                A family directory that explains relationships in plain language.
              </p>
              {!perspective && people.length > 0 && (
                <div className="perspective-hint">
                  <p><strong>First, select yourself</strong> from the "Viewing as" dropdown above.</p>
                  <p>This sets your perspective so relationships are explained relative to you.</p>
                </div>
              )}
              <div className="how-it-works">
                <div className="step">
                  <span className="step-number">1</span>
                  <span>Add people and set who you are</span>
                </div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span>Add relationships (parent, child, sibling, spouse, friend)</span>
                </div>
                <div className="step">
                  <span className="step-number">3</span>
                  <span>Tap anyone to see who they are - like a family reunion nametag!</span>
                </div>
              </div>
              <p className="tagline">
                Share the data with family. Everyone picks their own perspective.
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
