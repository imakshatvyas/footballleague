import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

const getMessagesRef = (roomId) => collection(db, 'rooms', roomId, 'messages');

export const sendMessage = async (roomId, user, text) => {
  const cleanText = text.trim();

  if (!roomId || !user || !cleanText) {
    return;
  }

  await addDoc(getMessagesRef(roomId), {
    text: cleanText,
    senderId: user.uid,
    senderName: user.displayName || user.email || 'Player',
    senderPhoto: user.photoURL || '',
    createdAt: serverTimestamp(),
    type: 'text',
  });
};

export const subscribeToMessages = (roomId, callback) => {
  if (!roomId) {
    callback([]);
    return () => {};
  }

  const messagesQuery = query(getMessagesRef(roomId), orderBy('createdAt', 'asc'));

  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((messageDoc) => ({
      id: messageDoc.id,
      ...messageDoc.data(),
    }));

    callback(messages);
  });
};
