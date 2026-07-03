import { getSportService } from "./sports/sportResolver";

export const getRoomLeaderboard = async (roomId, sport = "football", preloadedRoom = null, preloadedPredictions = null) => {
  const service = getSportService(sport);
  return service.getRoomLeaderboard(roomId, preloadedRoom, preloadedPredictions);
};
