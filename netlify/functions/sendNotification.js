const { messaging, db } = require("./firebaseAdmin");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const {
      userId,
      title,
      body: message,
      data = {},
    } = body;

    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          success: false,
          message: "User not found",
        }),
      };
    }

    const token = userDoc.data().fcmToken;

    if (!token) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "User has no FCM token",
        }),
      };
    }

    await messaging.send({
      token,

      notification: {
        title,
        body: message,
      },

      data,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};