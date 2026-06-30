import { createContext, useContext, useEffect, useState } from "react";
import { subscribeToAuth } from "../services/authService";
import { initPushNotifications } from "../services/pushNotificationService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (u) => {
      console.log("Auth state changed:", u);

      setUser(u);
      setLoading(false);

      if (u) {
        console.log("Initializing push notifications...");
        await initPushNotifications(u.uid);
      }
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}