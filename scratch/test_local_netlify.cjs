const handler = require('../netlify/functions/getFixtures.js').handler;

async function run(endpoint) {
  const event = {
    httpMethod: 'GET',
    queryStringParameters: {
      sport: 'cricket',
      endpoint: endpoint
    }
  };
  
  const result = await handler(event);
  const data = JSON.parse(result.body);
  return data;
}

async function main() {
  console.log("Running local Netlify handler tests...");
  
  const scheduleData = await run('schedule');
  const schedules = scheduleData.response?.schedules || [];
  console.log("\n--- Schedules ---");
  console.log("Total schedule dates:", schedules.length);
  schedules.forEach(s => {
    console.log(`Date: ${s.scheduleAdWrapper?.date}`);
    s.scheduleAdWrapper?.matchScheduleList?.forEach(list => {
      list.matchInfo?.forEach(m => {
        if (m.matchId === 129392) {
          console.log(`  -> Found England vs India (ID: ${m.matchId})! State: ${m.state}, Status: ${m.status}`);
        }
      });
    });
  });

  const liveData = await run('live');
  const liveMatches = liveData.response || [];
  console.log("\n--- Live ---");
  console.log("Total live matches:", liveMatches.length);
  liveMatches.forEach(m => {
    if (m.matchId === 129392) {
      console.log(`  -> Found England vs India (ID: ${m.matchId})! State: ${m.state}, Status: ${m.status}`);
    }
  });

  const recentData = await run('recent');
  const recentMatches = recentData.response || [];
  console.log("\n--- Recent ---");
  console.log("Total recent matches:", recentMatches.length);
  recentMatches.forEach(m => {
    if (m.matchId === 129392) {
      console.log(`  -> Found England vs India (ID: ${m.matchId})! State: ${m.state}, Status: ${m.status}`);
    }
  });
}

main();
