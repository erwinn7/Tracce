import { useState, useMemo, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCatalog } from './hooks/useCatalog';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useCompletions } from './hooks/useCompletions';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CitySelector } from './components/CitySelector';
import { QuestCard } from './components/QuestCard';
import { QuestDetail } from './components/QuestDetail';
import { QuestValidationModal } from './components/QuestValidationModal';
import { FloatingBanner } from './components/FloatingBanner';
import { computeScore } from './utils/geo';
import type { CityId, QuestType, Quest } from './types/quest';
import { TYPE_LABELS } from './types/quest';
import type { LocalCompletion } from './lib/db';
import './App.css';

type Screen = 'welcome' | 'quests';

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

  const { catalog, loading: loadingCatalog, error: errorCatalog } = useCatalog();
  const { canShowPrompt, isIos, installApp, dismissInstall } = useInstallPrompt();
  const { completions, saveCompletion, resetDemo } = useCompletions();

  // Écran actif : accueil ou liste des quêtes
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');

  // Mode Démo
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Modal de validation
  const [validatingQuest, setValidatingQuest] = useState<Quest | null>(null);

  // Navigation & filtres
  const [selectedCity, setSelectedCity] = useState<CityId | 'all'>('all');
  const [selectedType, setSelectedType] = useState<QuestType | 'all'>('all');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  // Map des complétions par questId
  const completionsMap = useMemo(() => {
    const map = new Map<string, LocalCompletion>();
    for (const c of completions) {
      map.set(c.questId, c);
    }
    return map;
  }, [completions]);

  // Scores recalculés à la volée
  const realScore = useMemo(
    () => computeScore(completions, catalog, false),
    [completions, catalog]
  );
  const demoScore = useMemo(
    () => computeScore(completions, catalog, true),
    [completions, catalog]
  );

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
        <div
          className="header-brand"
          onClick={() => {
            setSelectedQuest(null);
            setCurrentScreen('welcome');
          }}
          role="button"
          tabIndex={0}
        >
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo Tracce" className="app-logo" />
          <div className="header-titles">
            <h1 className="app-title">Tracce</h1>
            <p className="app-subtitle">Rally photo géolocalisé en Corse</p>
          </div>
        </div>

        {/* Score & Navigation Accueil / Quêtes */}
        <div className="header-scores-wrap">
          {currentScreen === 'quests' ? (
            <button
              type="button"
              className="btn-header-nav"
              onClick={() => {
                setSelectedQuest(null);
                setCurrentScreen('welcome');
              }}
            >
              Accueil
            </button>
          ) : (
            <button
              type="button"
              className="btn-header-nav btn-header-nav-active"
              onClick={() => setCurrentScreen('quests')}
            >
              Quêtes
            </button>
          )}

          <div className="score-badge">
            <span className="score-val">{realScore}</span>
            <span className="score-lbl">pts</span>
          </div>
          {demoScore > 0 && (
            <div className="score-badge score-badge-demo" title="Points en mode démo (séparés)">
              <span className="score-val">+{demoScore}</span>
              <span className="score-lbl">démo</span>
            </div>
          )}
        </div>
      </header>

      {/* Barre Réglages & Mode Démo (uniquement sur l'écran des quêtes ou si démo active) */}
      {currentScreen === 'quests' && (
        <section className="demo-control-bar">
          <label className="demo-toggle-label">
            <input
              type="checkbox"
              checked={isDemoMode}
              onChange={(e) => setIsDemoMode(e.target.checked)}
            />
            <span className="demo-toggle-text">
              Mode Démo {isDemoMode ? '(actif - sans GPS)' : ''}
            </span>
          </label>
          {demoScore > 0 && (
            <button
              type="button"
              className="btn-reset-demo"
              onClick={resetDemo}
              title="Effacer toutes les validations de démo"
            >
              Réinitialiser démo
            </button>
          )}
        </section>
      )}

      {/* Contenu principal selon l'écran actif */}
      <main className="app-main">
        {currentScreen === 'welcome' ? (
          <WelcomeScreen
            onStart={() => setCurrentScreen('quests')}
            totalQuests={catalog?.quests.length ?? 0}
          />
        ) : selectedQuest ? (
          <QuestDetail
            quest={selectedQuest}
            completion={completionsMap.get(selectedQuest.id)}
            onStartValidation={() => setValidatingQuest(selectedQuest)}
            onBack={() => setSelectedQuest(null)}
          />
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
                  Quêtes ({filteredQuests.length})
                </h2>
                <span className="section-subtitle">
                  {completions.length} validée{completions.length > 1 ? 's' : ''}
                </span>
              </div>

              {loadingCatalog && <p className="status-msg">Chargement des quêtes...</p>}
              {errorCatalog && <p className="status-msg error-msg">{errorCatalog}</p>}

              {!loadingCatalog && !errorCatalog && filteredQuests.length === 0 && (
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
                    completion={completionsMap.get(quest.id)}
                    onSelect={(q) => setSelectedQuest(q)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Modal de validation d'une quête (Écran 4) */}
      {validatingQuest && (
        <QuestValidationModal
          quest={validatingQuest}
          isDemoMode={isDemoMode}
          onSuccess={async (completion, photoBlob) => {
            await saveCompletion(completion, photoBlob);
            setValidatingQuest(null);
          }}
          onClose={() => setValidatingQuest(null)}
        />
      )}

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
