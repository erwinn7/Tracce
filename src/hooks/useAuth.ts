import { useState, useEffect } from 'react';

export interface AuthUser {
  username: string;
  isAdmin: boolean;
}

const STORAGE_KEY_AUTH = 'tracce_auth_user';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Erreur lecture auth locale:', e);
    }
  }, []);

  const login = (usernameInput: string, passwordInput: string): { success: boolean; message?: string } => {
    const cleanUser = usernameInput.trim().toLowerCase();
    const cleanPass = passwordInput.trim();

    if (!cleanUser || !cleanPass) {
      return { success: false, message: 'Veuillez saisir un pseudo et un mot de passe.' };
    }

    // Identifiants admin exigés
    if (cleanUser === 'erwinn' && cleanPass === 'pwaErwinn') {
      const authData: AuthUser = { username: 'Erwinn', isAdmin: true };
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authData));
      setUser(authData);
      return { success: true };
    }

    // Tout autre utilisateur est un utilisateur standard non-admin
    const authData: AuthUser = { username: usernameInput.trim(), isAdmin: false };
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(authData));
    setUser(authData);
    return { success: true };
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    setUser(null);
  };

  return { user, login, logout };
}
