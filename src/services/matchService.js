import { getSportService } from "./sports/sportResolver";

export async function getFixtures(sport) {
  const service = getSportService(sport);
  return service.getFixtures();
}

export async function getRecentResults(sport) {
  const service = getSportService(sport);
  return service.getRecentResults();
}

export async function getLiveFixtures(sport) {
  const service = getSportService(sport);
  return service.getLiveFixtures();
}

export async function getTournamentMatches(sport) {
  const service = getSportService(sport);
  return service.getTournamentMatches();
}
