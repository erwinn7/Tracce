import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useCatalog } from './hooks/useCatalog';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useCompletions } from './hooks/useCompletions';
import { useSync } from './hooks/useSync';
import { useAuth } from './hooks/useAuth';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CitySelector } from './components/CitySelector';
import { QuestCard } from './components/QuestCard';
import { QuestDetail } from './components/QuestDetail';
import { QuestValidationModal } from './components/QuestValidationModal';
import { FloatingBanner } from './components/FloatingBanner';
import { SyncIndicator } from './components/SyncIndicator';
import { MobileDrawer } from './components/MobileDrawer';
import { AuthModal } from './components/AuthModal';
import { AdminAddPlace } from './components/AdminAddPlace';
import { ProfileView } from './components/ProfileView';
import { computeScore } from './utils/geo';
import type { CityId, QuestType, Quest } from './types/quest';
import { TYPE_LABELS } from './types/quest';
import type { LocalCompletion } from './lib/db';
import './App.css';

type Screen = 'welcome' | 'quests' | 'admin' | 'profile';

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

  // Vérification périodique SW
  useEffect(() => {
    const checkUpdate = () => {
      if (swRegistrationRef.current) {
        swRegistrationRef.current.update().catch((err) => {
          console.warn('[SW] Erreur vérification MAJ:', err);
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

  const { catalog, loading: loadingCatalog, error: errorCatalog, addCustomQuest } = useCatalog();
  const { canShowPrompt, isIos, installApp, dismissInstall } = useInstallPrompt();
  const { completions, saveCompletion, resetDemo, refreshCompletions } = useCompletions();
  const { user: authUser, login: authLogin, logout: authLogout } = useAuth();

  // Synchronisation Firestore (M3)
  const handleRemoteMerged = useCallback(() => {
    refreshCompletions();
  }, [refreshCompletions]);

  const { syncState, pendingCount, syncOneCompletion } = useSync(handleRemoteMerged, authUser);

  // Navigation & Drawer
  const [currentScreen, setCurrentScreen] = useState<Screen>('welcome');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Mode Démo
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Modal de validation
  const [validatingQuest, setValidatingQuest] = useState<Quest | null>(null);

  // Filtres
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

  // Scores
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
      {/* Bannière flottante */}
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

      {/* En-tête avec bouton menu burger */}
      <header className="app-header">
        <div className="header-left">
          <button
            type="button"
            className="btn-hamburger"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <div
            className="header-brand"
            onClick={() => {
              setSelectedQuest(null);
              setCurrentScreen('welcome');
            }}
            role="button"
            tabIndex={0}
          >
            <img src={`${import.meta.env.BASE_URL}icons/logo.png`} alt="Logo Tracce" className="app-logo" />
            <div className="header-titles">
              <h1 className="app-title">Tracce</h1>
              <p className="app-subtitle">Rally photo en Corse</p>
            </div>
          </div>

          {/* Navigation directe visible uniquement sur PC / grand écran */}
          <nav className="desktop-nav">
            <button
              type="button"
              className={`desktop-nav-link ${currentScreen === 'welcome' && !selectedQuest ? 'active' : ''}`}
              onClick={() => {
                setSelectedQuest(null);
                setCurrentScreen('welcome');
              }}
            >
              Accueil
            </button>
            <button
              type="button"
              className={`desktop-nav-link ${currentScreen === 'quests' || selectedQuest ? 'active' : ''}`}
              onClick={() => {
                setSelectedQuest(null);
                setCurrentScreen('quests');
              }}
            >
              Quêtes
            </button>
            <button
              type="button"
              className={`desktop-nav-link ${currentScreen === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setSelectedQuest(null);
                setCurrentScreen('profile');
              }}
            >
              📍 Profil & Carte
            </button>
            {authUser?.isAdmin && (
              <button
                type="button"
                className={`desktop-nav-link desktop-nav-admin ${currentScreen === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedQuest(null);
                  setCurrentScreen('admin');
                }}
              >
                👑 Espace Admin
              </button>
            )}
          </nav>
        </div>

        {/* Droite : Sync (admin), Profil/Login & Score */}
        <div className="header-scores-wrap">
          {authUser?.isAdmin && (
            <SyncIndicator syncState={syncState} pendingCount={pendingCount} />
          )}

          {/* Bouton rapide Compte / Login */}
          <button
            type="button"
            className={`btn-user-pill ${authUser?.isAdmin ? 'btn-user-admin' : ''}`}
            onClick={() => {
              if (authUser) {
                setSelectedQuest(null);
                setCurrentScreen('profile');
              } else {
                setIsAuthModalOpen(true);
              }
            }}
            title={authUser ? `Voir profil de ${authUser.username}` : 'Se connecter'}
          >
            {authUser ? (authUser.isAdmin ? '👑 Erwinn' : `👤 ${authUser.username}`) : '🔑 Connexion'}
          </button>

          <div className="score-badge">
            <span className="score-val">{realScore}</span>
            <span className="score-lbl">pts</span>
          </div>
          {authUser?.isAdmin && demoScore > 0 && (
            <div className="score-badge score-badge-demo" title="Points en mode démo (séparés)">
              <span className="score-val">+{demoScore}</span>
              <span className="score-lbl">démo</span>
            </div>
          )}
        </div>
      </header>

      {/* Barre Réglages & Mode Démo (uniquement pour l'admin) */}
      {currentScreen === 'quests' && authUser?.isAdmin && (
        <section className="demo-control-bar">
          <div className="demo-control-left">
            <label className="demo-toggle-label">
              <input
                type="checkbox"
                checked={isDemoMode}
                onChange={(e) => setIsDemoMode(e.target.checked)}
              />
              <span className="demo-toggle-text">
                Mode Démo {isDemoMode ? '(actif)' : ''}
              </span>
            </label>
          </div>

          <div className="demo-control-right">
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
          </div>
        </section>
      )}

      {/* Contenu principal */}
      <main className="app-main">
        {currentScreen === 'profile' ? (
          <ProfileView
            user={authUser}
            completions={completions}
            catalog={catalog}
            onBack={() => setCurrentScreen('quests')}
            onNavigateToQuests={() => {
              setSelectedQuest(null);
              setCurrentScreen('quests');
            }}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={authLogout}
          />
        ) : currentScreen === 'welcome' ? (
          <WelcomeScreen
            onStart={() => setCurrentScreen('quests')}
            totalQuests={catalog?.quests.length ?? 0}
          />
        ) : currentScreen === 'admin' ? (
          authUser?.isAdmin ? (
            <AdminAddPlace
              onAddQuest={async (q) => {
                await addCustomQuest(q);
              }}
              onBack={() => setCurrentScreen('quests')}
            />
          ) : (
            <div className="empty-state">
              <p>Accès restreint aux administrateurs.</p>
              <button
                type="button"
                className="btn-link"
                onClick={() => setCurrentScreen('quests')}
              >
                Retour aux quêtes
              </button>
            </div>
          )
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
                <div className="section-status-badges">
                  <span className="section-subtitle">
                    {completions.length} validée{completions.length > 1 ? 's' : ''}
                  </span>
                </div>
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

      {/* Menu Drawer Mobile */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setSelectedQuest(null);
          setCurrentScreen(screen);
        }}
        currentUser={authUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={authLogout}
      />

      {/* Modal d'authentification */}
      {isAuthModalOpen && (
        <AuthModal
          currentUser={authUser}
          onLogin={authLogin}
          onLogout={authLogout}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Modal de validation */}
      {validatingQuest && (
        <QuestValidationModal
          quest={validatingQuest}
          isDemoMode={isDemoMode}
          onSuccess={async (completion, photoBlob) => {
            await saveCompletion(completion, photoBlob);
            syncOneCompletion(completion);
            setValidatingQuest(null);
          }}
          onClose={() => setValidatingQuest(null)}
        />
      )}

      {/* Pied de page */}
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
