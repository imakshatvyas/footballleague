import { getSportService } from "./sports/sportResolver";

export const savePrediction = async (
  userId,
  roomId,
  fixtureId,
  outcome,
  homeGoals = 0,
  awayGoals = 0,
  sport = "football"
) => {
  const service = getSportService(sport);
  return service.savePrediction(userId, roomId, fixtureId, outcome, homeGoals, awayGoals);
};

export const getUserPredictions = async (userId, roomId, sport = "football") => {
  const service = getSportService(sport);
  return service.getUserPredictions(userId, roomId);
};

export const getRoomPredictions = async (roomId, sport = "football") => {
  const service = getSportService(sport);
  return service.getRoomPredictions(roomId);
};