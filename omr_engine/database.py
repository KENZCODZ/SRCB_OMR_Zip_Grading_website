import os
import sqlite3
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aeroomr.db")

SEED_USERS = [
    {
        "id": "dean-001",
        "name": "Dr. Maria Santos",
        "email": "dean@srcb.edu.ph",
        "password": "Dean@2025",
        "role": "dean",
        "programme": None,
        "department": "Office of the Dean",
        "status": "active",
    },
    {
        "id": "ph-001",
        "name": "Prof. Elaine Cruz",
        "email": "programme-head@srcb.edu.ph",
        "password": "Ph@2025",
        "role": "programme-head",
        "programme": "BSIT",
        "department": "Computing Studies",
        "status": "active",
    },
    {
        "id": "ph-002",
        "name": "Prof. Ramon Cruz",
        "email": "ramon.cruz@srcb.edu.ph",
        "password": "Ph@2025",
        "role": "programme-head",
        "programme": "BSIT",
        "department": "College of Computing",
        "status": "active",
    },
    {
        "id": "teacher-001",
        "name": "Prof. John Dela Cruz",
        "email": "teacher@srcb.edu.ph",
        "password": "Teacher@2025",
        "role": "teacher",
        "programme": "BSIT",
        "department": "Computing Studies",
        "status": "active",
    },
    {
        "id": "teacher-002",
        "name": "Ms. Jenny Garcia",
        "email": "jenny.garcia@srcb.edu.ph",
        "password": "Teacher@2025",
        "role": "teacher",
        "programme": "BSIT",
        "department": "Computer Studies",
        "status": "active",
    },
    {
        "id": "student-001",
        "name": "Ana Reyes",
        "email": "student@srcb.edu.ph",
        "password": "Student@2025",
        "role": "student",
        "programme": "BSIT",
        "department": "Computing Studies",
        "status": "active",
    },
    {
        "id": "student-002",
        "name": "Kenneth Ernest Palicte",
        "email": "k.palicte@srcb.edu.ph",
        "password": "Student@2025",
        "role": "student",
        "programme": "BSIT",
        "department": "Computer Studies",
        "status": "active",
    },
]


def get_db_connection() -> sqlite3.Connection:
    """Returns a new SQLite connection configured with dict-like Row access."""
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    """Initializes the SQLite schema and seeds default users."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table with Registration Status
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            programme TEXT,
            department TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    # 2. Exams Table with Comprehensive Metadata
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exams (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            answer_key TEXT NOT NULL,
            exam_type TEXT,
            academic_year TEXT,
            semester TEXT,
            subject TEXT,
            course_code TEXT,
            section TEXT,
            program TEXT,
            instructor_name TEXT,
            num_items INTEGER DEFAULT 50,
            passing_score INTEGER,
            instructions TEXT,
            exam_date TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # Non-destructive migrations for existing SQLite databases
    new_exam_cols = [
        ("exam_type", "TEXT"),
        ("academic_year", "TEXT"),
        ("semester", "TEXT"),
        ("subject", "TEXT"),
        ("course_code", "TEXT"),
        ("section", "TEXT"),
        ("program", "TEXT"),
        ("instructor_name", "TEXT"),
        ("num_items", "INTEGER DEFAULT 50"),
        ("passing_score", "INTEGER"),
        ("instructions", "TEXT"),
        ("exam_date", "TEXT"),
    ]
    for col_name, col_type in new_exam_cols:
        try:
            cursor.execute(f"ALTER TABLE exams ADD COLUMN {col_name} {col_type}")
        except Exception:
            pass

    try:
        cursor.execute("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'")
    except Exception:
        pass

    # 3. Submissions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id TEXT PRIMARY KEY,
            exam_id TEXT NOT NULL,
            student_id TEXT,
            score INTEGER NOT NULL,
            total_questions INTEGER NOT NULL,
            answers TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE
        )
    """)

    # 4. Seed initial default users
    now_iso = datetime.now(timezone.utc).isoformat()
    for user in SEED_USERS:
        cursor.execute(
            """
            INSERT INTO users (id, name, email, password, role, programme, department, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO NOTHING
            """,
            (
                user["id"],
                user["name"],
                user["email"].strip().lower(),
                user["password"],
                user["role"],
                user["programme"],
                user["department"],
                user.get("status", "active"),
                now_iso,
                now_iso,
            ),
        )

    conn.commit()
    conn.close()


def _row_to_exam(row: sqlite3.Row) -> Dict[str, Any]:
    """Helper to convert sqlite3.Row into serializable dict."""
    try:
        answer_key = json.loads(row["answer_key"])
    except Exception:
        answer_key = {}

    return {
        "id": row["id"],
        "name": row["name"],
        "answer_key": answer_key,
        "exam_type": row["exam_type"],
        "academic_year": row["academic_year"],
        "semester": row["semester"],
        "subject": row["subject"],
        "course_code": row["course_code"],
        "section": row["section"],
        "program": row["program"],
        "instructor_name": row["instructor_name"],
        "num_items": row["num_items"] if row["num_items"] is not None else 50,
        "passing_score": row["passing_score"],
        "instructions": row["instructions"],
        "exam_date": row["exam_date"],
        "created_at": row["created_at"],
    }


# ==========================================
# User & Authentication Operations
# ==========================================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, password, role, programme, department, status, created_at, updated_at FROM users WHERE lower(email) = ?",
        (email.strip().lower(),),
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def register_user(
    name: str,
    email: str,
    password: str,
    role: str,
    programme: Optional[str] = None,
    department: Optional[str] = None,
) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    status = "pending"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, name, email, password, role, programme, department, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            user_id,
            name.strip(),
            email.strip().lower(),
            password,
            role.strip().lower(),
            programme.strip() if programme else "BSIT",
            department.strip() if department else "Computing Studies",
            status,
            now_iso,
            now_iso,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "id": user_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "role": role.strip().lower(),
        "programme": programme or "BSIT",
        "department": department or "Computing Studies",
        "status": status,
        "created_at": now_iso,
    }


def list_pending_users(programme: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if programme:
        cursor.execute(
            "SELECT id, name, email, role, programme, department, status, created_at FROM users WHERE status = 'pending' AND (programme = ? OR programme IS NULL) ORDER BY created_at DESC",
            (programme,),
        )
    else:
        cursor.execute(
            "SELECT id, name, email, role, programme, department, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at DESC"
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_user_status(user_id: str, new_status: str) -> bool:
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET status = ?, updated_at = ? WHERE id = ?",
        (new_status, now_iso, user_id),
    )
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    user = get_user_by_email(email)
    if not user or user["password"] != password:
        return {"success": False, "error": "invalid_credentials", "message": "Invalid school email or password."}

    user_status = user.get("status", "active")
    if user_status == "pending":
        return {
            "success": False,
            "error": "pending_approval",
            "message": "Your registration is currently pending confirmation by the Programme Head.",
        }
    elif user_status == "rejected":
        return {
            "success": False,
            "error": "account_rejected",
            "message": "Your registration request was not approved by the Programme Head.",
        }

    user_info = {
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "programme": user["programme"],
        "department": user["department"],
        "status": user_status,
    }
    return {
        "success": True,
        "user": user_info,
        **user_info,
    }


# ==========================================
# Exam Operations
# ==========================================

def save_exam(
    exam_id: str,
    name: str,
    answer_key: Dict[str, Any],
    exam_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
    subject: Optional[str] = None,
    course_code: Optional[str] = None,
    section: Optional[str] = None,
    program: Optional[str] = None,
    instructor_name: Optional[str] = None,
    num_items: int = 50,
    passing_score: Optional[int] = None,
    instructions: Optional[str] = None,
    exam_date: Optional[str] = None,
) -> Dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    answer_key_str = json.dumps(answer_key)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO exams (
            id, name, answer_key,
            exam_type, academic_year, semester, subject, course_code,
            section, program, instructor_name,
            num_items, passing_score, instructions, exam_date,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            answer_key = excluded.answer_key,
            exam_type = excluded.exam_type,
            academic_year = excluded.academic_year,
            semester = excluded.semester,
            subject = excluded.subject,
            course_code = excluded.course_code,
            section = excluded.section,
            program = excluded.program,
            instructor_name = excluded.instructor_name,
            num_items = excluded.num_items,
            passing_score = excluded.passing_score,
            instructions = excluded.instructions,
            exam_date = excluded.exam_date
        """,
        (
            exam_id,
            name.strip(),
            answer_key_str,
            exam_type,
            academic_year,
            semester,
            subject,
            course_code,
            section,
            program,
            instructor_name,
            num_items,
            passing_score,
            instructions,
            exam_date,
            created_at,
        ),
    )
    conn.commit()
    conn.close()

    return {
        "id": exam_id,
        "name": name.strip(),
        "answer_key": answer_key,
        "exam_type": exam_type,
        "academic_year": academic_year,
        "semester": semester,
        "subject": subject,
        "course_code": course_code,
        "section": section,
        "program": program,
        "instructor_name": instructor_name,
        "num_items": num_items,
        "passing_score": passing_score,
        "instructions": instructions,
        "exam_date": exam_date,
        "created_at": created_at,
    }


def update_exam(
    exam_id: str,
    answer_key: Dict[str, Any],
    name: Optional[str] = None,
    exam_type: Optional[str] = None,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
    subject: Optional[str] = None,
    course_code: Optional[str] = None,
    section: Optional[str] = None,
    program: Optional[str] = None,
    instructor_name: Optional[str] = None,
    num_items: Optional[int] = None,
    passing_score: Optional[int] = None,
    instructions: Optional[str] = None,
    exam_date: Optional[str] = None,
) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    answer_key_str = json.dumps(answer_key)

    cursor.execute(
        """
        UPDATE exams SET
            name = COALESCE(?, name),
            answer_key = ?,
            exam_type = COALESCE(?, exam_type),
            academic_year = COALESCE(?, academic_year),
            semester = COALESCE(?, semester),
            subject = COALESCE(?, subject),
            course_code = COALESCE(?, course_code),
            section = COALESCE(?, section),
            program = COALESCE(?, program),
            instructor_name = COALESCE(?, instructor_name),
            num_items = COALESCE(?, num_items),
            passing_score = COALESCE(?, passing_score),
            instructions = COALESCE(?, instructions),
            exam_date = COALESCE(?, exam_date)
        WHERE id = ?
        """,
        (
            name,
            answer_key_str,
            exam_type,
            academic_year,
            semester,
            subject,
            course_code,
            section,
            program,
            instructor_name,
            num_items,
            passing_score,
            instructions,
            exam_date,
            exam_id,
        ),
    )
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def get_exam(exam_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, name, answer_key,
               exam_type, academic_year, semester, subject, course_code,
               section, program, instructor_name,
               num_items, passing_score, instructions, exam_date,
               created_at
        FROM exams WHERE id = ?
        """,
        (exam_id,),
    )
    row = cursor.fetchone()
    conn.close()
    return _row_to_exam(row) if row else None


def list_exams() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, name, answer_key,
               exam_type, academic_year, semester, subject, course_code,
               section, program, instructor_name,
               num_items, passing_score, instructions, exam_date,
               created_at
        FROM exams ORDER BY created_at DESC
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return [_row_to_exam(r) for r in rows]


def delete_exam(exam_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM submissions WHERE exam_id = ?", (exam_id,))
    cursor.execute("DELETE FROM exams WHERE id = ?", (exam_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ==========================================
# Submission Operations
# ==========================================

def save_submission(
    submission_id: str,
    exam_id: str,
    student_id: Optional[str],
    score: int,
    total_questions: int,
    answers: Dict[str, Any],
) -> Dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    answers_str = json.dumps(answers)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO submissions (id, exam_id, student_id, score, total_questions, answers, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (submission_id, exam_id, student_id, score, total_questions, answers_str, created_at),
    )
    conn.commit()
    conn.close()

    return {
        "id": submission_id,
        "exam_id": exam_id,
        "student_id": student_id,
        "score": score,
        "total_questions": total_questions,
        "answers": answers,
        "created_at": created_at,
    }


def list_submissions(exam_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if exam_id:
        cursor.execute(
            "SELECT id, exam_id, student_id, score, total_questions, answers, created_at FROM submissions WHERE exam_id = ? ORDER BY created_at DESC",
            (exam_id,),
        )
    else:
        cursor.execute(
            "SELECT id, exam_id, student_id, score, total_questions, answers, created_at FROM submissions ORDER BY created_at DESC"
        )
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        try:
            parsed_answers = json.loads(r["answers"])
        except Exception:
            parsed_answers = {}
        results.append(
            {
                "id": r["id"],
                "exam_id": r["exam_id"],
                "student_id": r["student_id"],
                "score": r["score"],
                "total_questions": r["total_questions"],
                "answers": parsed_answers,
                "created_at": r["created_at"],
            }
        )
    return results


# ==========================================
# Dashboard & Analytics
# ==========================================

def get_dashboard_summary() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'student' AND status = 'active'")
    total_students = cursor.fetchone()[0] or 0

    cursor.execute("SELECT COUNT(*) FROM exams")
    total_exams = cursor.fetchone()[0] or 0

    cursor.execute("SELECT AVG(score), COUNT(*) FROM submissions")
    avg_row = cursor.fetchone()
    avg_score = round(float(avg_row[0]), 2) if avg_row and avg_row[0] is not None else 0.0
    total_submissions = avg_row[1] if avg_row and avg_row[1] is not None else 0

    conn.close()

    return {
        "total_students": int(total_students),
        "total_exams": int(total_exams),
        "average_score": avg_score,
        "total_submissions": int(total_submissions),
    }


if __name__ == "__main__":
    init_db()
    print("Database tables initialized successfully.")
