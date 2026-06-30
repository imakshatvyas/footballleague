const axios = require("axios");

const FOOTBALL_DATA_URL = "https://api.football-data.org/v4/competitions/WC/matches";
const CRICKET_DATA_URL = "https://api.cricapi.com/v1/matches";

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
    const apiKey = process.env.CRICKET_DATA_TOKEN || "516d6b70-dbf1-48e2-8b38-cfb44f8c345c";

    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          message: "Missing CRICKET_DATA_TOKEN environment variable.",
          data: [],
        }),
      };
    }

    try {
      const response = await axios.get(CRICKET_DATA_URL, {
        params: {
          apikey: apiKey,
          offset: 0,
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
          data: [],
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
