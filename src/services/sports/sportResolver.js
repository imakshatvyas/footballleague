import * as footballFixtures from "./football/fixtures";
import * as footballPredictions from "./football/predictions";
import * as footballLeaderboard from "./football/leaderboard";

import * as cricketFixtures from "./cricket/fixtures";
import * as cricketPredictions from "./cricket/predictions";
import * as cricketLeaderboard from "./cricket/leaderboard";

const services = {
  football: {
    config: footballFixtures.config,
    getFixtures: footballFixtures.getFixtures,
    getRecentResults: footballFixtures.getRecentResults,
    getLiveFixtures: footballFixtures.getLiveFixtures,
    getTournamentMatches: footballFixtures.getTournamentMatches,
    savePrediction: footballPredictions.savePrediction,
    getUserPredictions: footballPredictions.getUserPredictions,
    getRoomPredictions: footballPredictions.getRoomPredictions,
    getRoomLeaderboard: footballLeaderboard.getRoomLeaderboard,
  },
  cricket: {
    config: cricketFixtures.config,
    getFixtures: cricketFixtures.getFixtures,
    getRecentResults: cricketFixtures.getRecentResults,
    getLiveFixtures: cricketFixtures.getLiveFixtures,
    getTournamentMatches: cricketFixtures.getTournamentMatches,
    savePrediction: cricketPredictions.savePrediction,
    getUserPredictions: cricketPredictions.getUserPredictions,
    getRoomPredictions: cricketPredictions.getRoomPredictions,
    getRoomLeaderboard: cricketLeaderboard.getRoomLeaderboard,
  },
};

export const getSportService = (sport) => {
  const resolvedSport = sport && services[sport.toLowerCase()] ? sport.toLowerCase() : "football";
  return services[resolvedSport];
};
