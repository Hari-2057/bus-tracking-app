const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function openDb() {
  return open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });
}

async function initDb() {
  const db = await openDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS bus_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      busId TEXT,
      lat REAL,
      lng REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('Database initialized');
  return db;
}

module.exports = { openDb, initDb };
