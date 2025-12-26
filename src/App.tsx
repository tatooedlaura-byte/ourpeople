import { useState, useEffect } from 'react';
import { EngineProvider, useEngine, useAddPerson, useDataOperations, usePerspective } from './hooks/useEngine';
import { PersonCard, PersonForm, PersonDetail, FamilyMap } from './components';
import { createShareLink, getSharedDataFromUrl, clearShareFromUrl, copyToClipboard } from './utils/sharing';
import type { Person } from './types';
import './App.css';

function getBirthdaysByMonth(people: Person[]): Map<number, Array<{ person: Person; day: number }>> {
  const months = new Map<number, Array<{ person: Person; day: number }>>();

  // Initialize all months
  for (let i = 0; i < 12; i++) {
    months.set(i, []);
  }

  people
    .filter(p => p.birthday && !p.deceased)
    .forEach(p => {
      const date = new Date(p.birthday! + 'T00:00:00');
      const month = date.getMonth();
      const day = date.getDate();
      months.get(month)!.push({ person: p, day });
    });

  // Sort each month by day
  for (const [, birthdays] of months) {
    birthdays.sort((a, b) => a.day - b.day);
  }

  return months;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function AppContent() {
  const { isLoading, error, people } = useEngine();
  const { perspectiveId, setPerspective } = usePerspective();
  const addPerson = useAddPerson();
  const { exportData, importData, clearAll } = useDataOperations();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'done'>('idle');
  const [incomingShare, setIncomingShare] = useState<{ people: Person[]; relationships: any[] } | null>(null);

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFamilyMap, setShowFamilyMap] = useState(false);
  const [showBirthdays, setShowBirthdays] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
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

    setExportStatus('done');
    setTimeout(() => setExportStatus('idle'), 2000);
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

  // Show splash screen
  if (showSplash) {
    return (
      <div className="splash">
        <div className="splash-content">
          <div className="splash-logo">
            <img src="./apple-touch-icon.png" alt="Our People" />
          </div>
          <h1>Our People</h1>
          <p className="splash-tagline">A family directory that explains relationships in plain language.</p>

          {people.length > 0 ? (
            <div className="splash-perspective">
              <label>Who are you?</label>
              <select
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
          ) : (
            <p className="splash-empty">No family members yet. Add your first person to get started!</p>
          )}

          <button className="splash-enter" onClick={() => setShowSplash(false)}>
            {people.length === 0 ? 'Get Started' : 'Enter'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Our People</h1>
        {people.some(p => p.birthday && !p.deceased) && (
          <button className="btn-birthdays" onClick={() => setShowBirthdays(true)}>
            Birthdays
          </button>
        )}
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
        <aside className={`sidebar ${!selectedPerson && !showAddForm && !showFamilyMap ? 'expanded' : ''}`}>
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
            <button className="btn-settings" onClick={() => setShowSettings(true)}>
              Settings
            </button>
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

          {showBirthdays && (
            <div className="confirm-overlay" onClick={() => setShowBirthdays(false)}>
              <div className="birthdays-modal" onClick={e => e.stopPropagation()}>
                <div className="birthdays-modal-header">
                  <h2>Birthdays</h2>
                  <button className="close-btn" onClick={() => setShowBirthdays(false)}>&times;</button>
                </div>
                <div className="birthdays-modal-content">
                  {Array.from(getBirthdaysByMonth(people).entries()).map(([month, birthdays]) => {
                    const isCurrentMonth = month === new Date().getMonth();
                    return (
                      <div
                        key={month}
                        className={`birthday-month ${isCurrentMonth ? 'current' : ''} ${birthdays.length === 0 ? 'empty' : ''}`}
                      >
                        <h3>{MONTH_NAMES[month]}</h3>
                        {birthdays.length > 0 ? (
                          <div className="birthday-month-list">
                            {birthdays.map(({ person, day }) => (
                              <button
                                key={person.id}
                                className="birthday-month-item"
                                onClick={() => {
                                  setSelectedPersonId(person.id);
                                  setShowBirthdays(false);
                                }}
                              >
                                <span className="bday-day">{day}</span>
                                <span className="bday-name">{person.name}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="no-birthdays">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {showSettings && (
            <div className="confirm-overlay" onClick={() => setShowSettings(false)}>
              <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                  <h2>Settings</h2>
                  <button className="close-btn" onClick={() => setShowSettings(false)}>&times;</button>
                </div>
                <div className="settings-modal-content">
                  <div className="settings-section settings-about">
                    <h3>About Our People</h3>
                    <p className="about-desc">A family directory that explains relationships in plain language.</p>
                    <div className="about-steps">
                      <div className="about-step"><span>1</span> Add people and set who you are</div>
                      <div className="about-step"><span>2</span> Add relationships (parent, child, sibling, spouse)</div>
                      <div className="about-step"><span>3</span> Tap anyone to see who they are!</div>
                    </div>
                  </div>
                  <div className="settings-section">
                    <h3>Data Management</h3>
                    <div className="settings-buttons">
                      <button
                        className={`settings-btn ${exportStatus === 'done' ? 'btn-success' : ''}`}
                        onClick={handleExport}
                      >
                        {exportStatus === 'done' ? 'Saved!' : 'Export Backup'}
                      </button>
                      <button className="settings-btn" onClick={handleImport}>
                        Import Backup
                      </button>
                    </div>
                  </div>
                  <div className="settings-section settings-danger">
                    <h3>Danger Zone</h3>
                    <button
                      className="settings-btn btn-danger-solid"
                      onClick={() => {
                        setShowSettings(false);
                        setShowClearConfirm(true);
                      }}
                    >
                      Clear All Data
                    </button>
                  </div>
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
          ) : null}
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
