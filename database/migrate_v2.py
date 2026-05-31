"""
One-time SQLite schema migration:
- Adds password_hash column to patients table
"""
import sqlite3

DB_PATH = r'c:\Users\91868\OneDrive\Pictures\GSTNet_Execution\database\gstnet.db'

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# Inspect existing columns
cur.execute('PRAGMA table_info(patients)')
patient_cols = [row[1] for row in cur.fetchall()]
print('Patients columns:', patient_cols)

# Migrate patients table
if 'password_hash' not in patient_cols:
    cur.execute('ALTER TABLE patients ADD COLUMN password_hash TEXT')
    print('[+] Added password_hash to patients table')
else:
    print('[=] password_hash already present in patients table')

conn.commit()
conn.close()
print('\nMigration V2 complete!')
