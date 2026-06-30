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

const getTeamLogoUrl = (imageId) => {
  if (!imageId) return null;
  return `https://static.cricbuzz.com/a/img/v1/72x54/i1/c${imageId}/team.jpg`;
};

function getCricketScores(match) {
  let homeRuns = null;
  let awayRuns = null;
  let homeWickets = null;
  let awayWickets = null;
  let homeOvers = null;
  let awayOvers = null;

  const scoreInfo = match.matchScore || match.scorecard || {};
  const team1Score = scoreInfo.team1Score || {};
  const team2Score = scoreInfo.team2Score || {};

  const t1Inn1 = team1Score.inngs1 || {};
  const t2Inn1 = team2Score.inngs1 || {};

  if (t1Inn1.runs !== undefined) {
    homeRuns = t1Inn1.runs;
    homeWickets = t1Inn1.wickets ?? 0;
    homeOvers = t1Inn1.overs;
  }
  if (t2Inn1.runs !== undefined) {
    awayRuns = t2Inn1.runs;
    awayWickets = t2Inn1.wickets ?? 0;
    awayOvers = t2Inn1.overs;
  }

  const t1Inn2 = team1Score.inngs2;
  const t2Inn2 = team2Score.inngs2;
  if (t1Inn2 && t1Inn2.runs !== undefined) {
    homeRuns = t1Inn2.runs;
    homeWickets = t1Inn2.wickets ?? 0;
    homeOvers = t1Inn2.overs;
  }
  if (t2Inn2 && t2Inn2.runs !== undefined) {
    awayRuns = t2Inn2.runs;
    awayWickets = t2Inn2.wickets ?? 0;
    awayOvers = t2Inn2.overs;
  }

  return { homeRuns, awayRuns, homeWickets, awayWickets, homeOvers, awayOvers };
}

export function getCricketWinner(match) {
  if (match?.fixture && match.fixture.hasOwnProperty('winner')) {
    return match.fixture.winner;
  }

  const matchInfo = match?.matchInfo || match || {};
  const status = (matchInfo.status || match?.status || "").toLowerCase();
  const team1 = (matchInfo.team1?.teamName || match?.team1?.teamName || "").toLowerCase();
  const team2 = (matchInfo.team2?.teamName || match?.team2?.teamName || "").toLowerCase();

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
  const matchInfo = match.matchInfo || match;
  const matchId = matchInfo.matchId || match.matchId;
  const seriesId = matchInfo.seriesId || match.seriesId || "intl";
  const seriesName = matchInfo.seriesName || match.seriesName || "Cricket Series";

  const team1 = matchInfo.team1 || {};
  const team2 = matchInfo.team2 || {};

  const team1Name = team1.teamName || "Team A";
  const team2Name = team2.teamName || "Team B";

  const team1Logo = getTeamLogoUrl(team1.imageId);
  const team2Logo = getTeamLogoUrl(team2.imageId);

  const scores = getCricketScores(match);
  
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

  const statusText = matchInfo.status || match.status || "";
  const winner = getCricketWinner(match);

  // Determine short status
  let shortStatus = "NS";
  const state = (matchInfo.state || match.state || "").toLowerCase();
  
  if (
    state === "complete" ||
    statusText.toLowerCase().includes("won by") ||
    statusText.toLowerCase().includes("won the match") ||
    statusText.toLowerCase().includes("draw") ||
    statusText.toLowerCase().includes("tied") ||
    statusText.toLowerCase().includes("abandoned") ||
    statusText.toLowerCase().includes("no result")
  ) {
    shortStatus = "FT";
  } else if (state === "live" || state === "in progress" || state === "inprogress") {
    shortStatus = "LIVE";
  }

  const kickoffTime = matchInfo.startDate ? new Date(Number(matchInfo.startDate)) : new Date();

  return {
    fixture: {
      id: matchId,
      date: kickoffTime.toISOString(),
      winner: winner,
      status: {
        short: shortStatus,
        long: statusText || "Scheduled",
        updatedAt: new Date().toISOString(),
      },
    },
    league: {
      id: seriesId,
      name: seriesName,
      logo: null,
    },
    teams: {
      home: {
        id: team1.teamId || "home",
        name: team1Name,
        logo: team1Logo,
      },
      away: {
        id: team2.teamId || "away",
        name: team2Name,
        logo: team2Logo,
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
      statusLabel: statusText || ""
    },
    raw: match,
  };
}

function isMatchRelevant(match) {
  const matchInfo = match.matchInfo || match;
  const name = (matchInfo.seriesName || match.seriesName || "").toLowerCase();
  const team1 = (matchInfo.team1?.teamName || "").toLowerCase();
  const team2 = (matchInfo.team2?.teamName || "").toLowerCase();

  const isWomen = name.includes("women") || name.includes("womens") || name.includes("women's") ||
                  team1.includes("women") || team2.includes("women");

  if (isWomen) return false;

  const isIndiaRelated = team1 === "india" || team1.includes("india ") || team1.includes(" india") || team1.startsWith("india") ||
                         team2 === "india" || team2.includes("india ") || team2.includes(" india") || team2.startsWith("india") ||
                         name.includes("india");

  const isIpl = name.includes("ipl") || name.includes("indian premier league");
  const isWorldCup = name.includes("world cup") || name.includes("t20 world cup") || name.includes("odi world cup");

  return isIndiaRelated || isIpl || isWorldCup;
}

async function fetchMatches() {
  try {
    const [scheduleRes, liveRes, recentRes] = await Promise.all([
      api.get("/getFixtures?sport=cricket&endpoint=schedule"),
      api.get("/getFixtures?sport=cricket&endpoint=live"),
      api.get("/getFixtures?sport=cricket&endpoint=recent")
    ]);

    const schedules = scheduleRes.data?.response?.schedules || [];
    const scheduleMatches = [];
    schedules.forEach(schedule => {
      const matchScheduleList = schedule.scheduleAdWrapper?.matchScheduleList || [];
      matchScheduleList.forEach(series => {
        const seriesName = series.seriesName;
        const seriesId = series.seriesId;
        const matchInfoList = series.matchInfo || [];
        
        matchInfoList.forEach(match => {
          scheduleMatches.push({
            ...match,
            seriesName,
            seriesId
          });
        });
      });
    });

    const liveMatches = liveRes.data?.response || [];
    const recentMatches = recentRes.data?.response || [];

    const allRawMatches = [...scheduleMatches, ...liveMatches, ...recentMatches];

    const uniqueRawMatches = [];
    const seenIds = new Set();
    allRawMatches.forEach(match => {
      const matchInfo = match.matchInfo || match;
      const matchId = matchInfo.matchId || match.matchId;
      if (matchId && !seenIds.has(String(matchId))) {
        seenIds.add(String(matchId));
        uniqueRawMatches.push(match);
      }
    });

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneWeekHence = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const filtered = uniqueRawMatches.filter((match) => {
      if (!isMatchRelevant(match)) return false;

      const matchInfo = match.matchInfo || match;
      const matchDate = matchInfo.startDate ? new Date(Number(matchInfo.startDate)) : new Date();
      if (isNaN(matchDate.getTime())) return false;

      return matchDate >= oneWeekAgo && matchDate <= oneWeekHence;
    });

    return filtered.map(normalize);
  } catch (error) {
    console.error("Cricket FixturesService:", error);
    throw error;
  }
}

export async function getFixtures() {
  const fixtures = await fetchMatches();
  const now = new Date();
  const cutoff = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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
