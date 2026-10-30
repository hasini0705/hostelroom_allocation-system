const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'hostel.sqlite');

// Ensure database directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

/**
 * Initialize all database tables
 */
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('student', 'warden')) NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      student_id_code TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wardens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hostel_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      gender_type TEXT DEFAULT 'Co-ed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS floors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL,
      floor_number INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(block_id, floor_number),
      FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      block_id INTEGER NOT NULL,
      floor_id INTEGER NOT NULL,
      room_number TEXT NOT NULL,
      total_beds INTEGER NOT NULL DEFAULT 3,
      description TEXT,
      facilities TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(block_id, room_number),
      FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE CASCADE,
      FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS beds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      bed_number TEXT NOT NULL,
      status TEXT CHECK(status IN ('available', 'reserved', 'booked', 'maintenance')) NOT NULL DEFAULT 'available',
      reserved_by_student_id INTEGER,
      reserved_at DATETIME,
      expires_at DATETIME,
      image_url TEXT,
      UNIQUE(room_id, bed_number),
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
      FOREIGN KEY (reserved_by_student_id) REFERENCES students(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      bed_id INTEGER NOT NULL,
      room_id INTEGER NOT NULL,
      status TEXT CHECK(status IN ('confirmed', 'vacated', 'cancelled')) NOT NULL DEFAULT 'confirmed',
      booked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      vacated_at DATETIME,
      notes TEXT,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE RESTRICT,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      otp TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS captcha_challenges (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      student_id INTEGER,
      room_id INTEGER,
      bed_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
      FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL
    );
  `);

  // Safe migration for existing beds table missing image_url
  try {
    const bedColumns = db.prepare(`PRAGMA table_info(beds);`).all();
    const hasBedImg = bedColumns.some(col => col.name === 'image_url');
    if (!hasBedImg) {
      db.exec(`ALTER TABLE beds ADD COLUMN image_url TEXT;`);
      console.log('[Database] Migrated beds table: added image_url column.');
    }
  } catch (err) {
    console.error('[Migration Error]', err);
  }

  console.log('[Database] Schema initialized successfully.');
}

/**
 * Helper to run query and return all rows
 */
function query(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.all(...params);
  } catch (err) {
    console.error('[DB Query Error]', sql, params, err);
    throw err;
  }
}

/**
 * Helper to run query and return first row
 */
function queryOne(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.get(...params) || null;
  } catch (err) {
    console.error('[DB QueryOne Error]', sql, params, err);
    throw err;
  }
}

/**
 * Helper to execute INSERT, UPDATE, DELETE
 */
function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    return stmt.run(...params);
  } catch (err) {
    console.error('[DB Run Error]', sql, params, err);
    throw err;
  }
}

/**
 * Execute within a transaction
 */
function transaction(fn) {
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = fn();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Create a warden notification
 */
function createNotification({ type, title, message, studentId = null, roomId = null, bedId = null }) {
  try {
    return run(
      `INSERT INTO notifications (type, title, message, student_id, room_id, bed_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [type, title, message, studentId, roomId, bedId]
    );
  } catch (e) {
    console.error('[Create Notification Error]', e);
  }
}

module.exports = {
  db,
  initDatabase,
  query,
  queryOne,
  run,
  transaction,
  createNotification
};
