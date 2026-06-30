import { getSportService } from "./sports/sportResolver";

export const getRoomLeaderboard = async (roomId, sport = "football") => {
  const service = getSportService(sport);
  return service.getRoomLeaderboard(roomId);
};
