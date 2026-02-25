import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { User, AuthState, UserRole } from '../types';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (module: string, action: string) => boolean;
  canAccessModule: (module: string) => boolean;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

// Permissions configuration
// SUPER_ADMIN = accès total inter-entreprises (gestion multi-sociétés)
// ADMIN = super admin de l'entreprise (acces complet a tout, y compris paie)
// GERANT = gestion (acces complet sauf paie)
// DIRECTEUR/RESPONSABLE/MAIRE = lecture seule (tous les rapports)
// Employes (maitre_nageur, serveur, receptionniste, gestionnaire_events) = leur module + leurs propres transactions
const moduleAccess: Record<string, UserRole[]> = {
  piscine: ['maitre_nageur', 'gerant', 'admin', 'directeur', 'maire'],
  restaurant: ['serveuse', 'serveur', 'gerant', 'admin', 'directeur', 'maire'],
  hotel: ['receptionniste', 'gerant', 'admin', 'directeur', 'maire'],
  events: ['gestionnaire_events', 'gerant', 'admin', 'directeur', 'maire'],
  caisse: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'admin', 'directeur'],
  dashboard: ['gerant', 'admin', 'responsable', 'directeur', 'maire'],
  users: ['gerant', 'admin'],
  employees: ['admin', 'directeur', 'gerant'],
  expenses: ['gerant', 'admin', 'directeur'],
  reports: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'admin', 'responsable', 'directeur', 'maire'],
  companies: ['super_admin'],  // Gestion multi-entreprises
  // Nouveaux modules
  lavage: ['gerant', 'admin', 'serveur', 'serveuse', 'receptionniste', 'maitre_nageur'],
  maquis: ['gerant', 'admin', 'serveur', 'serveuse'],
  superette: ['gerant', 'admin', 'serveur', 'serveuse', 'receptionniste']
};

const permissions: Record<string, Record<string, UserRole[]>> = {
  piscine: {
    vente_tickets: ['maitre_nageur', 'gerant', 'admin'],  // Admin et gerant peuvent aussi saisir
    gestion_abonnements: ['maitre_nageur', 'gerant', 'admin'],
    gestion_prix: ['gerant', 'admin'],
    lecture: ['maitre_nageur', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
  },
  restaurant: {
    ventes: ['serveuse', 'serveur', 'gerant', 'admin'],  // Admin et gerant peuvent aussi saisir
    gestion_menu: ['gerant', 'admin'],
    lecture: ['serveuse', 'serveur', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
  },
  hotel: {
    reservations: ['receptionniste', 'gerant', 'admin'],  // Admin et gerant peuvent aussi saisir
    gestion_chambres: ['gerant', 'admin'],
    lecture: ['receptionniste', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
  },
  events: {
    gestion: ['gestionnaire_events', 'gerant', 'admin'],  // Admin et gerant peuvent aussi saisir
    devis: ['gestionnaire_events', 'gerant', 'admin'],
    gestion_espaces: ['gerant', 'admin'],
    lecture: ['gestionnaire_events', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
  },
  caisse: {
    cloture_propre: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'admin'],
    validation: ['gerant', 'admin'],
    lecture: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events', 'gerant', 'admin', 'responsable', 'directeur', 'maire']
  },
  dashboard: {
    complet: ['gerant', 'admin'],
    lecture_seule: ['responsable', 'directeur', 'maire']
  },
  users: {
    gestion: ['gerant', 'admin'],
    lecture: ['gerant', 'admin']
  },
  employees: {
    gestion: ['admin'],
    paiement: ['admin'],
    lecture: ['admin', 'directeur']
  },
  expenses: {
    gestion: ['gerant', 'admin'],
    lecture: ['gerant', 'admin', 'directeur']
  },
  reports: {
    tous_rapports: ['admin', 'gerant', 'responsable', 'directeur', 'maire'],
    propres_transactions: ['maitre_nageur', 'serveuse', 'serveur', 'receptionniste', 'gestionnaire_events']
  }
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          dispatch({ type: 'LOGIN_FAILURE' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authApi.login(username, password);
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue with logout even if API call fails
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const hasPermission = (module: string, action: string): boolean => {
    if (!state.user) return false;
    // Le super_admin a tous les droits
    if (state.user.role === 'super_admin') return true;
    const allowedRoles = permissions[module]?.[action] || [];
    return allowedRoles.includes(state.user.role);
  };

  const canAccessModule = (module: string): boolean => {
    if (!state.user) return false;
    // Le super_admin a accès à tous les modules
    if (state.user.role === 'super_admin') return true;
    const allowedRoles = moduleAccess[module] || [];
    return allowedRoles.includes(state.user.role);
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasPermission, canAccessModule }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
