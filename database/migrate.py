"""
One-time SQLite schema migration:
- Adds date_of_birth column to patients table
- Adds report_id column to predictions table
- Creates users table if it doesn't exist
"""
import sqlite3

DB_PATH = r'c:\Users\91868\OneDrive\Pictures\GSTNet_Execution\database\gstnet.db'

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# ── Inspect existing columns ──────────────────────────────────────────────────
cur.execute('PRAGMA table_info(patients)')
patient_cols = [row[1] for row in cur.fetchall()]
print('Patients columns:', patient_cols)

cur.execute('PRAGMA table_info(predictions)')
pred_cols = [row[1] for row in cur.fetchall()]
print('Predictions columns:', pred_cols)

# ── Migrate patients table ────────────────────────────────────────────────────
if 'date_of_birth' not in patient_cols:
    cur.execute('ALTER TABLE patients ADD COLUMN date_of_birth TEXT')
    print('[+] Added date_of_birth to patients')
else:
    print('[=] date_of_birth already present in patients')

# ── Migrate predictions table ─────────────────────────────────────────────────
if 'report_id' not in pred_cols:
    cur.execute('ALTER TABLE predictions ADD COLUMN report_id TEXT')
    # Create unique index
    cur.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_report_id ON predictions(report_id)')
    print('[+] Added report_id to predictions')
else:
    print('[=] report_id already present in predictions')

# ── Create users table if missing ─────────────────────────────────────────────
cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
if not cur.fetchone():
    cur.execute('''
        CREATE TABLE users (
            user_id   INTEGER PRIMARY KEY AUTOINCREMENT,
            username  TEXT    NOT NULL UNIQUE,
            email     TEXT    NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role      TEXT    NOT NULL DEFAULT 'patient',
            patient_id INTEGER REFERENCES patients(patient_id) ON DELETE SET NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    print('[+] Created users table')
else:
    print('[=] users table already exists')

conn.commit()
conn.close()
print('\nMigration complete!')
