const { db } = require("./firebaseAdmin");
const { getAuth } = require("firebase-admin/auth");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: "Method not allowed" }),
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: "Request body is empty" }),
      };
    }

    const {
      idToken,
      userId,
      displayName,
      roomId,
      fixtureId,
      outcome,
      homeGoals = 0,
      awayGoals = 0,
      extraTimeWinner = null,
    } = JSON.parse(event.body);

    // Verify the Firebase ID token so only authenticated users can write
    const auth = getAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (authErr) {
      return {
        statusCode: 401,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: "Unauthorized" }),
      };
    }

    // Ensure the userId in the request matches the verified token
    if (decodedToken.uid !== userId) {
      return {
        statusCode: 403,
        headers: CORS_HEADERS,
        body: JSON.stringify({ success: false, error: "Forbidden" }),
      };
    }

    const docId = `${userId}_${roomId}_${fixtureId}`;
    await db.collection("predictions").doc(docId).set(
      {
        userId,
        displayName,
        roomId,
        fixtureId: String(fixtureId),
        prediction: outcome,
        predictedHomeGoals: Number(homeGoals),
        predictedAwayGoals: Number(awayGoals),
        extraTimeWinner: extraTimeWinner || null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("savePrediction error:", err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
