import { useState, useMemo, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCatalog } from './hooks/useCatalog';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { CitySelector } from './components/CitySelector';
import { QuestCard } from './components/QuestCard';
import { QuestDetail } from './components/QuestDetail';
import { FloatingBanner } from './components/FloatingBanner';
import type { CityId, QuestType, Quest } from './types/quest';
import { TYPE_LABELS } from './types/quest';
import './App.css';

function App() {
  const swRegistrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      swRegistrationRef.current = registration;
      console.log('[SW] Enregistré :', registration);
    },
    onRegisterError(error) {
      console.error('[SW] Erreur :', error);
    },
  });

  // Vérification périodique (toutes les heures) et sur visibilitychange
  useEffect(() => {
    const checkUpdate = () => {
      if (swRegistrationRef.current) {
        swRegistrationRef.current.update().catch((err) => {
          console.warn('[SW] Erreur lors de la vérification de mise à jour:', err);
        });
      }
    };

    const intervalId = window.setInterval(checkUpdate, 60 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { catalog, loading, error } = useCatalog();
  const { canShowPrompt, isIos, installApp, dismissInstall } = useInstallPrompt();

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

  const closeOfflineToast = () => {
    setOfflineReady(false);
  };

  const handleDismissUpdate = () => {
    setNeedRefresh(false);
  };

  // Priorité : Mise à jour d'abord, Installation ensuite. Une seule bannière à la fois.
  const activeBannerType = needRefresh ? 'update' : canShowPrompt ? 'install' : null;

  const typesList: { id: QuestType | 'all'; label: string }[] = [
    { id: 'all', label: 'Tous types' },
    { id: 'ville', label: TYPE_LABELS['ville'] },
    { id: 'colline', label: TYPE_LABELS['colline'] },
    { id: 'site-naturel', label: TYPE_LABELS['site-naturel'] },
    { id: 'sommet', label: TYPE_LABELS['sommet'] },
  ];

  return (
    <div className={`app-container ${activeBannerType ? 'has-floating-banner' : ''}`}>
      {/* Bannière flottante en haut de l'écran */}
      {activeBannerType === 'update' && (
        <FloatingBanner
          type="update"
          onAction={() => void updateServiceWorker(true)}
          onDismiss={handleDismissUpdate}
        />
      )}

      {activeBannerType === 'install' && (
        <FloatingBanner
          type="install"
          isIos={isIos}
          onAction={installApp}
          onDismiss={dismissInstall}
        />
      )}

      {/* En-tête */}
      <header className="app-header">
        <div className="header-brand" onClick={() => setSelectedQuest(null)} role="button" tabIndex={0}>
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo Tracce" className="app-logo" />
          <div className="header-titles">
            <h1 className="app-title">Tracce</h1>
            <p className="app-subtitle">Rally photo géolocalisé en Corse</p>
          </div>
        </div>
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

      {/* Toast d'état hors ligne */}
      {offlineReady && (
        <div className="toast" role="alert">
          <p>Application prête pour une utilisation hors ligne.</p>
          <button type="button" onClick={closeOfflineToast}>Fermer</button>
        </div>
      )}
    </div>
  );
}

export default App;
