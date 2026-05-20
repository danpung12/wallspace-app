import { createContext } from 'react';

export type AuthContextType = {
  isLoggedIn: boolean;
  onLogout: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  onLogout: () => {},
});
