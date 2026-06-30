import { PushNotifications } from "@capacitor/push-notifications";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function initPushNotifications(userId) {
  try {
    console.log("======================================");
    console.log("Initializing Push Notifications");
    console.log("User ID:", userId);
    console.log("======================================");

    // Check current permission
    let permission = await PushNotifications.checkPermissions();

    // Ask for permission if needed
    if (permission.receive === "prompt") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    // Remove old listeners (avoids duplicates)
    await PushNotifications.removeAllListeners();

    // Registration successful
    PushNotifications.addListener("registration", async (token) => {
      console.log("======================================");
      console.log("FCM TOKEN");
      console.log(token.value);
      console.log("======================================");

      try {
        await setDoc(
          doc(db, "users", userId),
          {
            fcmToken: token.value,
            notificationsEnabled: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        console.log("✅ FCM token saved to Firestore");
      } catch (err) {
        console.error("Error saving FCM token:", err);
      }
    });

    // Registration failed
    PushNotifications.addListener("registrationError", (error) => {
      console.error("Registration Error:", error);
    });

    // Notification received while app is open
    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Notification Received:", notification);
      }
    );

    // User taps notification
    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        console.log("Notification Opened:", notification);
      }
    );

    // Register with FCM
    await PushNotifications.register();

    console.log("Push notification registration requested");
  } catch (error) {
    console.error("Push Notification Error:", error);
  }
}