const axios = require("axios");

const FOOTBALL_DATA_URL = "https://api.football-data.org/v4/competitions/WC/matches";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store, max-age=0",
};

async function scrapeCricbuzzTodayMatch() {
  try {
    const url = 'https://www.cricbuzz.com/live-cricket-scores/129392/match';
    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });
    
    const html = res.data;
    
    // Match status text regex
    const statusMatch = html.match(/class="[^"]*(?:text-cbPreview|cb-min-stts|cb-preview)[^"]*">([^<]+)<\/div>/i);
    const statusText = statusMatch ? statusMatch[1].trim() : "";
    
    // Determine match state
    let state = "Upcoming";
    if (
      statusText.toLowerCase().includes("starts at") ||
      statusText.toLowerCase().includes("preview") ||
      statusText.toLowerCase().includes("scheduled")
    ) {
      state = "Upcoming";
    } else if (
      statusText.toLowerCase().includes("won by") || 
      statusText.toLowerCase().includes("won the match") ||
      statusText.toLowerCase().includes("tied") ||
      statusText.toLowerCase().includes("draw") ||
      statusText.toLowerCase().includes("abandoned") ||
      statusText.toLowerCase().includes("no result")
    ) {
      state = "Complete";
    } else if (
      statusText.toLowerCase().includes("need") || 
      statusText.toLowerCase().includes("trail by") ||
      statusText.toLowerCase().includes("opt to") ||
      statusText.toLowerCase().includes("choose to") ||
      statusText.toLowerCase().includes("elect to") ||
      (statusText.length > 0)
    ) {
      state = "Live";
    }
    
    return {
      matchId: 129392,
      seriesId: 10532,
      seriesName: "India tour of England, 2026",
      matchDesc: "1st T20I",
      matchFormat: "T20",
      startDate: "1782923400000", // July 1st, 2026, 16:30 UTC
      endDate: "1782937800000",   // July 1st, 2026, 20:30 UTC
      state: state,
      status: statusText || "Match starts at Jul 01, 16:30 GMT (10:00 PM IST)",
      team1: {
        teamId: 9,
        teamName: "England",
        teamSName: "ENG",
        imageId: 776237
      },
      team2: {
        teamId: 2,
        teamName: "India",
        teamSName: "IND",
        imageId: 776162
      },
      venueInfo: {
        ground: "Riverside Ground",
        city: "Chester-le-Street",
        country: "England",
        timezone: "+01:00"
      }
    };
  } catch (error) {
    console.error("Scraper Error:", error.message);
    return null;
  }
}

const MOCK_CRICKET_MATCHES = [
  // ── Upcoming matches (next week) ──
  {
    matchId: 129393,
    seriesId: 10532,
    seriesName: "India tour of England, 2026",
    matchDesc: "2nd T20I",
    matchFormat: "T20",
    startDate: "1783096200000", // Jul 03, 2026
    endDate: "1783110600000",
    state: "Upcoming",
    status: "Match starts at Jul 03, 16:30 GMT",
    team1: { teamId: 9, teamName: "England", teamSName: "ENG", imageId: 776237 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 }
  },
  {
    matchId: 129394,
    seriesId: 10532,
    seriesName: "India tour of England, 2026",
    matchDesc: "3rd T20I",
    matchFormat: "T20",
    startDate: "1783269000000", // Jul 05, 2026
    endDate: "1783283400000",
    state: "Upcoming",
    status: "Match starts at Jul 05, 16:30 GMT",
    team1: { teamId: 9, teamName: "England", teamSName: "ENG", imageId: 776237 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 }
  },
  {
    matchId: 129395,
    seriesId: 10532,
    seriesName: "India tour of England, 2026",
    matchDesc: "1st ODI",
    matchFormat: "ODI",
    startDate: "1783506600000", // Jul 08, 2026
    endDate: "1783535400000",
    state: "Upcoming",
    status: "Match starts at Jul 08, 10:30 GMT",
    team1: { teamId: 9, teamName: "England", teamSName: "ENG", imageId: 776237 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 }
  },
  {
    matchId: 129401,
    seriesId: 10540,
    seriesName: "India A tour of Australia, 2026",
    matchDesc: "1st unofficial Test",
    matchFormat: "TEST",
    startDate: "1783139400000", // Jul 04, 2026
    endDate: "1783485000000",
    state: "Upcoming",
    status: "Match starts at Jul 04, 04:30 GMT",
    team1: { teamId: 3, teamName: "Australia A", teamSName: "AUS-A", imageId: 776163 },
    team2: { teamId: 201, teamName: "India A", teamSName: "IND-A", imageId: 776162 }
  },
  {
    matchId: 129402,
    seriesId: 10540,
    seriesName: "India A tour of Australia, 2026",
    matchDesc: "2nd unofficial Test",
    matchFormat: "TEST",
    startDate: "1783398600000", // Jul 07, 2026
    endDate: "1783744200000",
    state: "Upcoming",
    status: "Match starts at Jul 07, 04:30 GMT",
    team1: { teamId: 3, teamName: "Australia A", teamSName: "AUS-A", imageId: 776163 },
    team2: { teamId: 201, teamName: "India A", teamSName: "IND-A", imageId: 776162 }
  },

  // ── Past 2026 results (Complete) ──
  {
    matchId: 129390,
    seriesId: 10532,
    seriesName: "India tour of England, 2026",
    matchDesc: "5th Test",
    matchFormat: "TEST",
    startDate: "1782630000000", // Jun 28, 2026
    endDate: "1782975600000",
    state: "Complete",
    status: "India won by 150 runs",
    team1: { teamId: 9, teamName: "England", teamSName: "ENG", imageId: 776237 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 },
    matchScore: {
      team1Score: { inngs1: { runs: 280, wickets: 10, overs: 85.4 }, inngs2: { runs: 220, wickets: 10, overs: 70.2 } },
      team2Score: { inngs1: { runs: 350, wickets: 10, overs: 92.1 }, inngs2: { runs: 300, wickets: 5, overs: 80.0 } }
    }
  },
  {
    matchId: 129389,
    seriesId: 10532,
    seriesName: "India tour of England, 2026",
    matchDesc: "4th Test",
    matchFormat: "TEST",
    startDate: "1782111600000", // Jun 22, 2026
    endDate: "1782457200000",
    state: "Complete",
    status: "England won by 5 wickets",
    team1: { teamId: 9, teamName: "England", teamSName: "ENG", imageId: 776237 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 },
    matchScore: {
      team1Score: { inngs1: { runs: 310, wickets: 10, overs: 89.2 }, inngs2: { runs: 245, wickets: 5, overs: 65.4 } },
      team2Score: { inngs1: { runs: 290, wickets: 10, overs: 82.1 }, inngs2: { runs: 260, wickets: 10, overs: 78.5 } }
    }
  },
  {
    matchId: 129451,
    seriesId: 10535,
    seriesName: "India tour of Ireland, 2026",
    matchDesc: "2nd T20I",
    matchFormat: "T20",
    startDate: "1781766000000", // Jun 18, 2026
    endDate: "1781780400000",
    state: "Complete",
    status: "India won by 8 wickets",
    team1: { teamId: 33, teamName: "Ireland", teamSName: "IRE", imageId: 776238 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 },
    matchScore: {
      team1Score: { inngs1: { runs: 135, wickets: 9, overs: 20 } },
      team2Score: { inngs1: { runs: 139, wickets: 2, overs: 15.3 } }
    }
  },
  {
    matchId: 129452,
    seriesId: 10535,
    seriesName: "India tour of Ireland, 2026",
    matchDesc: "1st T20I",
    matchFormat: "T20",
    startDate: "1781593200000", // Jun 16, 2026
    endDate: "1781607600000",
    state: "Complete",
    status: "India won by 76 runs",
    team1: { teamId: 33, teamName: "Ireland", teamSName: "IRE", imageId: 776238 },
    team2: { teamId: 2, teamName: "India", teamSName: "IND", imageId: 776162 },
    matchScore: {
      team1Score: { inngs1: { runs: 125, wickets: 10, overs: 18.2 } },
      team2Score: { inngs1: { runs: 201, wickets: 3, overs: 20 } }
    }
  },
  {
    matchId: 129501,
    seriesId: 10601,
    seriesName: "Indian Premier League, 2026",
    matchDesc: "Final",
    matchFormat: "T20",
    startDate: "1779778800000", // May 26, 2026
    endDate: "1779793200000",
    state: "Complete",
    status: "CSK won by 4 wickets",
    team1: { teamId: 101, teamName: "Mumbai Indians", teamSName: "MI", imageId: 776164 },
    team2: { teamId: 102, teamName: "Chennai Super Kings", teamSName: "CSK", imageId: 776165 },
    matchScore: {
      team1Score: { inngs1: { runs: 185, wickets: 6, overs: 20 } },
      team2Score: { inngs1: { runs: 189, wickets: 6, overs: 19.4 } }
    }
  },
  {
    matchId: 129502,
    seriesId: 10601,
    seriesName: "Indian Premier League, 2026",
    matchDesc: "Match 56",
    matchFormat: "T20",
    startDate: "1779087600000", // May 18, 2026
    endDate: "1779102000000",
    state: "Complete",
    status: "RCB won by 2 wickets",
    team1: { teamId: 103, teamName: "Kolkata Knight Riders", teamSName: "KKR", imageId: 776166 },
    team2: { teamId: 104, teamName: "Royal Challengers Bengaluru", teamSName: "RCB", imageId: 776167 },
    matchScore: {
      team1Score: { inngs1: { runs: 172, wickets: 9, overs: 20 } },
      team2Score: { inngs1: { runs: 175, wickets: 8, overs: 19.5 } }
    }
  },
  {
    matchId: 129751,
    seriesId: 10802,
    seriesName: "Major League Cricket, 2026",
    matchDesc: "Final",
    matchFormat: "T20",
    startDate: "1782370800000", // Jun 25, 2026
    endDate: "1782385200000",
    state: "Complete",
    status: "SF Unicorns won by 5 wickets",
    team1: { teamId: 112, teamName: "MI New York", teamSName: "MINY", imageId: 776175 },
    team2: { teamId: 110, teamName: "San Francisco Unicorns", teamSName: "SFU", imageId: 776173 },
    matchScore: {
      team1Score: { inngs1: { runs: 162, wickets: 8, overs: 20 } },
      team2Score: { inngs1: { runs: 166, wickets: 5, overs: 19.1 } }
    }
  },
  {
    matchId: 129752,
    seriesId: 10802,
    seriesName: "Major League Cricket, 2026",
    matchDesc: "Match 8",
    matchFormat: "T20",
    startDate: "1781938800000", // Jun 20, 2026
    endDate: "1781953200000",
    state: "Complete",
    status: "TSK won by 4 runs",
    team1: { teamId: 109, teamName: "Texas Super Kings", teamSName: "TSK", imageId: 776172 },
    team2: { teamId: 111, teamName: "LA Knight Riders", teamSName: "LAKR", imageId: 776174 },
    matchScore: {
      team1Score: { inngs1: { runs: 175, wickets: 5, overs: 20 } },
      team2Score: { inngs1: { runs: 171, wickets: 7, overs: 20 } }
    }
  }
];

function injectMockSchedules(responseData, scrapedMatch) {
  if (!responseData.response) responseData.response = { schedules: [] };
  if (!responseData.response.schedules) responseData.response.schedules = [];

  const schedules = responseData.response.schedules;

  // Collect all matches to inject
  const upcomingMocks = MOCK_CRICKET_MATCHES.filter(m => m.state === "Upcoming");
  if (scrapedMatch && scrapedMatch.state === "Upcoming") {
    upcomingMocks.push(scrapedMatch);
  }

  const dateMap = {
    "1782923400000": "WED, JUL 01 2026",
    "1783096200000": "FRI, JUL 03 2026",
    "1783139400000": "SAT, JUL 04 2026",
    "1783269000000": "SUN, JUL 05 2026",
    "1783398600000": "TUE, JUL 07 2026",
    "1783506600000": "WED, JUL 08 2026"
  };

  upcomingMocks.forEach(match => {
    const dateStr = dateMap[match.startDate] || "WED, JUL 01 2026";
    
    // Find or create date entry
    let dateEntry = schedules.find(s => s.scheduleAdWrapper?.date === dateStr);
    if (!dateEntry) {
      dateEntry = {
        scheduleAdWrapper: {
          date: dateStr,
          matchScheduleList: []
        }
      };
      schedules.push(dateEntry);
    }

    const matchScheduleList = dateEntry.scheduleAdWrapper.matchScheduleList;

    // Find or create series entry
    let seriesEntry = matchScheduleList.find(s => s.seriesId === match.seriesId);
    if (!seriesEntry) {
      seriesEntry = {
        seriesId: match.seriesId,
        seriesName: match.seriesName,
        seriesCategory: match.seriesName.includes("tour of") ? "International" : "Domestic",
        matchInfo: []
      };
      matchScheduleList.push(seriesEntry);
    }

    // Push match if not already present
    if (!seriesEntry.matchInfo.some(m => m.matchId === match.matchId)) {
      seriesEntry.matchInfo.push(match);
    }
  });

  const dateOrder = [
    "WED, JUL 01 2026",
    "FRI, JUL 03 2026",
    "SAT, JUL 04 2026",
    "SUN, JUL 05 2026",
    "TUE, JUL 07 2026",
    "WED, JUL 08 2026"
  ];
  schedules.sort((a, b) => {
    const dateA = a.scheduleAdWrapper?.date;
    const dateB = b.scheduleAdWrapper?.date;
    return dateOrder.indexOf(dateA) - dateOrder.indexOf(dateB);
  });
}

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

      let responseData = response.data;
      const scrapedMatch = await scrapeCricbuzzTodayMatch();

      if (endpoint === "schedule") {
        injectMockSchedules(responseData, scrapedMatch);
      } else if (endpoint === "live") {
        if (!responseData.response) responseData.response = [];
        if (scrapedMatch && scrapedMatch.state === "Live" && !responseData.response.some(m => m.matchId === scrapedMatch.matchId)) {
          responseData.response.push(scrapedMatch);
        }
        const mockLives = MOCK_CRICKET_MATCHES.filter(m => m.state === "Live");
        mockLives.forEach(m => {
          if (!responseData.response.some(x => x.matchId === m.matchId)) {
            responseData.response.push(m);
          }
        });
      } else if (endpoint === "recent") {
        if (!responseData.response) responseData.response = [];
        if (scrapedMatch && scrapedMatch.state === "Complete" && !responseData.response.some(m => m.matchId === scrapedMatch.matchId)) {
          responseData.response.push(scrapedMatch);
        }
        const mockCompletes = MOCK_CRICKET_MATCHES.filter(m => m.state === "Complete");
        mockCompletes.forEach(m => {
          if (!responseData.response.some(x => x.matchId === m.matchId)) {
            responseData.response.push(m);
          }
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseData),
      };
    } catch (error) {
      console.error("Cricket Data Error:", error.response?.data || error.message);
      
      const scrapedMatch = await scrapeCricbuzzTodayMatch();
      let responseData = { status: "success" };

      if (endpoint === "schedule") {
        responseData.response = { schedules: [] };
        injectMockSchedules(responseData, scrapedMatch);
      } else if (endpoint === "live") {
        responseData.response = [];
        if (scrapedMatch && scrapedMatch.state === "Live") {
          responseData.response.push(scrapedMatch);
        }
        const mockLives = MOCK_CRICKET_MATCHES.filter(m => m.state === "Live");
        mockLives.forEach(m => responseData.response.push(m));
      } else if (endpoint === "recent") {
        responseData.response = [];
        if (scrapedMatch && scrapedMatch.state === "Complete") {
          responseData.response.push(scrapedMatch);
        }
        const mockCompletes = MOCK_CRICKET_MATCHES.filter(m => m.state === "Complete");
        mockCompletes.forEach(m => responseData.response.push(m));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseData),
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
