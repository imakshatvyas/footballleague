import axios from "axios";
import { Capacitor } from "@capacitor/core";

export const config = {
  hasScorePrediction: true,
  hasDrawOption: true,
  scoreLabel: "Scoreline",
  pointsInfo: "Winner +1, Exact score +0.5"
};

const api = axios.create({
  baseURL: Capacitor.isNativePlatform()
    ? "https://footballtalks.netlify.app/.netlify/functions"
    : "/api",
});

// ─── Status Categories ────────────────────────────────────────────
// Every status from football-data.org v4 is mapped here.
// Nothing should fall through as unknown.
const LIVE_STATUS_CODES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const FINISHED_STATUS_CODES = new Set(["FT", "AET", "PEN"]);
const UPCOMING_STATUS_CODES = new Set(["NS", "TIMED", "SCHEDULED"]);
const POSTPONED_STATUS_CODES = new Set(["PST", "CANC", "ABD", "AWD", "WO", "SUSP", "INT"]);

function statusMap(status) {
  if (!status) return "NS";
  switch (status) {
    // ── Upcoming ──
    case "SCHEDULED":
    case "TIMED":
    case "NOT_STARTED":
      return "NS";

    // ── Live ──
    case "LIVE":
    case "IN_PLAY":
    case "FIRST_HALF":
      return "1H";
    case "PAUSED":
    case "HALF_TIME":
      return "HT";
    case "SECOND_HALF":
      return "2H";
    case "EXTRA_TIME":
      return "ET";
    case "BREAK":
      return "BT";
    case "PENALTY_SHOOTOUT":
      return "P";

    // ── Finished ──
    case "FINISHED":
      return "FT";
    case "AFTER_EXTRA_TIME":
      return "AET";
    case "AFTER_PENALTY":
      return "PEN";

    // ── Other (postponed, cancelled, etc.) ──
    default:
      return status;
  }
}

function normalize(match) {
  const regularTimeScore = match.score?.regularTime || match.score?.fullTime;
  const fullTimeScore = regularTimeScore || match.score?.fullTime;

  let statusShort = statusMap(match.status);

  // ── Time-based live inference ──────────────────────────────────
  // football-data.org free tier often leaves matches as "TIMED" / "NS"
  // even after kickoff. If the API hasn't updated yet, infer live status
  // from the kickoff time. A standard match is 90 min + stoppages ~ 105 min.
  // We keep it live-inferred for up to 120 minutes after kickoff.
  let inferredElapsed = null;
  if (UPCOMING_STATUS_CODES.has(statusShort) && match.utcDate) {
    const kickoff = new Date(match.utcDate);
    const nowMs = Date.now();
    const msSinceKickoff = nowMs - kickoff.getTime();
    const minutesSince = Math.floor(msSinceKickoff / 60000);

    if (minutesSince >= 0 && minutesSince < 120) {
      // Match should be live — the API just hasn't updated status yet
      statusShort = minutesSince <= 45 ? "1H" : "HT";
      inferredElapsed = minutesSince <= 45 ? minutesSince : null;
    }
  }

  const isLive = LIVE_STATUS_CODES.has(statusShort);


  // For live matches, use the current half-time score if available
  const liveScore = isLive
    ? (match.score?.halfTime ?? match.score?.fullTime ?? null)
    : null;

  const scoreForDisplay = isLive ? liveScore : fullTimeScore;

  const normalized = {
    fixture: {
      id: match.id,
      date: match.utcDate,
      status: {
        short: statusShort,
        long: match.status,
        elapsed: match.minute ?? inferredElapsed ?? null,
        updatedAt: match.lastUpdated,
        inferred: inferredElapsed !== null, // flag so UI can show "~" prefix
      },
    },
    league: {
      id: match.competition?.id,
      name: match.competition?.name,
      logo: match.competition?.emblem,
      round: match.stage || match.group || null,
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
      home: scoreForDisplay?.home ?? null,
      away: scoreForDisplay?.away ?? null,
    },
    displayScore: {
      duration: match.score?.duration,
      fullTime: fullTimeScore,
      afterExtraTime: match.score?.extraTime,
      penalties: match.score?.penalties,
    },
    score: match.score,
    raw: match,
  };

  // Sport-agnostic scoreDisplay
  normalized.scoreDisplay = {
    homeScore:
      normalized.goals.home !== null && normalized.goals.home !== undefined
        ? String(normalized.goals.home)
        : "",
    awayScore:
      normalized.goals.away !== null && normalized.goals.away !== undefined
        ? String(normalized.goals.away)
        : "",
    statusLabel: (() => {
      if (statusShort === "FT") return "Full Time";
      if (statusShort === "AET") return "After Extra Time";
      if (statusShort === "PEN") return "Penalties";
      if (statusShort === "NS") return "";
      if (statusShort === "HT") return "Half Time";
      if (statusShort === "ET") return "Extra Time";
      if (statusShort === "BT") return "Break";
      if (statusShort === "P") return "Penalties";
      if (isLive && normalized.fixture.status.elapsed)
        return `${normalized.fixture.status.elapsed}'`;
      if (isLive) return "Live";
      return normalized.fixture.status.long || statusShort;
    })(),
  };

  return normalized;
}

// ─── Shared fetch ────────────────────────────────────────────────
let _matchCache = null;
let _matchCacheTs = 0;
const CACHE_TTL_MS = 25_000; // 25 seconds (matches 30s poll interval)

async function fetchMatches() {
  const now = Date.now();
  if (_matchCache && now - _matchCacheTs < CACHE_TTL_MS) {
    return _matchCache;
  }

  try {
    const res = await api.get("/getFixtures?sport=football");
    const raw = res.data;

    // football-data.org returns { matches: [...] }
    const matchList = Array.isArray(raw.matches) ? raw.matches : [];
    const normalized = matchList.map(normalize);

    // Dev logging
    if (import.meta.env.DEV) {
      const live = normalized.filter(m => LIVE_STATUS_CODES.has(m.fixture.status.short));
      const upcoming = normalized.filter(m => UPCOMING_STATUS_CODES.has(m.fixture.status.short));
      const finished = normalized.filter(m => FINISHED_STATUS_CODES.has(m.fixture.status.short));
      const other = normalized.filter(m =>
        !LIVE_STATUS_CODES.has(m.fixture.status.short) &&
        !UPCOMING_STATUS_CODES.has(m.fixture.status.short) &&
        !FINISHED_STATUS_CODES.has(m.fixture.status.short)
      );

      console.group("⚽ Football API");
      console.log(`Total: ${normalized.length} matches`);
      console.log(`Upcoming (NS): ${upcoming.length}`);
      console.log(`Live: ${live.length}`);
      console.log(`Finished (FT/AET/PEN): ${finished.length}`);
      if (other.length) console.warn(`Unknown status: ${other.length}`, other.map(m => m.fixture.status.short));
      if (live.length > 0) {
        live.forEach(m => {
          console.log(
            `🔴 LIVE: ${m.teams.home.name} vs ${m.teams.away.name} — ${m.fixture.status.short} ${m.fixture.status.elapsed ? m.fixture.status.elapsed + "'" : ""} — ${m.goals.home ?? "?"}:${m.goals.away ?? "?"}`
          );
        });
      }
      console.groupEnd();
    }

    _matchCache = normalized;
    _matchCacheTs = now;
    return normalized;
  } catch (error) {
    console.error("Football FixturesService fetch failed:", error?.response?.status, error?.response?.data || error.message);
    // Return cached data if available rather than throwing
    if (_matchCache) {
      console.warn("Football FixturesService: returning stale cache due to fetch error");
      return _matchCache;
    }
    throw error;
  }
}

// ─── Exported service methods ────────────────────────────────────

/**
 * Returns matches that are available for prediction:
 * - All currently LIVE matches (always included — predictions are locked but visible)
 * - Upcoming NS matches within the next 34 hours
 */
export async function getFixtures() {
  const fixtures = await fetchMatches();
  const now = new Date();
  const cutoff = new Date(now.getTime() + 34 * 60 * 60 * 1000);

  return fixtures
    .filter((match) => {
      const status = match.fixture.status.short;

      // Always include live matches
      if (LIVE_STATUS_CODES.has(status)) return true;

      // Include upcoming NS matches within the prediction window
      if (UPCOMING_STATUS_CODES.has(status)) {
        const kickoff = new Date(match.fixture.date);
        return kickoff >= now && kickoff <= cutoff;
      }

      return false;
    })
    .sort((a, b) => {
      // Live first, then by date
      const aLive = LIVE_STATUS_CODES.has(a.fixture.status.short) ? 0 : 1;
      const bLive = LIVE_STATUS_CODES.has(b.fixture.status.short) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });
}

/**
 * Returns all finished matches (FT / AET / PEN), newest first.
 */
export async function getRecentResults() {
  const fixtures = await fetchMatches();
  return fixtures
    .filter((match) => FINISHED_STATUS_CODES.has(match.fixture.status.short))
    .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
}

/**
 * Returns only currently live matches, sorted by elapsed time.
 */
export async function getLiveFixtures() {
  const fixtures = await fetchMatches();
  return fixtures
    .filter((match) => LIVE_STATUS_CODES.has(match.fixture.status.short))
    .sort((a, b) => (b.fixture.status.elapsed ?? 0) - (a.fixture.status.elapsed ?? 0));
}

/**
 * Returns ALL matches sorted by date (used by RoomPage for complete data set).
 */
export async function getTournamentMatches() {
  const fixtures = await fetchMatches();
  return fixtures.slice().sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));
}
