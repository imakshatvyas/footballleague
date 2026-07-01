import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export const sendPasswordReset = (email) =>
  sendPasswordResetEmail(auth, email);

export const ensureUserDoc = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      createdAt: serverTimestamp(),
      rooms: [],
    });
  }
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const cred = await signInWithPopup(auth, provider);
    await ensureUserDoc(cred.user);
    return { user: cred.user };
  } catch (error) {
    if (error.code === 'auth/account-exists-with-different-credential') {
      const pendingCredential = GoogleAuthProvider.credentialFromError(error);
      return {
        error: 'link_required',
        email: error.customData?.email || error.email,
        pendingCredential,
      };
    }
    throw error;
  }
};

export const linkGoogleAccount = async (email, password, pendingCredential) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await linkWithCredential(cred.user, pendingCredential);
  await ensureUserDoc(cred.user);
  return cred.user;
};



export const registerUser = async (email, password, displayName) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await setDoc(doc(db, 'users', cred.user.uid), {
    uid: cred.user.uid,
    email,
    displayName,
    createdAt: serverTimestamp(),
    rooms: [],
  });
  return cred.user;
};

export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const logoutUser = () => signOut(auth);

export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
};

export const subscribeToAuth = (callback) =>
  onAuthStateChanged(auth, callback);
