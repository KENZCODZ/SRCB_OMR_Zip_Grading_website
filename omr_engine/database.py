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
DB_NAME = os.getenv("DB_NAME", "aeroomr_db")

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
        "student_id": "2023-0001",
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
        "student_id": "2023-0002",
        "status": "active",
    },
]

SEED_PROGRAMS = [
    {
        "program_id": "prog-bsit-001",
        "program_code": "BSIT",
        "program_name": "Bachelor of Science in Information Technology",
        "department_name": "College of Computing Studies",
    },
    {
        "program_id": "prog-bscs-001",
        "program_code": "BSCS",
        "program_name": "Bachelor of Science in Computer Science",
        "department_name": "College of Computing Studies",
    },
]

SEED_SUBJECTS = [
    {
        "subject_id": "subj-itp305-001",
        "subject_code": "ITP305",
        "subject_name": "Event-Driven Programming",
        "description": "Desktop & GUI application development using event-driven architectures.",
        "units": 3,
        "is_major": 1,
        "program_id": "prog-bsit-001",
    },
    {
        "subject_id": "subj-itp306-001",
        "subject_code": "ITP306",
        "subject_name": "Mobile Application Development",
        "description": "Native and cross-platform mobile application engineering.",
        "units": 3,
        "is_major": 1,
        "program_id": "prog-bsit-001",
    },
    {
        "subject_id": "subj-itp307-001",
        "subject_code": "ITP307",
        "subject_name": "Data Mining and Analytics",
        "description": "Knowledge discovery, predictive modeling, and statistical data warehousing.",
        "units": 3,
        "is_major": 1,
        "program_id": "prog-bsit-001",
    },
]

SEED_SECTIONS = [
    {
        "section_id": "sec-bsit-3a-001",
        "section_name": "BSIT 3-A",
        "year_level": 3,
        "program_id": "prog-bsit-001",
    },
    {
        "section_id": "sec-bsit-3b-001",
        "section_name": "BSIT 3-B",
        "year_level": 3,
        "program_id": "prog-bsit-001",
    },
]


def get_db_connection() -> Any:
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
    """Initializes the MySQL schema and seeds default data non-destructively."""
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

    # 1. Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(64) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL,
            programme VARCHAR(100),
            department VARCHAR(255),
            student_id VARCHAR(64) DEFAULT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at VARCHAR(64) NOT NULL,
            updated_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # Ensure student_id column exists
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN student_id VARCHAR(64) DEFAULT NULL")
        conn.commit()
    except Exception:
        pass

    # 2. Programs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS programs (
            program_id VARCHAR(64) PRIMARY KEY,
            program_code VARCHAR(30) NOT NULL UNIQUE,
            program_name VARCHAR(255) NOT NULL,
            department_name VARCHAR(255) DEFAULT NULL,
            created_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # 3. Instructors Table (1:1 specialization with users)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS instructors (
            instructor_id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL UNIQUE,
            program_id VARCHAR(64) DEFAULT NULL,
            faculty_id_number VARCHAR(50) DEFAULT NULL,
            created_at VARCHAR(64) NOT NULL,
            CONSTRAINT fk_instructors_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            CONSTRAINT fk_instructors_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # 4. Students Table (1:1 specialization with users)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS students (
            student_id VARCHAR(64) PRIMARY KEY,
            user_id VARCHAR(64) NOT NULL UNIQUE,
            institutional_id_number VARCHAR(64) NOT NULL UNIQUE,
            created_at VARCHAR(64) NOT NULL,
            CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # 5. Subjects Table (Master Course Catalog)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subjects (
            subject_id VARCHAR(64) PRIMARY KEY,
            subject_code VARCHAR(50) NOT NULL,
            subject_name VARCHAR(255) NOT NULL,
            description TEXT DEFAULT NULL,
            units TINYINT UNSIGNED NOT NULL DEFAULT 3,
            is_major TINYINT(1) NOT NULL DEFAULT 1,
            program_id VARCHAR(64) NOT NULL,
            created_at VARCHAR(64) NOT NULL,
            CONSTRAINT fk_subjects_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # 6. Sections Table (Class Cohorts)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sections (
            section_id VARCHAR(64) PRIMARY KEY,
            section_name VARCHAR(100) NOT NULL,
            year_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
            program_id VARCHAR(64) NOT NULL,
            created_at VARCHAR(64) NOT NULL,
            CONSTRAINT fk_sections_program FOREIGN KEY (program_id) REFERENCES programs (program_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # 7. Enrollments Table (Student Term Membership)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS enrollments (
            enrollment_id VARCHAR(64) PRIMARY KEY,
            student_id VARCHAR(64) NOT NULL,
            section_id VARCHAR(64) NOT NULL,
            academic_year VARCHAR(20) NOT NULL,
            semester VARCHAR(30) NOT NULL,
            enrollment_status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
            enrolled_at VARCHAR(64) NOT NULL,
            UNIQUE KEY uq_enrollments_term (student_id, section_id, academic_year, semester),
            CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students (student_id) ON DELETE CASCADE,
            CONSTRAINT fk_enrollments_section FOREIGN KEY (section_id) REFERENCES sections (section_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # 8. Exams Table with Comprehensive Metadata
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS exams (
            id VARCHAR(64) PRIMARY KEY,
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
            subject_id VARCHAR(64) DEFAULT NULL,
            instructor_id VARCHAR(64) DEFAULT NULL,
            created_at VARCHAR(64) NOT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # Safe additive column upgrades to exams
    for col_def in [
        ("subject_id", "VARCHAR(64) DEFAULT NULL"),
        ("instructor_id", "VARCHAR(64) DEFAULT NULL"),
    ]:
        try:
            cursor.execute(f"ALTER TABLE exams ADD COLUMN {col_def[0]} {col_def[1]}")
            conn.commit()
        except Exception:
            pass

    # 9. Submissions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS submissions (
            id VARCHAR(64) PRIMARY KEY,
            exam_id VARCHAR(64) NOT NULL,
            student_id VARCHAR(64),
            student_id_extracted VARCHAR(64) DEFAULT NULL,
            score INT NOT NULL,
            total_questions INT NOT NULL,
            answers LONGTEXT NOT NULL,
            created_at VARCHAR(64) NOT NULL,
            FOREIGN KEY (exam_id) REFERENCES exams (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    """)

    # Safe additive column upgrades to submissions
    try:
        cursor.execute("ALTER TABLE submissions ADD COLUMN student_id_extracted VARCHAR(64) DEFAULT NULL")
        conn.commit()
    except Exception:
        pass

    # Seed initial default users
    now_iso = datetime.now(timezone.utc).isoformat()
    for user in SEED_USERS:
        cursor.execute(
            """
            INSERT IGNORE INTO users
                (id, name, email, password, role, programme, department, student_id, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user["id"],
                user["name"],
                (user.get("email") or "").strip().lower(),
                user["password"],
                user["role"],
                user.get("programme"),
                user.get("department"),
                user.get("student_id"),
                user.get("status", "active"),
                now_iso,
                now_iso,
            ),
        )

    # Seed Programs
    for prog in SEED_PROGRAMS:
        cursor.execute(
            """
            INSERT IGNORE INTO programs (program_id, program_code, program_name, department_name, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (prog["program_id"], prog["program_code"], prog["program_name"], prog["department_name"], now_iso),
        )

    # Seed Subjects
    for subj in SEED_SUBJECTS:
        cursor.execute(
            """
            INSERT IGNORE INTO subjects (subject_id, subject_code, subject_name, description, units, is_major, program_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                subj["subject_id"],
                subj["subject_code"],
                subj["subject_name"],
                subj["description"],
                subj["units"],
                subj["is_major"],
                subj["program_id"],
                now_iso,
            ),
        )

    # Seed Sections
    for sec in SEED_SECTIONS:
        cursor.execute(
            """
            INSERT IGNORE INTO sections (section_id, section_name, year_level, program_id, created_at)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (sec["section_id"], sec["section_name"], sec["year_level"], sec["program_id"], now_iso),
        )

    # Auto-provision Instructor Profiles for Teacher Users
    for user in SEED_USERS:
        if user["role"] in ["teacher", "programme-head"]:
            instructor_id = f"inst-{user['id']}"
            cursor.execute(
                """
                INSERT IGNORE INTO instructors (instructor_id, user_id, program_id, faculty_id_number, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (instructor_id, user["id"], "prog-bsit-001", f"FAC-{user['id'][-3:]}", now_iso),
            )
        elif user["role"] == "student":
            student_id = f"stud-{user['id']}"
            inst_id = user.get("student_id") or f"2023-000{user['id'][-1]}"
            cursor.execute(
                """
                INSERT IGNORE INTO students (student_id, user_id, institutional_id_number, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (student_id, user["id"], inst_id, now_iso),
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
        "exam_type": row.get("exam_type"),
        "academic_year": row.get("academic_year"),
        "semester": row.get("semester"),
        "subject": row.get("subject"),
        "course_code": row.get("course_code"),
        "section": row.get("section"),
        "program": row.get("program"),
        "instructor_name": row.get("instructor_name"),
        "subject_id": row.get("subject_id"),
        "instructor_id": row.get("instructor_id"),
        "num_items": row["num_items"] if row.get("num_items") is not None else 50,
        "passing_score": row.get("passing_score"),
        "instructions": row.get("instructions"),
        "exam_date": row.get("exam_date"),
        "created_at": row.get("created_at"),
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
        "SELECT id, name, email, password, role, programme, department, student_id, status, created_at, updated_at "
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
    student_id: Optional[str] = None,
) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    status = "pending"

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, name, email, password, role, programme, department, student_id, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            name.strip(),
            email.strip().lower(),
            password,
            role.strip().lower(),
            programme.strip() if programme else "BSIT",
            department.strip() if department else "Computing Studies",
            student_id.strip() if student_id else None,
            status,
            now_iso,
            now_iso,
        ),
    )

    # If student, link student profile
    if role.strip().lower() == "student" and student_id:
        stud_profile_id = str(uuid.uuid4())
        try:
            cursor.execute(
                """
                INSERT IGNORE INTO students (student_id, user_id, institutional_id_number, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (stud_profile_id, user_id, student_id.strip(), now_iso),
            )
        except Exception:
            pass

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
        "student_id": student_id.strip() if student_id else None,
        "status": status,
        "created_at": now_iso,
    }


def list_pending_users(programme: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if programme:
        cursor.execute(
            "SELECT id, name, email, role, programme, department, student_id, status, created_at "
            "FROM users WHERE status = 'pending' AND (programme = %s OR programme IS NULL) "
            "ORDER BY created_at DESC",
            (programme,),
        )
    else:
        cursor.execute(
            "SELECT id, name, email, role, programme, department, student_id, status, created_at "
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
    if updated and new_status == "active":
        cursor.execute("SELECT id, role, programme, student_id FROM users WHERE id = %s", (user_id,))
        u = cursor.fetchone()
        if u:
            if u["role"] in ["teacher", "programme-head"]:
                inst_id = f"inst-{uuid.uuid4().hex[:8]}"
                cursor.execute(
                    """
                    INSERT IGNORE INTO instructors (instructor_id, user_id, program_id, faculty_id_number, created_at)
                    VALUES (%s, %s, (SELECT program_id FROM programs WHERE program_code = %s LIMIT 1), %s, %s)
                    """,
                    (inst_id, user_id, u.get("programme") or "BSIT", f"FAC-{user_id[:6].upper()}", now_iso),
                )
            elif u["role"] == "student":
                st_id = f"stud-{uuid.uuid4().hex[:8]}"
                num = u.get("student_id") or f"STU-{user_id[:6].upper()}"
                cursor.execute(
                    """
                    INSERT IGNORE INTO students (student_id, user_id, institutional_id_number, created_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (st_id, user_id, num, now_iso),
                )
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
    student_id: Optional[str] = None,
) -> Dict[str, Any]:
    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO users (id, name, email, password, role, programme, department, student_id, status, created_at, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            user_id,
            name.strip(),
            email.strip().lower(),
            password,
            role.strip().lower(),
            programme.strip() if programme else "BSIT",
            department.strip() if department else "Computing Studies",
            student_id.strip() if student_id else None,
            status,
            now_iso,
            now_iso,
        ),
    )

    # Link profile if student
    if role.strip().lower() == "student" and student_id:
        try:
            cursor.execute(
                """
                INSERT IGNORE INTO students (student_id, user_id, institutional_id_number, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), user_id, student_id.strip(), now_iso),
            )
        except Exception:
            pass

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
        "student_id": student_id.strip() if student_id else None,
        "status": status,
        "created_at": now_iso,
    }


def list_all_users() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, name, email, role, programme, department, student_id, status, created_at "
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
        "student_id": user.get("student_id"),
        "status": user_status,
    }
    return {
        "success": True,
        "user": user_info,
        **user_info,
    }


# ==========================================
# Academic Master Operations (Programs, Subjects, Sections, Enrollments)
# ==========================================

def list_programs() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT program_id, program_code, program_name, department_name, created_at FROM programs ORDER BY program_code ASC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return list(rows)


def create_program(program_code: str, program_name: str, department_name: Optional[str] = None) -> Dict[str, Any]:
    program_id = f"prog-{program_code.strip().lower()}-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO programs (program_id, program_code, program_name, department_name, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (program_id, program_code.strip().upper(), program_name.strip(), department_name.strip() if department_name else None, now_iso),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {
        "program_id": program_id,
        "program_code": program_code.strip().upper(),
        "program_name": program_name.strip(),
        "department_name": department_name,
        "created_at": now_iso,
    }


def list_subjects(program_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if program_id:
        cursor.execute(
            """
            SELECT s.subject_id, s.subject_code, s.subject_name, s.description, s.units, s.is_major, s.program_id, p.program_code, s.created_at
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.program_id
            WHERE s.program_id = %s
            ORDER BY s.subject_code ASC
            """,
            (program_id,),
        )
    else:
        cursor.execute(
            """
            SELECT s.subject_id, s.subject_code, s.subject_name, s.description, s.units, s.is_major, s.program_id, p.program_code, s.created_at
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.program_id
            ORDER BY s.subject_code ASC
            """
        )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return list(rows)


def create_subject(
    subject_code: str,
    subject_name: str,
    program_id: str,
    description: Optional[str] = None,
    units: int = 3,
    is_major: int = 1,
) -> Dict[str, Any]:
    subject_id = f"subj-{subject_code.strip().lower()}-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO subjects (subject_id, subject_code, subject_name, description, units, is_major, program_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (subject_id, subject_code.strip().upper(), subject_name.strip(), description, units, is_major, program_id, now_iso),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {
        "subject_id": subject_id,
        "subject_code": subject_code.strip().upper(),
        "subject_name": subject_name.strip(),
        "description": description,
        "units": units,
        "is_major": is_major,
        "program_id": program_id,
        "created_at": now_iso,
    }


def list_sections(program_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    if program_id:
        cursor.execute(
            """
            SELECT s.section_id, s.section_name, s.year_level, s.program_id, p.program_code, s.created_at
            FROM sections s
            LEFT JOIN programs p ON s.program_id = p.program_id
            WHERE s.program_id = %s
            ORDER BY s.year_level ASC, s.section_name ASC
            """,
            (program_id,),
        )
    else:
        cursor.execute(
            """
            SELECT s.section_id, s.section_name, s.year_level, s.program_id, p.program_code, s.created_at
            FROM sections s
            LEFT JOIN programs p ON s.program_id = p.program_id
            ORDER BY s.year_level ASC, s.section_name ASC
            """
        )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return list(rows)


def create_section(section_name: str, year_level: int, program_id: str) -> Dict[str, Any]:
    section_id = f"sec-{section_name.strip().lower().replace(' ', '-')}-{uuid.uuid4().hex[:6]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO sections (section_id, section_name, year_level, program_id, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (section_id, section_name.strip(), year_level, program_id, now_iso),
    )
    conn.commit()
    cursor.close()
    conn.close()
    return {
        "section_id": section_id,
        "section_name": section_name.strip(),
        "year_level": year_level,
        "program_id": program_id,
        "created_at": now_iso,
    }


def list_enrollments(
    section_id: Optional[str] = None,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT e.enrollment_id, e.student_id, e.section_id, e.academic_year, e.semester, e.enrollment_status, e.enrolled_at,
               st.institutional_id_number, u.name AS student_name, u.email AS student_email,
               sec.section_name, p.program_code
        FROM enrollments e
        JOIN students st ON e.student_id = st.student_id
        JOIN users u ON st.user_id = u.id
        JOIN sections sec ON e.section_id = sec.section_id
        JOIN programs p ON sec.program_id = p.program_id
        WHERE 1=1
    """
    params = []
    if section_id:
        query += " AND e.section_id = %s"
        params.append(section_id)
    if academic_year:
        query += " AND e.academic_year = %s"
        params.append(academic_year)
    if semester:
        query += " AND e.semester = %s"
        params.append(semester)

    query += " ORDER BY u.name ASC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return list(rows)


def bulk_import_enrollments(
    section_id: str,
    academic_year: str,
    semester: str,
    students_list: List[Dict[str, str]],
) -> Dict[str, Any]:
    """
    Imports a class roster into the enrollments table.
    Auto-provisions placeholder Student/User accounts if the student is not yet registered.
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    enrolled_count = 0
    for s in students_list:
        inst_id = (s.get("student_id") or "").strip()
        name = (s.get("name") or "").strip()
        email = (s.get("email") or f"{inst_id.lower().replace('-', '')}@srcb.edu.ph").strip().lower()

        if not inst_id:
            continue

        # 1. Find or create student
        cursor.execute("SELECT student_id FROM students WHERE institutional_id_number = %s", (inst_id,))
        stud_row = cursor.fetchone()

        if stud_row:
            student_db_id = stud_row["student_id"]
        else:
            # Check user by email or create placeholder
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            user_row = cursor.fetchone()
            if user_row:
                user_id = user_row["id"]
            else:
                user_id = str(uuid.uuid4())
                cursor.execute(
                    """
                    INSERT INTO users (id, name, email, password, role, student_id, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, 'student', %s, 'active', %s, %s)
                    """,
                    (user_id, name or f"Student {inst_id}", email, "Student@2025", inst_id, now_iso, now_iso),
                )

            student_db_id = str(uuid.uuid4())
            cursor.execute(
                """
                INSERT INTO students (student_id, user_id, institutional_id_number, created_at)
                VALUES (%s, %s, %s, %s)
                """,
                (student_db_id, user_id, inst_id, now_iso),
            )

        # 2. Insert enrollment record
        enrollment_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO enrollments (enrollment_id, student_id, section_id, academic_year, semester, enrollment_status, enrolled_at)
            VALUES (%s, %s, %s, %s, %s, 'enrolled', %s)
            ON DUPLICATE KEY UPDATE enrollment_status = 'enrolled'
            """,
            (enrollment_id, student_db_id, section_id, academic_year, semester, now_iso),
        )
        enrolled_count += 1

    conn.commit()
    cursor.close()
    conn.close()
    return {"status": "success", "enrolled_count": enrolled_count}


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
    subject_id: Optional[str] = None,
    instructor_id: Optional[str] = None,
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
            subject_id, instructor_id,
            created_at
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            exam_date = VALUES(exam_date),
            subject_id = VALUES(subject_id),
            instructor_id = VALUES(instructor_id)
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
            subject_id,
            instructor_id,
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
        "subject_id": subject_id,
        "instructor_id": instructor_id,
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
    subject_id: Optional[str] = None,
    instructor_id: Optional[str] = None,
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
            exam_date = COALESCE(%s, exam_date),
            subject_id = COALESCE(%s, subject_id),
            instructor_id = COALESCE(%s, instructor_id)
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
            subject_id,
            instructor_id,
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
               section, program, instructor_name, subject_id, instructor_id,
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
               section, program, instructor_name, subject_id, instructor_id,
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
    student_id_extracted: Optional[str] = None,
) -> Dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()
    answers_str = json.dumps(answers)

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO submissions (id, exam_id, student_id, student_id_extracted, score, total_questions, answers, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (submission_id, exam_id, student_id, student_id_extracted or student_id, score, total_questions, answers_str, created_at),
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": submission_id,
        "exam_id": exam_id,
        "student_id": student_id,
        "student_id_extracted": student_id_extracted or student_id,
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
            "SELECT id, exam_id, student_id, student_id_extracted, score, total_questions, answers, created_at "
            "FROM submissions WHERE exam_id = %s ORDER BY created_at DESC",
            (exam_id,),
        )
    else:
        cursor.execute(
            "SELECT id, exam_id, student_id, student_id_extracted, score, total_questions, answers, created_at "
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
                "student_id_extracted": r.get("student_id_extracted") or r["student_id"],
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
        "average_score": float(avg_score),
        "total_submissions": int(total_submissions),
    }


# ==========================================
# Academic Management (Conceptual ERD Alignment)
# ==========================================

def list_programs() -> List[Dict[str, Any]]:
    """List all academic programs."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM programs ORDER BY program_code ASC")
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": r["program_id"],
            "program_id": r["program_id"],
            "program_code": r["program_code"],
            "program_name": r["program_name"],
            "department_name": r.get("department_name"),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def list_instructors(program_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all instructors with profile and assigned program information."""
    conn = get_db_connection()
    cursor = conn.cursor()
    query = """
        SELECT i.instructor_id, i.user_id, i.faculty_id_number, i.created_at,
               u.name, u.email, u.role, u.department,
               p.program_id, p.program_code, p.program_name
        FROM instructors i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN programs p ON i.program_id = p.program_id
        WHERE u.status = 'active'
    """
    params = []
    if program_id:
        query += " AND (i.program_id = %s OR i.program_id IS NULL)"
        params.append(program_id)
    query += " ORDER BY u.name ASC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()
    return [
        {
            "id": r["instructor_id"],
            "instructor_id": r["instructor_id"],
            "user_id": r["user_id"],
            "name": r["name"],
            "email": r["email"],
            "role": r["role"],
            "department": r["department"],
            "program_id": r["program_id"],
            "program_code": r["program_code"],
            "program_name": r["program_name"],
            "faculty_id_number": r["faculty_id_number"],
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def create_program(
    program_code: str,
    program_name: str,
    department_name: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a new academic program."""
    program_id = f"prog-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO programs (program_id, program_code, program_name, department_name, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (program_id, program_code.strip().upper(), program_name.strip(), department_name.strip() if department_name else None, now_iso),
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": program_id,
        "program_id": program_id,
        "program_code": program_code.strip().upper(),
        "program_name": program_name.strip(),
        "department_name": department_name.strip() if department_name else None,
        "created_at": now_iso,
    }


def list_subjects(program_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all subjects, optionally filtered by program_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if program_id:
        cursor.execute(
            """
            SELECT s.*, p.program_code, p.program_name
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.program_id
            WHERE s.program_id = %s
            ORDER BY s.subject_code ASC
            """,
            (program_id,),
        )
    else:
        cursor.execute(
            """
            SELECT s.*, p.program_code, p.program_name
            FROM subjects s
            LEFT JOIN programs p ON s.program_id = p.program_id
            ORDER BY s.subject_code ASC
            """
        )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "id": r["subject_id"],
            "subject_id": r["subject_id"],
            "subject_code": r["subject_code"],
            "subject_name": r["subject_name"],
            "description": r.get("description"),
            "units": r["units"],
            "is_major": r["is_major"],
            "program_id": r["program_id"],
            "program_code": r.get("program_code"),
            "program_name": r.get("program_name"),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def create_subject(
    subject_code: str,
    subject_name: str,
    program_id: str,
    description: Optional[str] = None,
    units: int = 3,
    is_major: int = 1,
) -> Dict[str, Any]:
    """Create a new subject in the course catalog."""
    subject_id = f"subj-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO subjects (subject_id, subject_code, subject_name, description, units, is_major, program_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            subject_id,
            subject_code.strip().upper(),
            subject_name.strip(),
            description.strip() if description else None,
            units,
            is_major,
            program_id,
            now_iso,
        ),
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": subject_id,
        "subject_id": subject_id,
        "subject_code": subject_code.strip().upper(),
        "subject_name": subject_name.strip(),
        "description": description.strip() if description else None,
        "units": units,
        "is_major": is_major,
        "program_id": program_id,
        "created_at": now_iso,
    }


def list_sections(program_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """List all class sections, optionally filtered by program_id."""
    conn = get_db_connection()
    cursor = conn.cursor()
    if program_id:
        cursor.execute(
            """
            SELECT sec.*, p.program_code, p.program_name
            FROM sections sec
            LEFT JOIN programs p ON sec.program_id = p.program_id
            WHERE sec.program_id = %s
            ORDER BY sec.year_level ASC, sec.section_name ASC
            """,
            (program_id,),
        )
    else:
        cursor.execute(
            """
            SELECT sec.*, p.program_code, p.program_name
            FROM sections sec
            LEFT JOIN programs p ON sec.program_id = p.program_id
            ORDER BY sec.year_level ASC, sec.section_name ASC
            """
        )
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "id": r["section_id"],
            "section_id": r["section_id"],
            "section_name": r["section_name"],
            "year_level": r["year_level"],
            "program_id": r["program_id"],
            "program_code": r.get("program_code"),
            "program_name": r.get("program_name"),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def create_section(
    section_name: str,
    year_level: int,
    program_id: str,
) -> Dict[str, Any]:
    """Create a new section under a program."""
    section_id = f"sec-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO sections (section_id, section_name, year_level, program_id, created_at)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (section_id, section_name.strip(), year_level, program_id, now_iso),
    )
    conn.commit()
    cursor.close()
    conn.close()

    return {
        "id": section_id,
        "section_id": section_id,
        "section_name": section_name.strip(),
        "year_level": year_level,
        "program_id": program_id,
        "created_at": now_iso,
    }


def list_enrollments(
    section_id: Optional[str] = None,
    academic_year: Optional[str] = None,
    semester: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """List student enrollments with student profile and section details."""
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT e.*, s.institutional_id_number, u.name AS student_name, u.email AS student_email,
               sec.section_name, sec.year_level, p.program_code, p.program_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.student_id
        JOIN users u ON s.user_id = u.id
        JOIN sections sec ON e.section_id = sec.section_id
        JOIN programs p ON sec.program_id = p.program_id
        WHERE 1=1
    """
    params = []
    if section_id:
        query += " AND e.section_id = %s"
        params.append(section_id)
    if academic_year:
        query += " AND e.academic_year = %s"
        params.append(academic_year)
    if semester:
        query += " AND e.semester = %s"
        params.append(semester)

    query += " ORDER BY u.name ASC"

    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    cursor.close()
    conn.close()

    return [
        {
            "id": r["enrollment_id"],
            "enrollment_id": r["enrollment_id"],
            "student_id": r["student_id"],
            "section_id": r["section_id"],
            "academic_year": r["academic_year"],
            "semester": r["semester"],
            "enrollment_status": r["enrollment_status"],
            "created_at": r["enrolled_at"],
            "enrolled_at": r["enrolled_at"],
            "student_number": r["institutional_id_number"],
            "institutional_id_number": r["institutional_id_number"],
            "full_name": r["student_name"],
            "student_name": r["student_name"],
            "email": r["student_email"],
            "student_email": r["student_email"],
            "section_name": r["section_name"],
            "year_level": r["year_level"],
            "program_code": r["program_code"],
            "program_name": r["program_name"],
        }
        for r in rows
    ]


def bulk_import_enrollments(
    section_id: str,
    *args,
    **kwargs,
) -> Dict[str, Any]:
    """
    Bulk enrolls students into a section.
    Supports signatures:
      bulk_import_enrollments(section_id, students, academic_year, semester)
      bulk_import_enrollments(section_id, academic_year, semester, students)
    """
    students = kwargs.get("students")
    academic_year = kwargs.get("academic_year", "2025-2026")
    semester = kwargs.get("semester", "1st Semester")

    if args:
        if len(args) == 1 and isinstance(args[0], list):
            students = args[0]
        elif len(args) == 3 and isinstance(args[0], str) and isinstance(args[2], list):
            academic_year, semester, students = args[0], args[1], args[2]
        elif len(args) == 3 and isinstance(args[0], list):
            students, academic_year, semester = args[0], args[1], args[2]
        elif len(args) == 2 and isinstance(args[0], list):
            students, academic_year = args[0], args[1]
        elif len(args) == 2 and isinstance(args[1], list):
            academic_year, students = args[0], args[1]

    if students is None:
        students = []

    conn = get_db_connection()
    cursor = conn.cursor()

    # Validate section exists
    cursor.execute("SELECT section_id, program_id FROM sections WHERE section_id = %s", (section_id,))
    sec_row = cursor.fetchone()
    if not sec_row:
        cursor.close()
        conn.close()
        raise ValueError(f"Section {section_id} does not exist.")

    enrolled_count = 0
    created_students = 0
    errors = []
    now_iso = datetime.now(timezone.utc).isoformat()

    for idx, item in enumerate(students):
        student_id_num = (item.get("student_id") or item.get("student_number") or "").strip()
        name = (item.get("name") or item.get("full_name") or "").strip()
        email = (item.get("email") or f"{student_id_num.lower().replace('-', '')}@school.edu.ph").strip().lower()

        if not student_id_num or not name:
            errors.append(f"Row {idx+1}: Missing student_id or name.")
            continue

        try:
            # 1. Find existing student record
            cursor.execute("SELECT student_id, user_id FROM students WHERE institutional_id_number = %s", (student_id_num,))
            st_row = cursor.fetchone()

            if not st_row:
                # Check if user with this email or student_id exists
                cursor.execute("SELECT id FROM users WHERE email = %s OR student_id = %s", (email, student_id_num))
                u_row = cursor.fetchone()

                if u_row:
                    user_id = u_row["id"]
                else:
                    user_id = str(uuid.uuid4())
                    cursor.execute(
                        """
                        INSERT INTO users (id, name, email, password, role, programme, student_id, status, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, 'student', 'BSIT', %s, 'active', %s, %s)
                        """,
                        (user_id, name, email, "Student@2025", student_id_num, now_iso, now_iso),
                    )

                student_pk = f"stud-{uuid.uuid4().hex[:8]}"
                cursor.execute(
                    """
                    INSERT INTO students (student_id, user_id, institutional_id_number, created_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (student_pk, user_id, student_id_num, now_iso),
                )
                created_students += 1
            else:
                student_pk = st_row["student_id"]

            # 2. Insert enrollment record (ignoring duplicate)
            enrollment_id = f"enr-{uuid.uuid4().hex[:8]}"
            cursor.execute(
                """
                INSERT INTO enrollments (enrollment_id, student_id, section_id, academic_year, semester, enrollment_status, enrolled_at)
                VALUES (%s, %s, %s, %s, %s, 'enrolled', %s)
                ON DUPLICATE KEY UPDATE enrollment_status = 'enrolled'
                """,
                (enrollment_id, student_pk, section_id, academic_year, semester, now_iso),
            )
            enrolled_count += 1
        except Exception as e:
            errors.append(f"Row {idx+1} ({student_id_num}): {str(e)}")

    conn.commit()
    cursor.close()
    conn.close()

    return {
        "total": len(students),
        "enrolled": enrolled_count,
        "created_students": created_students,
        "errors": errors,
    }