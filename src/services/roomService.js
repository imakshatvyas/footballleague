import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  setDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

export const createRoom = async (userId, displayName, roomName, sport = 'football') => {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();

  // Create room
  const ref = await addDoc(collection(db, 'rooms'), {
    name: roomName,
    code,
    createdBy: userId,
    sport: sport.toLowerCase(),
    members: [
      {
        uid: userId,
        displayName,
        joinedAt: new Date(),
      },
    ],
    memberIds: [userId],
    createdAt: serverTimestamp(),
  });

  // Create or update user document safely
  await setDoc(
    doc(db, 'users', userId),
    {
      rooms: arrayUnion(ref.id),
    },
    { merge: true }
  );

  return {
    id: ref.id,
    code,
  };
};

export const joinRoom = async (userId, displayName, code) => {
  const q = query(
    collection(db, 'rooms'),
    where('code', '==', code.toUpperCase())
  );

  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Room not found');
  }

  const roomDoc = snap.docs[0];
  const data = roomDoc.data();

  // Already joined
  if (data.memberIds?.includes(userId)) {
    return {
      id: roomDoc.id,
      ...data,
    };
  }

  // Re-activate a previously left member in place, so the room roster does not
  // accumulate duplicate entries when someone comes back.
  const existingMember = (data.members || []).find((member) => member.uid === userId);
  const members = existingMember
    ? (data.members || []).map((member) => (
      member.uid === userId
        ? {
            ...member,
            displayName: member.originalDisplayName || displayName,
            originalDisplayName: member.originalDisplayName || displayName,
            left: false,
            leftAt: null,
          }
        : member
    ))
    : [
        ...(data.members || []),
        {
          uid: userId,
          displayName,
          originalDisplayName: displayName,
          joinedAt: new Date(),
          left: false,
        },
      ];

  // Update room members
  await updateDoc(doc(db, 'rooms', roomDoc.id), {
    members,
    memberIds: arrayUnion(userId),
  });

  // Create or update user document safely
  await setDoc(
    doc(db, 'users', userId),
    {
      rooms: arrayUnion(roomDoc.id),
    },
    { merge: true }
  );

  return {
    id: roomDoc.id,
    ...data,
  };
};

export const getRoom = async (roomId) => {
  const snap = await getDoc(doc(db, 'rooms', roomId));

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
};

export const getUserRooms = async (userId) => {
  const userSnap = await getDoc(doc(db, 'users', userId));

  if (!userSnap.exists()) return [];

  const roomIds = userSnap.data().rooms || [];

  const rooms = await Promise.all(
    roomIds.map((id) => getDoc(doc(db, 'rooms', id)))
  );

  return rooms
    .filter((room) => room.exists())
    .map((room) => ({
      id: room.id,
      ...room.data(),
    }));
};

export const getRoomMembers = async (roomId) => {
  const snap = await getDoc(doc(db, 'rooms', roomId));

  if (!snap.exists()) return [];

  return snap.data().members || [];
};

export const leaveRoom = async (roomId, userId) => {
  const roomRef = doc(db, 'rooms', roomId);
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    throw new Error('Room not found');
  }

  const members = roomSnap.data().members || [];
  const nextMembers = members.map((member) => {
    if (member.uid !== userId) return member;

    const originalDisplayName = member.originalDisplayName || member.displayName || 'Player';
    return {
      ...member,
      displayName: `(left) ${originalDisplayName.replace(/^\(left\)\s*/i, '')}`,
      originalDisplayName: originalDisplayName.replace(/^\(left\)\s*/i, ''),
      left: true,
      leftAt: new Date(),
    };
  });

  // Keep a marked record in the room roster while removing the room from the
  // former member's dashboard.
  const batch = writeBatch(db);
  batch.update(roomRef, {
    members: nextMembers,
    memberIds: arrayRemove(userId),
  });

  batch.set(
    doc(db, 'users', userId),
    {
      rooms: arrayRemove(roomId),
    },
    { merge: true }
  );

  await batch.commit();
};
