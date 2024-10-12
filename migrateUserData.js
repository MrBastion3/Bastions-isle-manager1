const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// MySQL connection setup
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Paths to the JSON files
const reportedCheatersPath = path.join(__dirname, 'utils', 'reportedCheaters.json');
const linksFilePath = path.join(__dirname, 'links.json');  // Updated to reflect the root directory


// Function to migrate reported cheaters
const migrateReportedCheaters = async () => {
  try {
    const reportedCheatersData = fs.readFileSync(reportedCheatersPath, 'utf8');
    const reportedCheaters = JSON.parse(reportedCheatersData);

    for (const steam64Id of Object.keys(reportedCheaters)) {
      const reportReason = reportedCheaters[steam64Id];
      await pool.query(
        'INSERT INTO reported_cheaters (steam64_id, report_reason) VALUES (?, ?) ON DUPLICATE KEY UPDATE report_reason = VALUES(report_reason)',
        [steam64Id, reportReason]
      );
      console.log(`Migrated reported cheater: ${steam64Id}`);
    }

    console.log('All reported cheaters have been migrated.');
  } catch (error) {
    console.error('Error migrating reported cheaters:', error);
  }
};

// Function to migrate Steam links
const migrateSteamLinks = async () => {
  try {
    const linksData = fs.readFileSync(linksFilePath, 'utf8');
    const links = JSON.parse(linksData);

    for (const userId of Object.keys(links)) {
      const steam64Id = links[userId];
      await pool.query(
        'INSERT INTO steam_links (user_id, steam64_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE steam64_id = VALUES(steam64_id)',
        [userId, steam64Id]
      );
      console.log(`Migrated Steam link for user: ${userId}`);
    }

    console.log('All Steam links have been migrated.');
  } catch (error) {
    console.error('Error migrating Steam links:', error);
  }
};

// Run both migrations
const migrateAllData = async () => {
  await migrateReportedCheaters();
  await migrateSteamLinks();
  pool.end();
};

// Run the migration
migrateAllData();
