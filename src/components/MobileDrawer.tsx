import React from 'react';
import type { AuthUser } from '../hooks/useAuth';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentScreen: 'welcome' | 'quests' | 'admin' | 'profile';
  onNavigate: (screen: 'welcome' | 'quests' | 'admin' | 'profile') => void;
  currentUser: AuthUser | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onForceUpdate?: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  currentScreen,
  onNavigate,
  currentUser,
  onOpenAuth,
  onLogout,
  onForceUpdate,
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

          <button
            type="button"
            className={`drawer-link ${currentScreen === 'profile' ? 'drawer-link-active' : ''}`}
            onClick={() => {
              onNavigate('profile');
              onClose();
            }}
          >
            📍 Mon Profil & Carte
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
          {onForceUpdate && (
            <button
              type="button"
              className="btn-drawer-update"
              onClick={() => {
                onClose();
                onForceUpdate();
              }}
              style={{
                width: '100%',
                marginBottom: '10px',
                padding: '9px 12px',
                backgroundColor: '#f8fafc',
                color: '#2D4A3E',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              🔄 Recharger la dernière version
            </button>
          )}

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
