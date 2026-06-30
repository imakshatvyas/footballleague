import axios from "axios";
import { Capacitor } from "@capacitor/core";

export const config = {
  hasScorePrediction: false,
  hasDrawOption: false,
  scoreLabel: "Runs",
  pointsInfo: "Correct winner +1"
};

const api = axios.create({
  baseURL: Capacitor.isNativePlatform()
    ? "https://footballtalks.netlify.app/.netlify/functions"
    : "/api",
});

function getCricketScores(match) {
  let homeRuns = null;
  let awayRuns = null;
  let homeWickets = null;
  let awayWickets = null;
  let homeOvers = null;
  let awayOvers = null;

  if (Array.isArray(match.score)) {
    const team1 = match.teams?.[0]?.toLowerCase();
    const team2 = match.teams?.[1]?.toLowerCase();

    match.score.forEach(inn => {
      const inningName = inn.inning?.toLowerCase() || '';
      if (team1 && inningName.includes(team1)) {
        homeRuns = inn.r;
        homeWickets = inn.w;
        homeOvers = inn.o;
      } else if (team2 && inningName.includes(team2)) {
        awayRuns = inn.r;
        awayWickets = inn.w;
        awayOvers = inn.o;
      }
    });

    // Fallback if inning names are generic or didn't match team names
    if (homeRuns === null && match.score.length > 0) {
      homeRuns = match.score[0].r;
      homeWickets = match.score[0].w;
      homeOvers = match.score[0].o;
      if (match.score.length > 1) {
        awayRuns = match.score[1].r;
        awayWickets = match.score[1].w;
        awayOvers = match.score[1].o;
      }
    }
  }

  return { homeRuns, awayRuns, homeWickets, awayWickets, homeOvers, awayOvers };
}

export function getCricketWinner(match) {
  const status = match.status?.toLowerCase() || '';
  const team1 = match.teams?.[0]?.toLowerCase();
  const team2 = match.teams?.[1]?.toLowerCase();

  if (team1 && status.includes(team1)) return 'home';
  if (team2 && status.includes(team2)) return 'away';

  if (
    status.includes('draw') ||
    status.includes('tied') ||
    status.includes('abandoned') ||
    status.includes('no result')
  ) {
    return 'draw';
  }
  return null;
}

function normalize(match) {
  const scores = getCricketScores(match);
  const winner = getCricketWinner(match);
  
  // Format score strings for Cricket
  let homeScoreStr = "";
  if (scores.homeRuns !== null) {
    homeScoreStr = String(scores.homeRuns);
    if (scores.homeWickets !== null) homeScoreStr += `/${scores.homeWickets}`;
    if (scores.homeOvers !== null) homeScoreStr += ` (${scores.homeOvers} ov)`;
  }

  let awayScoreStr = "";
  if (scores.awayRuns !== null) {
    awayScoreStr = String(scores.awayRuns);
    if (scores.awayWickets !== null) awayScoreStr += `/${scores.awayWickets}`;
    if (scores.awayOvers !== null) awayScoreStr += ` (${scores.awayOvers} ov)`;
  }

  const team1Info = match.teamInfo?.find(t => t.name === match.teams?.[0]) || match.teamInfo?.[0];
  const team2Info = match.teamInfo?.find(t => t.name === match.teams?.[1]) || match.teamInfo?.[1];

  const nameParts = match.name ? match.name.split(',') : [];
  const seriesName = nameParts.length > 2 ? nameParts.slice(2).join(',').trim() : "Cricket Match";

  const normalized = {
    fixture: {
      id: match.id,
      date: match.dateTimeGMT ? `${match.dateTimeGMT}Z` : new Date(match.date).toISOString(),
      winner: winner,
      status: {
        short: match.matchEnded ? "FT" : match.matchStarted ? "LIVE" : "NS",
        long: match.status || "Scheduled",
        updatedAt: new Date().toISOString(),
      },
    },
    league: {
      id: match.series_id || "intl",
      name: seriesName,
      logo: null,
    },
    teams: {
      home: {
        id: team1Info?.shortname || match.teams?.[0],
        name: match.teams?.[0] || "Team A",
        logo: team1Info?.img || null,
      },
      away: {
        id: team2Info?.shortname || match.teams?.[1],
        name: match.teams?.[1] || "Team B",
        logo: team2Info?.img || null,
      },
    },
    goals: {
      home: scores.homeRuns,
      away: scores.awayRuns,
    },
    displayScore: {
      duration: "REGULAR",
      fullTime: {
        home: scores.homeRuns,
        away: scores.awayRuns
      }
    },
    scoreDisplay: {
      homeScore: homeScoreStr,
      awayScore: awayScoreStr,
      statusLabel: match.status || ""
    },
    raw: match,
  };

  return normalized;
}

async function fetchMatches() {
  try {
    const res = await api.get("/getFixtures?sport=cricket");
    return (res.data.data || []).map(normalize);
  } catch (error) {
    console.error("Cricket FixturesService:", error);
    throw error;
  }
}

export async function getFixtures() {
  const fixtures = await fetchMatches();
  const now = new Date();
  const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days window for upcoming cricket

  return fixtures
    .filter((match) => {
      const kickoff = new Date(match.fixture.date);
      return (
        kickoff >= now &&
        kickoff <= cutoff &&
        match.fixture.status.short === "NS"
      );
    })
    .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
}

export async function getRecentResults() {
  const fixtures = await fetchMatches();
  return fixtures
    .filter((match) => match.fixture.status.short === "FT")
    .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
}

export async function getLiveFixtures() {
  const fixtures = await fetchMatches();
  return fixtures.filter((match) =>
    ["LIVE"].includes(match.fixture.status.short)
  );
}

export async function getTournamentMatches() {
  const fixtures = await fetchMatches();
  return fixtures.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
}
