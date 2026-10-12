import React from 'react';
import type { AuthUser } from '../hooks/useAuth';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: 'welcome' | 'quests' | 'admin';
  onNavigate: (screen: 'welcome' | 'quests' | 'admin') => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-brand">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Logo" className="drawer-logo" />
            <span className="drawer-title">Menu Tracce</span>
          </div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fermer le menu">
            ✕
          </button>
        </div>

        <nav className="drawer-nav">
          <button
            type="button"
            className={`drawer-link ${currentScreen === 'welcome' ? 'drawer-link-active' : ''}`}
            onClick={() => {
              onNavigate('welcome');
              onClose();
            }}
          >
            🏠 Accueil & Présentation
          </button>

          <button
            type="button"
            className={`drawer-link ${currentScreen === 'quests' ? 'drawer-link-active' : ''}`}
            onClick={() => {
              onNavigate('quests');
              onClose();
            }}
          >
            🗺️ Catalogue des Quêtes
          </button>

          {currentUser?.isAdmin && (
            <button
              type="button"
              className={`drawer-link drawer-link-admin ${currentScreen === 'admin' ? 'drawer-link-active' : ''}`}
              onClick={() => {
                onNavigate('admin');
                onClose();
              }}
            >
              👑 Ajouter un lieu (Admin)
            </button>
          )}
        </nav>

        <div className="drawer-footer">
          {currentUser ? (
            <div className="drawer-user-box">
              <div className="drawer-user-info">
                <span className="drawer-user-name">👤 {currentUser.username}</span>
                {currentUser.isAdmin && <span className="admin-tag">Admin</span>}
              </div>
              <button
                type="button"
                className="btn-drawer-logout"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-drawer-login"
              onClick={() => {
                onClose();
                onOpenAuth();
              }}
            >
              🔑 Se connecter
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
