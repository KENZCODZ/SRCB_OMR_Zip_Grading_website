import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

import pymysql
import pymysql.cursors
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "aeroomr")

SEED_USERS = [
    {
        "id": "admin-001",
        "name": "System Administrator",
        "email": "admin@srcb.edu.ph",
        "password": "Admin@2025",
        "role": "admin",
        "programme": "Institution-wide",
        "department": "IT Systems & Administration",
        "status": "active",
    },
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


def get_db_connection() -> pymysql.connections.Connection[pymysql.cursors.DictCursor]:
    """Returns a new MySQL connection with dict-like row access."""
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=False,
    )


def init_db():
    """Initializes the MySQL schema and seeds default users."""
    # Ensure database exists
    server_conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        cursorclass=pymysql.cursors.DictCursor,
        autocommit=True,
    )
    with server_conn.cursor() as s_cur:
        s_cur.execute(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    server_conn.close()

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users Table with Registration Status
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            programme VARCHAR(100),
            department VARCHAR(255),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        )
    """)

    # Check for legacy schema (exam_id instead of id) and upgrade cleanly
    try:
        cursor.execute("DESCRIBE exams")
        cols = [r["Field"] for r in cursor.fetchall()]
        if "exam_id" in cols and "id" not in cols:
            cursor.execute("DROP TABLE IF EXISTS submission_answers")
            cursor.execute("DROP TABLE IF EXISTS submissions")
            cursor.execute("DROP TABLE IF EXISTS answer_keys")
            cursor.execute("DROP TABLE IF EXISTS exams")
    except Exception:
        pass

    # 2. Exams Table with Comprehensive Metadata
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exams (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            answer_key LONGTEXT NOT NULL,
            exam_type VARCHAR(100),
            academic_year VARCHAR(50),
            semester VARCHAR(50),
            subject VARCHAR(255),
            course_code VARCHAR(100),
            section VARCHAR(100),
            program VARCHAR(100),
            instructor_name VARCHAR(255),
            num_items INT DEFAULT 50,
            passing_score INT,
            instructions TEXT,
            exam_date VARCHAR(64),
            created_at VARCHAR(64) NOT NULL
        )
    """)

    # 3. Submissions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id VARCHAR(36) PRIMARY KEY,
            exam_id VARCHAR(36) NOT NULL,
            student_id VARCHAR(36),
            score INT NOT NULL,
            total_questions INT NOT NULL,
            answers LONGTEXT NOT NULL,
            created_at VARCHAR(64) NOT NULL,
            FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE
        )
    """)

    # 4. Seed initial default users (skip any that already exist)
    now_iso = datetime.now(timezone.utc).isoformat()
    for user in SEED_USERS:
        cursor.execute(
            """
            INSERT IGNORE INTO users
                (id, name, email, password, role, programme, department, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user["id"],
                user["name"],
                (user.get("email") or "").strip().lower(),
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
    cursor.close()
    conn.close()


def _row_to_exam(row: Dict[str, Any]) -> Dict[str, Any]:
    """Helper to parse the JSON-encoded answer_key back into a dict."""
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
        "SELECT id, name, email, password, role, programme, department, status, created_at, updated_at "
        "FROM users WHERE LOWER(email) = %s",
        (email.strip().lower(),),
    )
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row


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
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
    cursor.close()
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
            "SELECT id, name, email, role, programme, department, status, created_at "
            "FROM users WHERE status = 'pending' AND (programme = %s OR programme IS NULL) "
            "ORDER BY created_at DESC",
            (programme,),
        )
    else:
        cursor.execute(
            "SELECT id, name, email, role, programme, department, status, created_at "
            "FROM users WHERE status = 'pending' ORDER BY created_at DESC"
        )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return list(rows)


def update_user_status(user_id: str, new_status: str) -> bool:
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET status = %s, updated_at = %s WHERE id = %s",
        (new_status, now_iso, user_id),
    )
    updated = cursor.rowcount > 0
    conn.commit()
    cursor.close()
    conn.close()
    return updated


def create_user_account(
    name: str,
    email: str,
    password: str,
    role: str,
    programme: Optional[str] = None,
    department: Optional[str] = None,
    status: str = "active",
) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, name, email, password, role, programme, department, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
    cursor.close()
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


def list_all_users() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, role, programme, department, status, created_at "
        "FROM users ORDER BY created_at DESC"
    )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return list(rows)


def delete_user(user_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    cursor.close()
    conn.close()
    return deleted


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
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            answer_key = VALUES(answer_key),
            exam_type = VALUES(exam_type),
            academic_year = VALUES(academic_year),
            semester = VALUES(semester),
            subject = VALUES(subject),
            course_code = VALUES(course_code),
            section = VALUES(section),
            program = VALUES(program),
            instructor_name = VALUES(instructor_name),
            num_items = VALUES(num_items),
            passing_score = VALUES(passing_score),
            instructions = VALUES(instructions),
            exam_date = VALUES(exam_date)
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
    cursor.close()
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
            name = COALESCE(%s, name),
            answer_key = %s,
            exam_type = COALESCE(%s, exam_type),
            academic_year = COALESCE(%s, academic_year),
            semester = COALESCE(%s, semester),
            subject = COALESCE(%s, subject),
            course_code = COALESCE(%s, course_code),
            section = COALESCE(%s, section),
            program = COALESCE(%s, program),
            instructor_name = COALESCE(%s, instructor_name),
            num_items = COALESCE(%s, num_items),
            passing_score = COALESCE(%s, passing_score),
            instructions = COALESCE(%s, instructions),
            exam_date = COALESCE(%s, exam_date)
        WHERE id = %s
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
    cursor.close()
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
        FROM exams WHERE id = %s
        """,
        (exam_id,),
    )
    row = cursor.fetchone()
    cursor.close()
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
    cursor.close()
    conn.close()
    return [_row_to_exam(r) for r in rows]


def delete_exam(exam_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM submissions WHERE exam_id = %s", (exam_id,))
    cursor.execute("DELETE FROM exams WHERE id = %s", (exam_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    cursor.close()
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
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        """,
        (submission_id, exam_id, student_id, score, total_questions, answers_str, created_at),
    )
    conn.commit()
    cursor.close()
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
            "SELECT id, exam_id, student_id, score, total_questions, answers, created_at "
            "FROM submissions WHERE exam_id = %s ORDER BY created_at DESC",
            (exam_id,),
        )
    else:
        cursor.execute(
            "SELECT id, exam_id, student_id, score, total_questions, answers, created_at "
            "FROM submissions ORDER BY created_at DESC"
        )
    rows = cursor.fetchall()
    cursor.close()
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

    cursor.execute("SELECT COUNT(*) AS c FROM users WHERE status = 'active'")
    accounts_row = cursor.fetchone()
    total_accounts = accounts_row["c"] if accounts_row and accounts_row.get("c") is not None else 0

    cursor.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'student' AND status = 'active'")
    students_row = cursor.fetchone()
    total_students = students_row["c"] if students_row and students_row.get("c") is not None else 0

    cursor.execute("SELECT COUNT(*) AS c FROM users WHERE role = 'teacher' AND status = 'active'")
    teachers_row = cursor.fetchone()
    total_teachers = teachers_row["c"] if teachers_row and teachers_row.get("c") is not None else 0

    cursor.execute("SELECT COUNT(*) AS c FROM exams")
    exams_row = cursor.fetchone()
    total_exams = exams_row["c"] if exams_row and exams_row.get("c") is not None else 0

    cursor.execute("SELECT AVG(score) AS avg_score, COUNT(*) AS c FROM submissions")
    avg_row = cursor.fetchone()
    avg_score = round(float(avg_row["avg_score"]), 2) if avg_row and avg_row.get("avg_score") is not None else 0.0
    total_submissions = avg_row["c"] if avg_row and avg_row.get("c") is not None else 0

    cursor.close()
    conn.close()

    return {
        "total_accounts": int(total_accounts),
        "total_students": int(total_students),
        "total_teachers": int(total_teachers),
        "total_exams": int(total_exams),
        "average_score": avg_score,
        "total_submissions": int(total_submissions),
    }


if __name__ == "__main__":
    init_db()
    print("Database tables initialized successfully.")