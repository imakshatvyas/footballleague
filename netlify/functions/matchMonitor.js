const { schedule } = require("@netlify/functions");
const { db, messaging } = require("./firebaseAdmin");
const axios = require("axios");

async function sendMulticastNotification(tokens, title, body, data = {}) {
  if (!tokens || tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    token,
    notification: {
      title,
      body,
    },
    data,
  }));

  try {
    const response = await Promise.allSettled(
      messages.map((msg) => messaging.send(msg))
    );
    const successes = response.filter((r) => r.status === "fulfilled").length;
    const failures = response.filter((r) => r.status === "rejected").length;
    console.log(`FCM Delivery Report: ${successes} success, ${failures} failures`);
  } catch (err) {
    console.error("FCM Send Error:", err);
  }
}

async function getTokensForSport(sport) {
  try {
    // 1. Get all rooms with matching sport
    const roomsSnap = await db
      .collection("rooms")
      .where("sport", "==", sport.toLowerCase())
      .get();

    if (roomsSnap.empty) return [];

    const userIds = new Set();
    roomsSnap.docs.forEach((doc) => {
      const data = doc.data();
      const memberIds = data.memberIds || [];
      memberIds.forEach((uid) => userIds.add(uid));
    });

    if (userIds.size === 0) return [];

    // 2. Query FCM tokens for all matched users
    const tokens = [];
    const userIdsArray = Array.from(userIds);
    
    // Firestore in-queries support up to 30 items. Let's query in batches of 30.
    const batchSize = 30;
    for (let i = 0; i < userIdsArray.length; i += batchSize) {
      const batch = userIdsArray.slice(i, i + batchSize);
      const usersSnap = await db
        .collection("users")
        .where("__name__", "in", batch)
        .get();

      usersSnap.docs.forEach((doc) => {
        const uData = doc.data();
        if (uData.fcmToken) {
          tokens.push(uData.fcmToken);
        }
      });
    }

    return tokens;
  } catch (err) {
    console.error("Error retrieving tokens for sport:", err);
    return [];
  }
}

function statusMapFootball(status) {
  switch (status) {
    case "SCHEDULED":
    case "TIMED":
      return "NS";
    case "LIVE":
      return "LIVE";
    case "IN_PLAY":
      return "LIVE";
    case "PAUSED":
      return "HT"; // Half time
    case "FINISHED":
      return "FT";
    default:
      return status;
  }
}

function normalizeFootball(match) {
  const score = match.score?.regularTime || match.score?.fullTime || {};
  return {
    id: `football_${match.id}`,
    sport: "football",
    date: match.utcDate,
    status: statusMapFootball(match.status),
    statusLong: match.status,
    homeTeam: match.homeTeam?.name || "Home Team",
    awayTeam: match.awayTeam?.name || "Away Team",
    homeScore: score.home ?? null,
    awayScore: score.away ?? null,
    duration: match.score?.duration || "REGULAR",
    rawScore: match.score || {},
  };
}

function normalizeCricket(match) {
  const matchInfo = match.matchInfo || match;
  const matchId = `cricket_${matchInfo.matchId || match.matchId}`;
  const seriesName = matchInfo.seriesName || match.seriesName || "";

  if (
    seriesName.toLowerCase().includes("mlc") ||
    seriesName.toLowerCase().includes("major league cricket")
  ) {
    return null;
  }

  const team1 = matchInfo.team1?.teamName || "Team A";
  const team2 = matchInfo.team2?.teamName || "Team B";

  const scoreInfo = match.matchScore || match.scorecard || {};
  const team1Score = scoreInfo.team1Score || {};
  const team2Score = scoreInfo.team2Score || {};
  const t1runs = team1Score.inngs1?.runs ?? null;
  const t2runs = team2Score.inngs1?.runs ?? null;

  const state = (matchInfo.state || match.state || "").toLowerCase();
  let status = "NS";
  if (state === "complete") {
    status = "FT";
  } else if (
    state === "live" ||
    state === "in progress" ||
    state === "inprogress"
  ) {
    status = "LIVE";
  }

  return {
    id: matchId,
    sport: "cricket",
    date: matchInfo.startDate
      ? new Date(Number(matchInfo.startDate)).toISOString()
      : new Date().toISOString(),
    status: status,
    statusLong: matchInfo.status || match.status || "Scheduled",
    homeTeam: team1,
    awayTeam: team2,
    homeScore: t1runs,
    awayScore: t2runs,
  };
}

const monitorHandler = async (event) => {
  try {
    const siteUrl = process.env.URL || "https://footballtalks.netlify.app";
    console.log(`Monitor started. Target API site URL: ${siteUrl}`);

    // 1. Fetch Football Matches
    let normalizedFootballMatches = [];
    try {
      const fbResponse = await axios.get(
        `${siteUrl}/.netlify/functions/getFixtures?sport=football`,
        { timeout: 10000 }
      );
      const rawFootballMatches = fbResponse.data.matches || [];
      normalizedFootballMatches = rawFootballMatches.map(normalizeFootball);
    } catch (fbErr) {
      console.error("Monitor failed to fetch football matches:", fbErr.message);
    }

    // 2. Fetch Cricket Matches
    let normalizedCricketMatches = [];
    try {
      const scheduleRes = await axios.get(
        `${siteUrl}/.netlify/functions/getFixtures?sport=cricket&endpoint=schedule`,
        { timeout: 10000 }
      );
      const liveRes = await axios.get(
        `${siteUrl}/.netlify/functions/getFixtures?sport=cricket&endpoint=live`,
        { timeout: 10000 }
      );
      const recentRes = await axios.get(
        `${siteUrl}/.netlify/functions/getFixtures?sport=cricket&endpoint=recent`,
        { timeout: 10000 }
      );

      const rawCricket = [
        ...(scheduleRes.data?.response?.schedules || []).flatMap(
          (s) => s.scheduleAdWrapper?.matchScheduleList?.flatMap((l) => l.matchInfo) || []
        ),
        ...(liveRes.data?.response || []),
        ...(recentRes.data?.response || []),
      ].filter(Boolean);

      // Remove duplicates
      const uniqueCricket = [];
      const seen = new Set();
      rawCricket.forEach((m) => {
        const id = m.matchInfo?.matchId || m.matchId;
        if (id && !seen.has(id)) {
          seen.add(id);
          uniqueCricket.push(m);
        }
      });

      normalizedCricketMatches = uniqueCricket
        .map(normalizeCricket)
        .filter(Boolean);
    } catch (cricErr) {
      console.error("Monitor failed to fetch cricket matches:", cricErr.message);
    }

    const allMatches = [
      ...normalizedFootballMatches,
      ...normalizedCricketMatches,
    ];
    console.log(`Processing total ${allMatches.length} fixtures...`);

    // Cache user tokens by sport to avoid repeat queries
    const tokensCache = {};

    for (const match of allMatches) {
      const docRef = db.collection("tracked_fixtures").doc(match.id);
      const docSnap = await docRef.get();

      if (!tokensCache[match.sport]) {
        tokensCache[match.sport] = await getTokensForSport(match.sport);
      }
      const tokens = tokensCache[match.sport];

      if (tokens.length === 0) continue;

      if (!docSnap.exists) {
        // EVENT: Match Listed
        console.log(`New match listed: ${match.homeTeam} vs ${match.awayTeam}`);
        await sendMulticastNotification(
          tokens,
          `New Match Listed! 📅`,
          `${match.homeTeam} vs ${match.awayTeam} is now open for predictions. Get your picks in!`,
          { matchId: match.id, sport: match.sport, type: "match_listed" }
        );

        await docRef.set({
          ...match,
          remindersSent: { sixHour: false, threeHour: false, oneHour: false },
          startedNotificationSent: false,
          halfTimeNotificationSent: false,
          extraTimeNotificationSent: false,
          penaltiesNotificationSent: false,
          fullTimeNotificationSent: false,
          updatedAt: new Date().toISOString(),
        });
        continue;
      }

      const cached = docSnap.data();
      const now = new Date();
      const kickoff = new Date(match.date);
      const diffMs = kickoff - now;
      const diffHours = diffMs / (1000 * 60 * 60);

      // Check countdown reminders
      let reminderLabel = "";
      const remindersSent = cached.remindersSent || {
        sixHour: false,
        threeHour: false,
        oneHour: false,
      };

      if (match.status === "NS") {
        if (diffHours <= 1.05 && diffHours >= 0.0 && !remindersSent.oneHour) {
          reminderLabel = "1 hour";
          remindersSent.oneHour = true;
        } else if (
          diffHours <= 3.05 &&
          diffHours >= 2.0 &&
          !remindersSent.threeHour
        ) {
          reminderLabel = "3 hours";
          remindersSent.threeHour = true;
        } else if (
          diffHours <= 6.05 &&
          diffHours >= 5.0 &&
          !remindersSent.sixHour
        ) {
          reminderLabel = "6 hours";
          remindersSent.sixHour = true;
        }

        if (reminderLabel) {
          console.log(`Sending kickoff reminder (${reminderLabel}) for ${match.homeTeam} vs ${match.awayTeam}`);
          await sendMulticastNotification(
            tokens,
            `Match starts in ${reminderLabel}! ⏰`,
            `Don't forget to submit/edit your predictions for ${match.homeTeam} vs ${match.awayTeam}!`,
            { matchId: match.id, sport: match.sport, type: "reminder" }
          );
          await docRef.set({ remindersSent }, { merge: true });
        }
      }

      // Check live status changes
      let statusTitle = "";
      let statusBody = "";
      const updateFields = {};

      if (
        match.status === "LIVE" &&
        cached.status === "NS" &&
        !cached.startedNotificationSent
      ) {
        statusTitle = "Match Started! ⚔️";
        statusBody = `The match between ${match.homeTeam} and ${match.awayTeam} has kicked off!`;
        updateFields.startedNotificationSent = true;
      } else if (
        match.status === "HT" &&
        cached.status !== "HT" &&
        !cached.halfTimeNotificationSent
      ) {
        statusTitle = "Half Time! ⏸️";
        statusBody = `Half Time whistle! Score: ${match.homeTeam} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam}`;
        updateFields.halfTimeNotificationSent = true;
      } else if (
        match.duration === "EXTRA_TIME" &&
        cached.duration !== "EXTRA_TIME" &&
        !cached.extraTimeNotificationSent
      ) {
        statusTitle = "Extra Time! ⏱️";
        statusBody = `We're heading into extra time for ${match.homeTeam} vs ${match.awayTeam}!`;
        updateFields.extraTimeNotificationSent = true;
      } else if (
        match.duration === "PENALTY_SHOOTOUT" &&
        cached.duration !== "PENALTY_SHOOTOUT" &&
        !cached.penaltiesNotificationSent
      ) {
        statusTitle = "Penalty Shootout! 🎯";
        statusBody = `It will be decided on penalties! ${match.homeTeam} vs ${match.awayTeam}`;
        updateFields.penaltiesNotificationSent = true;
      } else if (
        match.status === "FT" &&
        cached.status !== "FT" &&
        !cached.fullTimeNotificationSent
      ) {
        statusTitle = "Full Time! 🏁";
        statusBody = `Whistle blew! Final Score: ${match.homeTeam} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${match.awayTeam}`;
        updateFields.fullTimeNotificationSent = true;
      }

      if (statusTitle) {
        console.log(`Sending state change: ${statusTitle} for ${match.id}`);
        await sendMulticastNotification(tokens, statusTitle, statusBody, {
          matchId: match.id,
          sport: match.sport,
          type: "state_change",
        });
        await docRef.set(updateFields, { merge: true });
      }

      // Check Goals (for live Football matches only)
      if (
        match.sport === "football" &&
        match.status === "LIVE" &&
        cached.status === "LIVE"
      ) {
        const cachedHome = cached.homeScore ?? 0;
        const cachedAway = cached.awayScore ?? 0;
        const currentHome = match.homeScore ?? 0;
        const currentAway = match.awayScore ?? 0;

        let goalTitle = "";
        let goalBody = "";

        if (currentHome > cachedHome) {
          goalTitle = "GOAL Scored! ⚽";
          goalBody = `Goal! ${match.homeTeam} scores! New score: ${match.homeTeam} [${currentHome}] - ${currentAway} ${match.awayTeam}`;
        } else if (currentAway > cachedAway) {
          goalTitle = "GOAL Scored! ⚽";
          goalBody = `Goal! ${match.awayTeam} scores! New score: ${match.homeTeam} ${currentHome} - [${currentAway}] ${match.awayTeam}`;
        }

        if (goalTitle) {
          console.log(`Goal Alert: ${goalBody}`);
          await sendMulticastNotification(tokens, goalTitle, goalBody, {
            matchId: match.id,
            sport: match.sport,
            type: "goal_alert",
          });
        }
      }

      // Always save current state update
      await docRef.set(
        {
          status: match.status,
          statusLong: match.statusLong,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          duration: match.duration || "REGULAR",
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: "Processed match updates" }),
    };
  } catch (globalErr) {
    console.error("Match Monitor Global Error:", globalErr);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: globalErr.message }),
    };
  }
};

exports.handler = schedule("*/5 * * * *", monitorHandler);
