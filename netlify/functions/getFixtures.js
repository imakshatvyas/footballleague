const axios = require("axios");

const FOOTBALL_DATA_URL = "https://api.football-data.org/v4/competitions/WC/matches";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers,
      body: "",
    };
  }

  const sport = (event.queryStringParameters?.sport || "football").toLowerCase();

  if (sport === "cricket") {
    const apiKey = process.env.CRICKET_DATA_TOKEN || "f2ec402c58msh847143475af0988p149d55jsn116408629ab0";
    const endpoint = event.queryStringParameters?.endpoint || "schedule";

    let url;
    if (endpoint === "live") {
      url = "https://cricket-api-free-data.p.rapidapi.com/cricket-matches-live";
    } else if (endpoint === "recent") {
      url = "https://cricket-api-free-data.p.rapidapi.com/cricket-matches-recent";
    } else {
      url = "https://cricket-api-free-data.p.rapidapi.com/cricket-schedule";
    }

    try {
      const response = await axios.get(url, {
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "cricket-api-free-data.p.rapidapi.com"
        },
        timeout: 15000,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data),
      };
    } catch (error) {
      console.error("Cricket Data Error:", error.response?.data || error.message);
      return {
        statusCode: error.response?.status || 502,
        headers,
        body: JSON.stringify({
          success: false,
          message: error.response?.data?.message || error.message,
          response: [],
        }),
      };
    }
  } else {
    // Football
    if (!process.env.FOOTBALL_DATA_TOKEN) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Missing FOOTBALL_DATA_TOKEN environment variable.",
          matches: [],
        }),
      };
    }

    try {
      const response = await axios.get(FOOTBALL_DATA_URL, {
        headers: {
          "X-Auth-Token": process.env.FOOTBALL_DATA_TOKEN,
        },
        params: {
          season: 2026,
        },
        timeout: 10000,
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.data),
      };
    } catch (error) {
      console.error("Football Data Error:", error.response?.data || error.message);
      return {
        statusCode: error.response?.status || 502,
        headers,
        body: JSON.stringify({
          success: false,
          message: error.response?.data?.message || error.message,
          matches: [],
        }),
      };
    }
  }
};
