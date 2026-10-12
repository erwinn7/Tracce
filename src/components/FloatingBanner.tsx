import React from 'react';

interface FloatingBannerProps {
  type: 'update' | 'install';
  isIos?: boolean;
  onAction?: () => void;
  onDismiss: () => void;
}

export const FloatingBanner: React.FC<FloatingBannerProps> = ({
  type,
  isIos,
  onAction,
  onDismiss,
}) => {
  return (
    <aside className="floating-banner-wrapper" role="status" aria-live="polite">
      <div className="floating-banner">
        <div className="floating-banner-content">
          {type === 'update' ? (
            <>
              <div className="floating-banner-text">
                <strong className="floating-banner-title">Nouvelle version disponible</strong>
                <p className="floating-banner-desc">Une mise à jour de Tracce est prête.</p>
              </div>
              <div className="floating-banner-actions">
                <button type="button" className="banner-btn banner-btn-primary" onClick={onAction}>
                  Mettre à jour
                </button>
                <button type="button" className="banner-btn banner-btn-secondary" onClick={onDismiss}>
                  Plus tard
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="floating-banner-text">
                <strong className="floating-banner-title">Installer Tracce</strong>
                <p className="floating-banner-desc">
                  {isIos
                    ? 'Appuie sur Partager puis Sur l’écran d’accueil.'
                    : 'Accède à l’application hors ligne directement depuis ton écran d’accueil.'}
                </p>
              </div>
              <div className="floating-banner-actions">
                {!isIos && onAction && (
                  <button type="button" className="banner-btn banner-btn-primary" onClick={onAction}>
                    Installer
                  </button>
                )}
                <button
                  type="button"
                  className="banner-btn banner-btn-secondary"
                  onClick={onDismiss}
                  aria-label="Fermer la bannière d'installation"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
};
