import { createContext, useContext, useState, ReactNode } from 'react';

interface ActingUser {
  id: string;
  full_name: string;
  email: string;
}

interface ActingUserContextType {
  actingUser: ActingUser | null;
  setActingUser: (user: ActingUser | null) => void;
  isImpersonating: boolean;
  clearImpersonation: () => void;
}

const ActingUserContext = createContext<ActingUserContextType | undefined>(undefined);

export function ActingUserProvider({ children }: { children: ReactNode }) {
  const [actingUser, setActingUser] = useState<ActingUser | null>(null);

  const isImpersonating = actingUser !== null;

  const clearImpersonation = () => {
    setActingUser(null);
  };

  return (
    <ActingUserContext.Provider
      value={{
        actingUser,
        setActingUser,
        isImpersonating,
        clearImpersonation,
      }}
    >
      {children}
    </ActingUserContext.Provider>
  );
}

export function useActingUser() {
  const context = useContext(ActingUserContext);
  if (context === undefined) {
    throw new Error('useActingUser must be used within an ActingUserProvider');
  }
  return context;
}
