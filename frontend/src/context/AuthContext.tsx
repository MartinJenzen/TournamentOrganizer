import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AuthResponse } from '../services/authService';


// Define the type for the authentication context
type AuthContextType = {
  user: AuthResponse | null,
  setUser: (u: AuthResponse | null) => void
}

// Create the authentication context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {}    // Default/placeholder function that does nothing
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to allow easy access to the AuthContext
export function useAuth() {
  return useContext(AuthContext);
}