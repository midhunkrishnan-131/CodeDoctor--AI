#!/usr/bin/env python3
"""
CodeDoctor AI - SQLite Database Manager
Handles persistence of diagnosis sessions, problems, code, execution results, and AI feedback.
"""
import sqlite3
import os
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(DB_DIR, "codedoctor.db")

def get_connection():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS diagnosis_history (
        id TEXT PRIMARY KEY,
        problem_description TEXT NOT NULL,
        source_code TEXT NOT NULL,
        diagnosis_mode TEXT NOT NULL,
        stdout TEXT DEFAULT '',
        stderr TEXT DEFAULT '',
        exit_code INTEGER DEFAULT 0,
        execution_time_ms REAL DEFAULT 0.0,
        ai_diagnosis TEXT NOT NULL,
        model_name TEXT DEFAULT '',
        provider TEXT DEFAULT 'groq',
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_created_at ON diagnosis_history(created_at DESC)")
    conn.commit()
    conn.close()

def save_record(
    problem_description: str,
    source_code: str,
    diagnosis_mode: str,
    stdout: str,
    stderr: str,
    exit_code: int,
    execution_time_ms: float,
    ai_diagnosis: str,
    model_name: str = "llama-3.3-70b-versatile",
    provider: str = "groq"
) -> Dict[str, Any]:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    record_id = str(uuid.uuid4())
    now_str = datetime.utcnow().isoformat() + "Z"
    
    cursor.execute("""
        INSERT INTO diagnosis_history (
            id, problem_description, source_code, diagnosis_mode,
            stdout, stderr, exit_code, execution_time_ms,
            ai_diagnosis, model_name, provider, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        record_id, problem_description, source_code, diagnosis_mode,
        stdout, stderr, exit_code, execution_time_ms,
        ai_diagnosis, model_name, provider, now_str
    ))
    conn.commit()
    conn.close()
    
    return {
        "id": record_id,
        "problem_description": problem_description,
        "source_code": source_code,
        "diagnosis_mode": diagnosis_mode,
        "stdout": stdout,
        "stderr": stderr,
        "exit_code": exit_code,
        "execution_time_ms": execution_time_ms,
        "ai_diagnosis": ai_diagnosis,
        "model_name": model_name,
        "provider": provider,
        "created_at": now_str
    }

def get_all_records(limit: int = 50) -> List[Dict[str, Any]]:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM diagnosis_history
        ORDER BY created_at DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

def get_record_by_id(record_id: str) -> Optional[Dict[str, Any]]:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM diagnosis_history WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def delete_record_by_id(record_id: str) -> bool:
    init_db()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM diagnosis_history WHERE id = ?", (record_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

if __name__ == "__main__":
    import sys
    init_db()
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        if cmd == "list":
            print(json.dumps(get_all_records()))
        elif cmd == "delete" and len(sys.argv) > 2:
            res = delete_record_by_id(sys.argv[2])
            print(json.dumps({"deleted": res}))
        elif cmd == "test":
            rec = save_record(
                "Find maximum element in a list",
                "def find_max(nums):\n    return max(nums)",
                "complete_answer",
                "Result: 10",
                "",
                0,
                15.2,
                "Looks great! Here is the breakdown...",
                "llama-3.3-70b-versatile",
                "groq"
            )
            print("Saved test record:", json.dumps(rec, indent=2))
            print("Records count:", len(get_all_records()))
