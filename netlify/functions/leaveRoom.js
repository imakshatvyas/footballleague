const { db, auth } = require("./firebaseAdmin");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  try {
    const { idToken, roomId } = JSON.parse(event.body || "{}");
    if (!idToken || !roomId) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: "Room and sign-in details are required" }) };
    }

    const { uid } = await auth.verifyIdToken(idToken);
    const roomRef = db.collection("rooms").doc(roomId);
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
      const [roomSnapshot, userSnapshot] = await Promise.all([
        transaction.get(roomRef),
        transaction.get(userRef),
      ]);

      if (!roomSnapshot.exists) {
        throw new Error("Room not found");
      }

      const room = roomSnapshot.data();
      const members = Array.isArray(room.members) ? room.members : [];
      const nextMembers = members.map((member) => {
        if (member.uid !== uid) return member;
        const originalName = member.originalDisplayName || member.displayName || "Player";
        return {
          ...member,
          displayName: `(Left) ${originalName.replace(/^\(Left\)\s*/i, "")}`,
          originalDisplayName: originalName.replace(/^\(Left\)\s*/i, ""),
          left: true,
          leftAt: new Date(),
        };
      });

      const memberIds = (Array.isArray(room.memberIds) ? room.memberIds : []).filter((memberId) => memberId !== uid);
      const userRooms = Array.isArray(userSnapshot.data()?.rooms) ? userSnapshot.data().rooms : [];

      transaction.update(roomRef, { members: nextMembers, memberIds });
      transaction.set(userRef, { rooms: userRooms.filter((savedRoomId) => savedRoomId !== roomId) }, { merge: true });
    });

    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error("leaveRoom error:", error);
    const statusCode = error.code === "auth/argument-error" || error.code === "auth/id-token-expired" ? 401 : 500;
    return { statusCode, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message || "Unable to leave room" }) };
  }
};
