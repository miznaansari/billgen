import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../firebase";
import { invalidateCache } from "../lib/billsService";

const AuthContext = createContext({ user: null, ready: false, logout: () => {} });

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
      // Kept for compatibility with older localStorage-based checks.
      if (u) {
        localStorage.setItem("uid", u.uid);
        if (u.displayName) localStorage.setItem("name", u.displayName);
        if (u.email) localStorage.setItem("email", u.email);
      } else {
        localStorage.removeItem("uid");
      }
    });
    return unsub;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      localStorage.clear();
      invalidateCache();
    }
  };

  return (
    <AuthContext.Provider value={{ user, ready, logout }}>{children}</AuthContext.Provider>
  );
}
