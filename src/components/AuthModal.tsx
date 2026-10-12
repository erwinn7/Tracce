import React, { useState } from 'react';
import type { AuthUser } from '../hooks/useAuth';

interface AuthModalProps {
  currentUser: AuthUser | null;
  onLogin: (u: string, p: string) => { success: boolean; message?: string };
  onLogout: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onLogin,
  onLogout,
  onClose,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = onLogin(username, password);
    if (res.success) {
      onClose();
    } else {
      setError(res.message || 'Identifiants invalides.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card modal-auth-card" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2 className="modal-title">
            {currentUser ? 'Mon Compte' : 'Connexion'}
          </h2>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        <div className="modal-body">
          {currentUser ? (
            <div className="auth-profile-wrap">
              <div className="profile-avatar">👤</div>
              <h3>Connecté en tant que <strong>{currentUser.username}</strong></h3>
              {currentUser.isAdmin && (
                <span className="admin-badge-pill">👑 Administrateur</span>
              )}
              <p className="profile-hint">
                {currentUser.isAdmin
                  ? 'Vous disposez des droits administrateur pour ajouter de nouveaux lieux au catalogue.'
                  : 'Compte explorateur standard actif.'}
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="banner-btn banner-btn-secondary"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              {error && <div className="error-msg auth-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="auth-user">Pseudo</label>
                <input
                  id="auth-user"
                  type="text"
                  placeholder="Votre pseudo"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="auth-pass">Mot de passe</label>
                <input
                  id="auth-pass"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="banner-btn banner-btn-primary btn-auth-submit">
                Se connecter
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
