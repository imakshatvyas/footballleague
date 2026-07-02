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
        // Only run native push notification registration on Android/iOS Capacitor environments
        import("@capacitor/core").then(({ Capacitor }) => {
          if (Capacitor.isNativePlatform()) {
            console.log("Initializing push notifications on native platform...");
            initPushNotifications(u.uid);
          } else {
            console.log("Push notifications skipped (running in web browser context)");
          }
        });
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