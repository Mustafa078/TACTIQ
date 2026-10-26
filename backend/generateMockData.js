const fs = require("fs");

const playersHome = [
  "Martin Ødegaard",
  "Bukayo Saka",
  "Declan Rice",
  "William Saliba",
  "Kai Havertz",
  "Gabriel Martinelli",
];
const playersAway = [
  "James Maddison",
  "Son Heung-min",
  "Dejan Kulusevski",
  "Cristian Romero",
  "Yves Bissouma",
  "Pedro Porro",
];
const eventTypes = [
  "pass",
  "pressure",
  "tackle",
  "shot",
  "carry",
  "interception",
];
const zones = [
  "Defensive Third",
  "Midfield Third",
  "Attacking Third",
  "Penalty Area",
];

function generateMatchEvents(count = 100) {
  const events = [];

  for (let i = 1; i <= count; i++) {
    const isHome = Math.random() > 0.45;
    const team = isHome ? "Arsenal" : "Tottenham";
    const playerPool = isHome ? playersHome : playersAway;
    const player = playerPool[Math.floor(Math.random() * playerPool.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const minute = Math.floor((i / count) * 90) + 1;

    let eventDetails = {
      event_id: i,
      timestamp: `${minute < 10 ? "0" + minute : minute}:${Math.floor(
        Math.random() * 60,
      )
        .toString()
        .padStart(2, "0")}`,
      period: minute <= 45 ? "1st Half" : "2nd Half",
      team: team,
      player: player,
      event_type: eventType,
      zone: zones[Math.floor(Math.random() * zones.length)],
    };

    // Add metric-specific attributes
    if (eventType === "pass") {
      eventDetails.pass_distance_m = parseFloat(
        (Math.random() * 30 + 5).toFixed(1),
      );
      eventDetails.pass_accuracy = parseFloat(
        (Math.random() * 0.3 + 0.7).toFixed(2),
      );
      eventDetails.pass_difficulty_rating = parseFloat(
        (Math.random() * 4 + 6).toFixed(1),
      );
      eventDetails.success = Math.random() > 0.2;
    } else if (eventType === "pressure") {
      eventDetails.pressure_intensity_rating = parseFloat(
        (Math.random() * 4 + 6).toFixed(1),
      );
    } else if (eventType === "shot") {
      eventDetails.ball_speed_kmh = parseFloat(
        (Math.random() * 40 + 70).toFixed(1),
      );
      eventDetails.xg = parseFloat((Math.random() * 0.5 + 0.05).toFixed(2));
      eventDetails.goal = Math.random() > 0.85;
    }

    events.push(eventDetails);
  }

  return {
    match_id: "SYN-PL-2026-NLD01",
    fixture: "Arsenal vs Tottenham Hotspur",
    competition: "Premier League (Synthetic Feed)",
    total_events_count: count,
    events: events,
  };
}

// Write generated cluster to matchData.json
const dataset = generateMatchEvents(100);
fs.writeFileSync("./matchData.json", JSON.stringify(dataset, null, 2));
console.log(
  `Successfully generated ${dataset.events.length} synthetic match events in matchData.json!`,
);
