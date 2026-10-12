import { useRegisterSW } from 'virtual:pwa-register/react';
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

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tracce</h1>
        <p className="app-subtitle">Rally photo géolocalisé en Corse</p>
      </header>

      <main className="app-main">
        <p>Application en construction — Jalon M0</p>
      </main>

      {offlineReady && (
        <div className="toast" role="alert">
          <p>Application prête pour une utilisation hors ligne.</p>
          <button onClick={close}>Fermer</button>
        </div>
      )}

      {needRefresh && (
        <div className="update-banner" role="alert">
          <p>Nouvelle version disponible</p>
          <button
            className="btn-primary"
            onClick={() => void updateServiceWorker(true)}
          >
            Recharger
          </button>
          <button className="btn-secondary" onClick={close}>
            Ignorer
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
