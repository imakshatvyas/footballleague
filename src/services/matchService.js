import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

function statusMap(status) {
  switch (status) {
    case "SCHEDULED":
    case "TIMED":
      return "NS";

    case "LIVE":
      return "LIVE";

    case "IN_PLAY":
      return "1H";

    case "PAUSED":
      return "HT";

    case "FINISHED":
      return "FT";

    default:
      return status;
  }
}

function normalize(match) {
  return {
    fixture: {
      id: match.id,
      date: match.utcDate,
      status: {
        short: statusMap(match.status),
        long: match.status,
        updatedAt: match.lastUpdated,
      },
    },

    league: {
      id: match.competition?.id,
      name: match.competition?.name,
      logo: match.competition?.emblem,
    },

    teams: {
      home: {
        id: match.homeTeam?.id,
        name: match.homeTeam?.name,
        logo: match.homeTeam?.crest,
      },

      away: {
        id: match.awayTeam?.id,
        name: match.awayTeam?.name,
        logo: match.awayTeam?.crest,
      },
    },

    goals: {
      home: match.score?.fullTime?.home,
      away: match.score?.fullTime?.away,
    },

    score: match.score,

    raw: match,
  };
}

async function fetchMatches() {
  try {
    const res = await api.get("/getFixtures");

    return (res.data.matches || []).map(normalize);
  } catch (error) {
    console.error("MatchService:", error);
    return [];
  }
}

/* =======================================================
   UPCOMING FIXTURES (Next 34 Hours)
======================================================= */

export async function getFixtures() {
  const fixtures = await fetchMatches();

  const now = new Date();
  const cutoff = new Date(now.getTime() + 34 * 60 * 60 * 1000);

  return fixtures
    .filter((match) => {
      const kickoff = new Date(match.fixture.date);

      return (
        kickoff >= now &&
        kickoff <= cutoff &&
        match.fixture.status.short === "NS"
      );
    })
    .sort(
      (a, b) =>
        new Date(a.fixture.date) -
        new Date(b.fixture.date)
    );
}

/* =======================================================
   RESULTS (Newest First)
======================================================= */

export async function getRecentResults() {
  const fixtures = await fetchMatches();

  return fixtures
    .filter(
      (match) =>
        match.fixture.status.short === "FT"
    )
    .sort(
      (a, b) =>
        new Date(b.fixture.date) -
        new Date(a.fixture.date)
    );
}

/* =======================================================
   LIVE MATCHES
======================================================= */

export async function getLiveFixtures() {
  const fixtures = await fetchMatches();

  return fixtures.filter((match) =>
    ["LIVE", "1H", "HT"].includes(
      match.fixture.status.short
    )
  );
}

/* =======================================================
   TOURNAMENT STAGE
======================================================= */

export async function getTournamentMatches() {
  const fixtures = await fetchMatches();

  return fixtures.sort(
    (a, b) =>
      new Date(a.fixture.date) -
      new Date(b.fixture.date)
  );
}