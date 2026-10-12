import { useState, useMemo } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCatalog } from './hooks/useCatalog';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { CitySelector } from './components/CitySelector';
import { QuestCard } from './components/QuestCard';
import { QuestDetail } from './components/QuestDetail';
import type { CityId, QuestType, Quest } from './types/quest';
import { TYPE_LABELS } from './types/quest';
import './App.css';

function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('[SW] Enregistré :', registration);
    },
    onRegisterError(error) {
      console.error('[SW] Erreur :', error);
    },
  });

  const { catalog, loading, error } = useCatalog();
  const { isInstallable, installApp } = useInstallPrompt();

  // Navigation & filtres
  const [selectedCity, setSelectedCity] = useState<CityId | 'all'>('all');
  const [selectedType, setSelectedType] = useState<QuestType | 'all'>('all');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  const filteredQuests = useMemo(() => {
    if (!catalog) return [];
    return catalog.quests.filter((q) => {
      const matchCity = selectedCity === 'all' || q.cityId === selectedCity;
      const matchType = selectedType === 'all' || q.type === selectedType;
      return matchCity && matchType;
    });
  }, [catalog, selectedCity, selectedType]);

  const closeToast = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const typesList: { id: QuestType | 'all'; label: string }[] = [
    { id: 'all', label: 'Tous types' },
    { id: 'ville', label: TYPE_LABELS['ville'] },
    { id: 'colline', label: TYPE_LABELS['colline'] },
    { id: 'site-naturel', label: TYPE_LABELS['site-naturel'] },
    { id: 'sommet', label: TYPE_LABELS['sommet'] },
  ];

  return (
    <div className="app-container">
      {/* En-tête */}
      <header className="app-header">
        <div className="header-brand" onClick={() => setSelectedQuest(null)} role="button" tabIndex={0}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo Tracce" className="app-logo" />
          <div className="header-titles">
            <h1 className="app-title">Tracce</h1>
            <p className="app-subtitle">Rally photo géolocalisé en Corse</p>
          </div>
        </div>

        {isInstallable && (
          <button type="button" className="btn-install" onClick={installApp}>
            📥 Installer l'app
          </button>
        )}
      </header>

      {/* Contenu principal */}
      <main className="app-main">
        {selectedQuest ? (
          <QuestDetail quest={selectedQuest} onBack={() => setSelectedQuest(null)} />
        ) : (
          <>
            {/* Écran 1: Sélecteur de ville */}
            <section className="section-cities">
              <h2 className="section-title">Choisissez un territoire</h2>
              <CitySelector selectedCity={selectedCity} onSelectCity={setSelectedCity} />
            </section>

            {/* Écran 2: Filtres par type */}
            <section className="section-filters">
              <div className="type-filter-chips">
                {typesList.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`chip ${selectedType === t.id ? 'chip-active' : ''}`}
                    onClick={() => setSelectedType(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Liste des quêtes */}
            <section className="section-quests">
              <div className="section-header-row">
                <h2 className="section-title">
                  Quêtes disponibles ({filteredQuests.length})
                </h2>
              </div>

              {loading && <p className="status-msg">Chargement des quêtes...</p>}
              {error && <p className="status-msg error-msg">{error}</p>}

              {!loading && !error && filteredQuests.length === 0 && (
                <div className="empty-state">
                  <p>Aucune quête ne correspond à vos filtres.</p>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => {
                      setSelectedCity('all');
                      setSelectedType('all');
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                </div>
              )}

              <div className="quests-grid">
                {filteredQuests.map((quest) => (
                  <QuestCard
                    key={quest.id}
                    quest={quest}
                    onSelect={(q) => setSelectedQuest(q)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Pied de page avec crédit OSM */}
      <footer className="app-footer">
        <p className="footer-credits">
          Données cartographiques & coordonnées :{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
          >
            © contributeurs OpenStreetMap
          </a>
        </p>
      </footer>

      {/* Toasts et bannières PWA */}
      {offlineReady && (
        <div className="toast" role="alert">
          <p>Application prête pour une utilisation hors ligne.</p>
          <button type="button" onClick={closeToast}>Fermer</button>
        </div>
      )}

      {needRefresh && (
        <div className="update-banner" role="alert">
          <p>Nouvelle version disponible</p>
          <button
            type="button"
            className="btn-primary"
            onClick={() => void updateServiceWorker(true)}
          >
            Recharger
          </button>
          <button type="button" className="btn-secondary" onClick={closeToast}>
            Ignorer
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
