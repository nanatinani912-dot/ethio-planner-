/**
 * ═══════════════════════════════════════════════════════════
 *  ETHIO PLANNER — backend/database.js
 *  Full backend data layer (Node.js / Express + SQLite)
 *
 *  To run:
 *    cd backend
 *    npm install express better-sqlite3 cors
 *    node database.js
 * ═══════════════════════════════════════════════════════════
 */

const express    = require('express');
const Database   = require('better-sqlite3');
const cors       = require('cors');
const path       = require('path');
const app        = express();
const PORT       = 3001;

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ── Open / create SQLite database ──────────────────────────
const db = new Database(path.join(__dirname, 'ethioplanner.db'));

// ── Create tables on first run ──────────────────────────────
db.exec(`
  -- Users / Profiles
  CREATE TABLE IF NOT EXISTS profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    UNIQUE,
    full_name   TEXT,
    bio         TEXT,
    phone       TEXT,
    dob         TEXT,
    gender      TEXT,
    language    TEXT    DEFAULT 'en',
    avatar_b64  TEXT,
    cover_b64   TEXT,
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now'))
  );

  -- Calendar Events / Reminders
  CREATE TABLE IF NOT EXISTS events (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id   INTEGER NOT NULL DEFAULT 1,
    date_key     TEXT    NOT NULL,            -- YYYY-MM-DD (Gregorian)
    title        TEXT    NOT NULL,
    sticker      TEXT,
    reminder_time TEXT,
    alarm        INTEGER DEFAULT 0,           -- 0/1
    repeat_type  TEXT    DEFAULT 'never',     -- never|daily|weekly|custom
    custom_days  TEXT,                        -- JSON array of day numbers
    cal_type     TEXT    DEFAULT 'gregorian', -- gregorian|ethiopian
    created_at   TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Daily Planner Data
  CREATE TABLE IF NOT EXISTS daily_plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    date_key    TEXT    NOT NULL,
    goals       TEXT,      -- JSON array
    todo        TEXT,      -- JSON array
    schedule    TEXT,      -- JSON object {time: activity}
    tomorrow    TEXT,      -- JSON array
    notes       TEXT,
    mood        TEXT,
    saved_at    TEXT    DEFAULT (datetime('now')),
    UNIQUE(profile_id, date_key),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Weekly Planner Data
  CREATE TABLE IF NOT EXISTS weekly_plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    week_key    TEXT    NOT NULL,  -- YYYY-MM-DD (Monday of week)
    goals       TEXT,              -- JSON array
    priorities  TEXT,              -- JSON array
    todo        TEXT,              -- JSON array
    schedule    TEXT,              -- JSON nested object
    saved_at    TEXT    DEFAULT (datetime('now')),
    UNIQUE(profile_id, week_key),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Monthly Planner Data
  CREATE TABLE IF NOT EXISTS monthly_plans (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    month_key   TEXT    NOT NULL,   -- YYYY-MM
    notes       TEXT,
    saved_at    TEXT    DEFAULT (datetime('now')),
    UNIQUE(profile_id, month_key),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- My Files (saved plans index)
  CREATE TABLE IF NOT EXISTS my_files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    plan_type   TEXT    NOT NULL,    -- daily|weekly|monthly
    date_label  TEXT    NOT NULL,
    preview     TEXT,
    pinned      INTEGER DEFAULT 0,
    saved_at    TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Period / Cycle Tracker
  CREATE TABLE IF NOT EXISTS cycle_log (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    start_date  TEXT    NOT NULL,
    end_date    TEXT,
    cycle_len   INTEGER DEFAULT 28,
    next_date   TEXT,
    ovul_date   TEXT,
    month_label TEXT,
    saved_at    TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Period tracker grid cells
  CREATE TABLE IF NOT EXISTS tracker_cells (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    cell_key    TEXT    NOT NULL,   -- YYYY_MM_DD
    flow        TEXT    DEFAULT '',  -- ''|flow-light|flow-medium|flow-heavy|flow-ovulation
    pain        TEXT    DEFAULT '',  -- ''|⚡|⚡⚡|⚡⚡⚡
    UNIQUE(profile_id, cell_key),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Period monthly notes
  CREATE TABLE IF NOT EXISTS period_notes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    month_num   INTEGER NOT NULL,  -- 1-12
    note        TEXT,
    UNIQUE(profile_id, month_num),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Holiday photos
  CREATE TABLE IF NOT EXISTS holiday_photos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    holiday_key TEXT    NOT NULL,
    photo_b64   TEXT    NOT NULL,
    added_at    TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Achievements / Badges
  CREATE TABLE IF NOT EXISTS achievements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    badge_id    TEXT    NOT NULL,
    unlocked_at TEXT    DEFAULT (datetime('now')),
    UNIQUE(profile_id, badge_id),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Custom Rewards
  CREATE TABLE IF NOT EXISTS custom_rewards (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    goal_name   TEXT    NOT NULL,
    reward_name TEXT    NOT NULL,
    created_at  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Productivity scores
  CREATE TABLE IF NOT EXISTS productivity (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1,
    date_key    TEXT    NOT NULL,
    daily_pct   INTEGER DEFAULT 0,
    weekly_pct  INTEGER DEFAULT 0,
    monthly_pct INTEGER DEFAULT 0,
    overall_pct INTEGER DEFAULT 0,
    UNIQUE(profile_id, date_key),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- App Settings
  CREATE TABLE IF NOT EXISTS settings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1 UNIQUE,
    theme       TEXT    DEFAULT 'light',
    language    TEXT    DEFAULT 'en',
    primary_cal TEXT    DEFAULT 'eth',
    pub_holidays    INTEGER DEFAULT 1,
    orth_holidays   INTEGER DEFAULT 1,
    mus_holidays    INTEGER DEFAULT 1,
    holiday_notifs  INTEGER DEFAULT 1,
    fingerprint     INTEGER DEFAULT 0,
    face_id         INTEGER DEFAULT 0,
    cloud_sync      INTEGER DEFAULT 0,
    password_hash   TEXT,
    updated_at      TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );

  -- Login / streak tracking
  CREATE TABLE IF NOT EXISTS streaks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id  INTEGER NOT NULL DEFAULT 1 UNIQUE,
    login_streak    INTEGER DEFAULT 0,
    plan_streak     INTEGER DEFAULT 0,
    last_login_date TEXT,
    last_plan_date  TEXT,
    FOREIGN KEY(profile_id) REFERENCES profiles(id)
  );
`);

// ── Seed default profile if empty ──────────────────────────
const profileCount = db.prepare('SELECT COUNT(*) as c FROM profiles').get();
if(profileCount.c === 0){
  db.prepare(`INSERT INTO profiles (username, full_name, language) VALUES (?,?,?)`).run('user','','en');
  db.prepare(`INSERT INTO settings (profile_id) VALUES (1)`).run();
  db.prepare(`INSERT INTO streaks  (profile_id) VALUES (1)`).run();
}

/* ════════════════════════════════════════════════════════
   HELPER — JSON parse safely
════════════════════════════════════════════════════════ */
function jp(v){ try{ return v?JSON.parse(v):null; }catch{ return null; } }

/* ════════════════════════════════════════════════════════
   ROUTES
════════════════════════════════════════════════════════ */

// ── PROFILE ──────────────────────────────────────────────
app.get('/api/profile', (req, res) => {
  const row = db.prepare('SELECT * FROM profiles WHERE id=1').get();
  res.json(row);
});
app.put('/api/profile', (req, res) => {
  const {full_name,username,bio,phone,dob,gender,language,avatar_b64,cover_b64}=req.body;
  db.prepare(`UPDATE profiles SET full_name=?,username=?,bio=?,phone=?,dob=?,gender=?,language=?,avatar_b64=?,cover_b64=?,updated_at=datetime('now') WHERE id=1`)
    .run(full_name,username,bio,phone,dob,gender,language,avatar_b64,cover_b64);
  res.json({ok:true});
});

// ── EVENTS ───────────────────────────────────────────────
app.get('/api/events/:dateKey', (req, res) => {
  const rows = db.prepare('SELECT * FROM events WHERE profile_id=1 AND date_key=? ORDER BY reminder_time').all(req.params.dateKey);
  rows.forEach(r=>{ r.custom_days=jp(r.custom_days)||[]; });
  res.json(rows);
});
app.get('/api/events', (req, res) => {
  const rows = db.prepare('SELECT * FROM events WHERE profile_id=1 ORDER BY date_key,reminder_time').all();
  rows.forEach(r=>{ r.custom_days=jp(r.custom_days)||[]; });
  res.json(rows);
});
app.post('/api/events', (req, res) => {
  const {date_key,title,sticker,reminder_time,alarm,repeat_type,custom_days,cal_type}=req.body;
  const info=db.prepare(`INSERT INTO events (profile_id,date_key,title,sticker,reminder_time,alarm,repeat_type,custom_days,cal_type) VALUES (1,?,?,?,?,?,?,?,?)`)
    .run(date_key,title,sticker||'📝',reminder_time||'',alarm?1:0,repeat_type||'never',JSON.stringify(custom_days||[]),cal_type||'gregorian');
  res.json({ok:true, id:info.lastInsertRowid});
});
app.delete('/api/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id=? AND profile_id=1').run(req.params.id);
  res.json({ok:true});
});

// ── DAILY PLANS ──────────────────────────────────────────
app.get('/api/daily/:dateKey', (req, res) => {
  const row=db.prepare('SELECT * FROM daily_plans WHERE profile_id=1 AND date_key=?').get(req.params.dateKey);
  if(!row){ res.json({}); return; }
  row.goals=jp(row.goals)||[]; row.todo=jp(row.todo)||[]; row.schedule=jp(row.schedule)||{};
  row.tomorrow=jp(row.tomorrow)||[];
  res.json(row);
});
app.put('/api/daily/:dateKey', (req, res) => {
  const {goals,todo,schedule,tomorrow,notes,mood}=req.body;
  db.prepare(`INSERT INTO daily_plans (profile_id,date_key,goals,todo,schedule,tomorrow,notes,mood,saved_at) VALUES (1,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(profile_id,date_key) DO UPDATE SET goals=excluded.goals,todo=excluded.todo,schedule=excluded.schedule,tomorrow=excluded.tomorrow,notes=excluded.notes,mood=excluded.mood,saved_at=excluded.saved_at`)
    .run(req.params.dateKey,JSON.stringify(goals||[]),JSON.stringify(todo||[]),JSON.stringify(schedule||{}),JSON.stringify(tomorrow||[]),notes||'',mood||'');
  res.json({ok:true});
});

// ── WEEKLY PLANS ─────────────────────────────────────────
app.get('/api/weekly/:weekKey', (req, res) => {
  const row=db.prepare('SELECT * FROM weekly_plans WHERE profile_id=1 AND week_key=?').get(req.params.weekKey);
  if(!row){ res.json({}); return; }
  row.goals=jp(row.goals)||[]; row.priorities=jp(row.priorities)||[];
  row.todo=jp(row.todo)||[]; row.schedule=jp(row.schedule)||{};
  res.json(row);
});
app.put('/api/weekly/:weekKey', (req, res) => {
  const {goals,priorities,todo,schedule}=req.body;
  db.prepare(`INSERT INTO weekly_plans (profile_id,week_key,goals,priorities,todo,schedule,saved_at) VALUES (1,?,?,?,?,?,datetime('now'))
    ON CONFLICT(profile_id,week_key) DO UPDATE SET goals=excluded.goals,priorities=excluded.priorities,todo=excluded.todo,schedule=excluded.schedule,saved_at=excluded.saved_at`)
    .run(req.params.weekKey,JSON.stringify(goals||[]),JSON.stringify(priorities||[]),JSON.stringify(todo||[]),JSON.stringify(schedule||{}));
  res.json({ok:true});
});

// ── MONTHLY PLANS ────────────────────────────────────────
app.get('/api/monthly/:monthKey', (req, res) => {
  const row=db.prepare('SELECT * FROM monthly_plans WHERE profile_id=1 AND month_key=?').get(req.params.monthKey);
  res.json(row||{});
});
app.put('/api/monthly/:monthKey', (req, res) => {
  const {notes}=req.body;
  db.prepare(`INSERT INTO monthly_plans (profile_id,month_key,notes,saved_at) VALUES (1,?,?,datetime('now'))
    ON CONFLICT(profile_id,month_key) DO UPDATE SET notes=excluded.notes,saved_at=excluded.saved_at`)
    .run(req.params.monthKey,notes||'');
  res.json({ok:true});
});

// ── MY FILES ─────────────────────────────────────────────
app.get('/api/myfiles', (req, res) => {
  const rows=db.prepare('SELECT * FROM my_files WHERE profile_id=1 ORDER BY pinned DESC, saved_at DESC').all();
  res.json(rows);
});
app.post('/api/myfiles', (req, res) => {
  const {plan_type,date_label,preview}=req.body;
  const info=db.prepare(`INSERT INTO my_files (profile_id,plan_type,date_label,preview) VALUES (1,?,?,?)`)
    .run(plan_type,date_label,preview||'');
  res.json({ok:true,id:info.lastInsertRowid});
});
app.put('/api/myfiles/:id/pin', (req, res) => {
  const row=db.prepare('SELECT pinned FROM my_files WHERE id=?').get(req.params.id);
  if(!row){ res.json({ok:false}); return; }
  db.prepare('UPDATE my_files SET pinned=? WHERE id=?').run(row.pinned?0:1,req.params.id);
  res.json({ok:true,pinned:!row.pinned});
});
app.delete('/api/myfiles/:id', (req, res) => {
  db.prepare('DELETE FROM my_files WHERE id=? AND profile_id=1').run(req.params.id);
  res.json({ok:true});
});

// ── CYCLE LOG ────────────────────────────────────────────
app.get('/api/cycles', (req, res) => {
  res.json(db.prepare('SELECT * FROM cycle_log WHERE profile_id=1 ORDER BY saved_at DESC').all());
});
app.post('/api/cycles', (req, res) => {
  const {start_date,end_date,cycle_len,next_date,ovul_date,month_label}=req.body;
  const info=db.prepare(`INSERT INTO cycle_log (profile_id,start_date,end_date,cycle_len,next_date,ovul_date,month_label) VALUES (1,?,?,?,?,?,?)`)
    .run(start_date,end_date||'',cycle_len||28,next_date||'',ovul_date||'',month_label||'');
  res.json({ok:true,id:info.lastInsertRowid});
});

// ── TRACKER CELLS ────────────────────────────────────────
app.get('/api/tracker/:year', (req, res) => {
  const rows=db.prepare("SELECT * FROM tracker_cells WHERE profile_id=1 AND cell_key LIKE ?").all(req.params.year+'%');
  res.json(rows);
});
app.put('/api/tracker/:cellKey', (req, res) => {
  const {flow,pain}=req.body;
  db.prepare(`INSERT INTO tracker_cells (profile_id,cell_key,flow,pain) VALUES (1,?,?,?)
    ON CONFLICT(profile_id,cell_key) DO UPDATE SET flow=excluded.flow,pain=excluded.pain`)
    .run(req.params.cellKey,flow||'',pain||'');
  res.json({ok:true});
});

// ── PERIOD NOTES ─────────────────────────────────────────
app.get('/api/period-notes', (req, res) => {
  res.json(db.prepare('SELECT * FROM period_notes WHERE profile_id=1').all());
});
app.put('/api/period-notes/:month', (req, res) => {
  const {note}=req.body;
  db.prepare(`INSERT INTO period_notes (profile_id,month_num,note) VALUES (1,?,?)
    ON CONFLICT(profile_id,month_num) DO UPDATE SET note=excluded.note`)
    .run(parseInt(req.params.month),note||'');
  res.json({ok:true});
});

// ── HOLIDAY PHOTOS ───────────────────────────────────────
app.get('/api/holiday-photos/:key', (req, res) => {
  res.json(db.prepare('SELECT * FROM holiday_photos WHERE profile_id=1 AND holiday_key=?').all(req.params.key));
});
app.post('/api/holiday-photos/:key', (req, res) => {
  const {photo_b64}=req.body;
  const info=db.prepare(`INSERT INTO holiday_photos (profile_id,holiday_key,photo_b64) VALUES (1,?,?)`).run(req.params.key,photo_b64);
  res.json({ok:true,id:info.lastInsertRowid});
});
app.delete('/api/holiday-photos/:id', (req, res) => {
  db.prepare('DELETE FROM holiday_photos WHERE id=? AND profile_id=1').run(req.params.id);
  res.json({ok:true});
});

// ── ACHIEVEMENTS ─────────────────────────────────────────
app.get('/api/achievements', (req, res) => {
  res.json(db.prepare('SELECT * FROM achievements WHERE profile_id=1').all());
});
app.post('/api/achievements', (req, res) => {
  const {badge_id}=req.body;
  try { db.prepare(`INSERT INTO achievements (profile_id,badge_id) VALUES (1,?)`).run(badge_id); }
  catch{} // ignore duplicate
  res.json({ok:true});
});

// ── CUSTOM REWARDS ───────────────────────────────────────
app.get('/api/rewards', (req, res) => {
  res.json(db.prepare('SELECT * FROM custom_rewards WHERE profile_id=1 ORDER BY created_at DESC').all());
});
app.post('/api/rewards', (req, res) => {
  const {goal_name,reward_name}=req.body;
  const info=db.prepare(`INSERT INTO custom_rewards (profile_id,goal_name,reward_name) VALUES (1,?,?)`).run(goal_name,reward_name);
  res.json({ok:true,id:info.lastInsertRowid});
});
app.delete('/api/rewards/:id', (req, res) => {
  db.prepare('DELETE FROM custom_rewards WHERE id=? AND profile_id=1').run(req.params.id);
  res.json({ok:true});
});

// ── PRODUCTIVITY ─────────────────────────────────────────
app.put('/api/productivity/:dateKey', (req, res) => {
  const {daily_pct,weekly_pct,monthly_pct,overall_pct}=req.body;
  db.prepare(`INSERT INTO productivity (profile_id,date_key,daily_pct,weekly_pct,monthly_pct,overall_pct) VALUES (1,?,?,?,?,?)
    ON CONFLICT(profile_id,date_key) DO UPDATE SET daily_pct=excluded.daily_pct,weekly_pct=excluded.weekly_pct,monthly_pct=excluded.monthly_pct,overall_pct=excluded.overall_pct`)
    .run(req.params.dateKey,daily_pct||0,weekly_pct||0,monthly_pct||0,overall_pct||0);
  res.json({ok:true});
});

// ── SETTINGS ─────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(db.prepare('SELECT * FROM settings WHERE profile_id=1').get()||{});
});
app.put('/api/settings', (req, res) => {
  const {theme,language,primary_cal,pub_holidays,orth_holidays,mus_holidays,holiday_notifs,fingerprint,face_id,cloud_sync,password_hash}=req.body;
  db.prepare(`INSERT INTO settings (profile_id,theme,language,primary_cal,pub_holidays,orth_holidays,mus_holidays,holiday_notifs,fingerprint,face_id,cloud_sync,password_hash,updated_at) VALUES (1,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(profile_id) DO UPDATE SET theme=excluded.theme,language=excluded.language,primary_cal=excluded.primary_cal,pub_holidays=excluded.pub_holidays,orth_holidays=excluded.orth_holidays,mus_holidays=excluded.mus_holidays,holiday_notifs=excluded.holiday_notifs,fingerprint=excluded.fingerprint,face_id=excluded.face_id,cloud_sync=excluded.cloud_sync,password_hash=excluded.password_hash,updated_at=excluded.updated_at`)
    .run(theme||'light',language||'en',primary_cal||'eth',pub_holidays?1:0,orth_holidays?1:0,mus_holidays?1:0,holiday_notifs?1:0,fingerprint?1:0,face_id?1:0,cloud_sync?1:0,password_hash||null);
  res.json({ok:true});
});

// ── STREAKS ──────────────────────────────────────────────
app.get('/api/streaks', (req, res) => {
  res.json(db.prepare('SELECT * FROM streaks WHERE profile_id=1').get()||{});
});
app.put('/api/streaks', (req, res) => {
  const {login_streak,plan_streak,last_login_date,last_plan_date}=req.body;
  db.prepare(`INSERT INTO streaks (profile_id,login_streak,plan_streak,last_login_date,last_plan_date) VALUES (1,?,?,?,?)
    ON CONFLICT(profile_id) DO UPDATE SET login_streak=excluded.login_streak,plan_streak=excluded.plan_streak,last_login_date=excluded.last_login_date,last_plan_date=excluded.last_plan_date`)
    .run(login_streak||0,plan_streak||0,last_login_date||'',last_plan_date||'');
  res.json({ok:true});
});

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req,res)=>res.json({status:'ok', db:'ethioplanner.db', time:new Date().toISOString()}));

// ── Start server ─────────────────────────────────────────
app.listen(PORT, ()=>{
  console.log(`\n🇪🇹 Ethio Planner Backend running on http://localhost:${PORT}`);
  console.log(`   Database: ethioplanner.db`);
  console.log(`   API: http://localhost:${PORT}/api/health\n`);
});

module.exports = { app, db };
