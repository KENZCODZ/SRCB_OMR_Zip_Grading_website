import os
import uuid
from datetime import datetime, timezone
from contextlib import contextmanager
from typing import Generator, Optional, Dict, Any, List
from urllib.parse import quote_plus
from dotenv import load_dotenv

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    SmallInteger,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    func,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session

# Load environment variables
load_dotenv()

DB_TYPE = os.getenv("DB_TYPE", "mysql").lower()
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "aeroomr_db")

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

Base = declarative_base()


# ==========================================
# SQLAlchemy ORM Models (Normalized Schema)
# ==========================================

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    programme = Column(String(100), nullable=True)
    department = Column(String(255), nullable=True)
    status = Column(String(20), nullable=False, default="active", index=True)
    created_at = Column(String(50), nullable=False)
    updated_at = Column(String(50), nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "password": self.password,
            "role": self.role,
            "programme": self.programme,
            "department": self.department,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


class Exam(Base):
    __tablename__ = "exams"

    exam_id = Column(String(64), primary_key=True)
    exam_name = Column(String(255), nullable=False)
    created_at = Column(String(50), nullable=False)

    answer_keys = relationship(
        "AnswerKey",
        back_populates="exam",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="AnswerKey.question_number",
    )

    submissions = relationship(
        "Submission",
        back_populates="exam",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @property
    def id(self) -> str:
        return self.exam_id

    @property
    def name(self) -> str:
        return self.exam_name

    def to_dict(self) -> Dict[str, Any]:
        # Construct answer_key dict: {"1": "A", "2": "B", ...}
        key_map = {}
        for ak in self.answer_keys:
            key_map[str(ak.question_number)] = ak.correct_option

        return {
            "id": self.exam_id,
            "name": self.exam_name,
            "answer_key": key_map,
            "created_at": self.created_at,
        }


class AnswerKey(Base):
    __tablename__ = "answer_keys"

    answer_key_id = Column(Integer, primary_key=True, autoincrement=True)
    exam_id = Column(String(64), ForeignKey("exams.exam_id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False, index=True)
    question_number = Column(SmallInteger, nullable=False)
    correct_option = Column(String(1), nullable=False)

    exam = relationship("Exam", back_populates="answer_keys")

    __table_args__ = (
        UniqueConstraint("exam_id", "question_number", name="uq_answer_keys_exam_question"),
        CheckConstraint("question_number BETWEEN 1 AND 50", name="chk_answer_keys_question_number"),
    )


class Submission(Base):
    __tablename__ = "submissions"

    submission_id = Column(String(64), primary_key=True)
    exam_id = Column(String(64), ForeignKey("exams.exam_id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False, index=True)
    student_id = Column(String(64), nullable=True)
    score = Column(SmallInteger, nullable=False)
    total_questions = Column(SmallInteger, nullable=False)
    graded_at = Column(String(50), nullable=False)

    exam = relationship("Exam", back_populates="submissions")

    answers = relationship(
        "SubmissionAnswer",
        back_populates="submission",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="SubmissionAnswer.question_number",
    )

    @property
    def id(self) -> str:
        return self.submission_id

    @property
    def created_at(self) -> str:
        return self.graded_at

    def to_dict(self) -> Dict[str, Any]:
        answers_map = {}
        for ans in self.answers:
            answers_map[str(ans.question_number)] = {
                "selected": ans.selected_option,
                "is_empty": bool(ans.is_empty),
                "is_ambiguous": bool(ans.is_ambiguous),
            }

        return {
            "id": self.submission_id,
            "exam_id": self.exam_id,
            "student_id": self.student_id,
            "score": self.score,
            "total_questions": self.total_questions,
            "answers": answers_map,
            "created_at": self.graded_at,
        }


class SubmissionAnswer(Base):
    __tablename__ = "submission_answers"

    submission_answer_id = Column(Integer, primary_key=True, autoincrement=True)
    submission_id = Column(String(64), ForeignKey("submissions.submission_id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False, index=True)
    question_number = Column(SmallInteger, nullable=False)
    selected_option = Column(String(5), nullable=True)
    is_ambiguous = Column(Boolean, nullable=False, default=False)
    is_empty = Column(Boolean, nullable=False, default=False)

    submission = relationship("Submission", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("submission_id", "question_number", name="uq_submission_answers_submission_question"),
        CheckConstraint("question_number BETWEEN 1 AND 50", name="chk_submission_answers_question_number"),
    )


# ==========================================
# Engine & Session Management
# ==========================================

class DatabaseManager:
    def __init__(self):
        self.is_mysql = False
        self.engine = None
        self.SessionLocal = None
        self._init_engine()

    def _ensure_mysql_database(self):
        """Connect to MySQL server and ensure target database exists."""
        encoded_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else ""
        auth_part = f"{DB_USER}:{encoded_password}" if encoded_password else DB_USER
        server_url = f"mysql+pymysql://{auth_part}@{DB_HOST}:{DB_PORT}/?charset=utf8mb4"

        temp_engine = create_engine(server_url, isolation_level="AUTOCOMMIT", pool_pre_ping=True)
        with temp_engine.connect() as conn:
            conn.execute(
                text(f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            )
        temp_engine.dispose()

    def _init_engine(self):
        self._ensure_mysql_database()
        encoded_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else ""
        auth_part = f"{DB_USER}:{encoded_password}" if encoded_password else DB_USER
        db_url = f"mysql+pymysql://{auth_part}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

        self.engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        with self.engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        self.is_mysql = True
        print(f"[Database] Connected to MySQL via SQLAlchemy at {DB_HOST}:{DB_PORT}/{DB_NAME}")
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)


db_mgr = DatabaseManager()
engine = db_mgr.engine
SessionLocal = db_mgr.SessionLocal


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for atomic, transactional SQLAlchemy sessions."""
    session = db_mgr.SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a SQLAlchemy session."""
    session = db_mgr.SessionLocal()
    try:
        yield session
    finally:
        session.close()


class DatabaseConnectionProxy:
    """Provides backward compatibility for raw execute/commit calls."""
    def __init__(self, session: Session):
        self.session = session

    def execute(self, statement: str, params: Optional[Any] = None):
        if params is None:
            return self.session.execute(text(statement))
        if isinstance(params, (list, tuple)):
            return self.session.execute(text(statement), list(params))
        if isinstance(params, dict):
            return self.session.execute(text(statement), params)
        return self.session.execute(text(statement), [params])

    def commit(self):
        self.session.commit()

    def close(self):
        self.session.close()

    def cursor(self):
        return self.session.connection().connection.cursor()


def get_db_connection() -> DatabaseConnectionProxy:
    return DatabaseConnectionProxy(db_mgr.SessionLocal())


# ==========================================
# Database Initialization & Seeding
# ==========================================

def init_db():
    """Ensure all schema tables exist and seed initial default users."""
    Base.metadata.create_all(bind=db_mgr.engine)

    with get_db_session() as session:
        now_iso = datetime.now(timezone.utc).isoformat()
        for u in SEED_USERS:
            existing = session.query(User).filter(
                (User.id == u["id"]) | (func.lower(User.email) == u["email"].lower())
            ).first()

            if not existing:
                new_user = User(
                    id=u["id"],
                    name=u["name"],
                    email=u["email"].strip().lower(),
                    password=u["password"],
                    role=u["role"],
                    programme=u["programme"],
                    department=u["department"],
                    status=u.get("status", "active"),
                    created_at=now_iso,
                    updated_at=now_iso,
                )
                session.add(new_user)


# ==========================================
# User & Authentication Operations
# ==========================================

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    with get_db_session() as session:
        user = session.query(User).filter(func.lower(User.email) == email.strip().lower()).first()
        return user.to_dict() if user else None


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

    with get_db_session() as session:
        user = User(
            id=user_id,
            name=name.strip(),
            email=email.strip().lower(),
            password=password,
            role=role.strip().lower(),
            programme=programme.strip() if programme else None,
            department=department.strip() if department else None,
            status=status,
            created_at=now_iso,
            updated_at=now_iso,
        )
        session.add(user)

    return {
        "id": user_id,
        "name": name.strip(),
        "email": email.strip().lower(),
        "role": role,
        "programme": programme,
        "department": department,
        "status": status,
        "created_at": now_iso,
    }


def list_pending_users(programme: Optional[str] = None) -> List[Dict[str, Any]]:
    with get_db_session() as session:
        query = session.query(User).filter(User.status == "pending")
        if programme:
            query = query.filter((User.programme == programme) | (User.programme.is_(None)))
        users = query.order_by(User.created_at.desc()).all()

        return [
            {
                "id": u.id,
                "name": u.name,
                "email": u.email,
                "role": u.role,
                "programme": u.programme,
                "department": u.department,
                "status": u.status,
                "created_at": u.created_at,
            }
            for u in users
        ]


def update_user_status(user_id: str, new_status: str) -> bool:
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db_session() as session:
        user = session.query(User).filter(User.id == user_id).first()
        if user:
            user.status = new_status
            user.updated_at = now_iso
            return True
        return False


def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    user = get_user_by_email(email)
    if not user:
        return {"success": False, "error": "invalid_credentials", "message": "Invalid school email or password."}

    if user["password"] != password:
        return {"success": False, "error": "invalid_credentials", "message": "Invalid school email or password."}

    user_status = user.get("status", "active")
    if user_status == "pending":
        return {
            "success": False,
            "error": "pending_approval",
            "message": "Your registration is currently pending approval by the Programme Head. Please wait for confirmation.",
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

def save_exam(exam_id: str, name: str, answer_key: Dict[str, Any]) -> Dict[str, Any]:
    created_at = datetime.now(timezone.utc).isoformat()

    with get_db_session() as session:
        # Check if exam exists
        exam = session.query(Exam).filter(Exam.exam_id == exam_id).first()
        if not exam:
            exam = Exam(
                exam_id=exam_id,
                exam_name=name.strip(),
                created_at=created_at,
            )
            session.add(exam)
            session.flush()
        else:
            exam.exam_name = name.strip()
            # Clear old answer keys
            session.query(AnswerKey).filter(AnswerKey.exam_id == exam_id).delete()
            session.flush()

        # Insert answer keys
        for q_str, option in answer_key.items():
            try:
                q_num = int(q_str)
                ak = AnswerKey(
                    exam_id=exam_id,
                    question_number=q_num,
                    correct_option=str(option).strip().upper(),
                )
                session.add(ak)
            except ValueError:
                continue

    return {
        "id": exam_id,
        "name": name.strip(),
        "answer_key": answer_key,
        "created_at": created_at,
    }


def update_exam(exam_id: str, answer_key: Dict[str, Any]) -> bool:
    with get_db_session() as session:
        exam = session.query(Exam).filter(Exam.exam_id == exam_id).first()
        if not exam:
            return False

        session.query(AnswerKey).filter(AnswerKey.exam_id == exam_id).delete()
        session.flush()

        for q_str, option in answer_key.items():
            try:
                q_num = int(q_str)
                ak = AnswerKey(
                    exam_id=exam_id,
                    question_number=q_num,
                    correct_option=str(option).strip().upper(),
                )
                session.add(ak)
            except ValueError:
                continue

        return True


def get_exam(exam_id: str) -> Optional[Dict[str, Any]]:
    with get_db_session() as session:
        exam = session.query(Exam).filter(Exam.exam_id == exam_id).first()
        return exam.to_dict() if exam else None


def list_exams() -> List[Dict[str, Any]]:
    with get_db_session() as session:
        exams = session.query(Exam).order_by(Exam.created_at.desc()).all()
        return [exam.to_dict() for exam in exams]


def delete_exam(exam_id: str) -> bool:
    with get_db_session() as session:
        exam = session.query(Exam).filter(Exam.exam_id == exam_id).first()
        if exam:
            session.delete(exam)
            return True
        return False


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

    with get_db_session() as session:
        sub = session.query(Submission).filter(Submission.submission_id == submission_id).first()
        if not sub:
            sub = Submission(
                submission_id=submission_id,
                exam_id=exam_id,
                student_id=student_id,
                score=score,
                total_questions=total_questions,
                graded_at=created_at,
            )
            session.add(sub)
            session.flush()
        else:
            sub.exam_id = exam_id
            sub.student_id = student_id
            sub.score = score
            sub.total_questions = total_questions
            session.query(SubmissionAnswer).filter(SubmissionAnswer.submission_id == submission_id).delete()
            session.flush()

        # Insert per-question answers
        for q_str, ans_data in answers.items():
            try:
                q_num = int(q_str)
            except ValueError:
                continue

            if isinstance(ans_data, dict):
                sel = ans_data.get("selected")
                is_amb = bool(ans_data.get("is_ambiguous", False))
                is_emp = bool(ans_data.get("is_empty", False))
            else:
                sel = str(ans_data) if ans_data else None
                is_amb = False
                is_emp = (sel is None or sel == "")

            sa = SubmissionAnswer(
                submission_id=submission_id,
                question_number=q_num,
                selected_option=sel,
                is_ambiguous=is_amb,
                is_empty=is_emp,
            )
            session.add(sa)

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
    with get_db_session() as session:
        query = session.query(Submission)
        if exam_id:
            query = query.filter(Submission.exam_id == exam_id)
        submissions = query.order_by(Submission.graded_at.desc()).all()
        return [sub.to_dict() for sub in submissions]


# ==========================================
# Dashboard & Analytics
# ==========================================

def get_dashboard_summary() -> Dict[str, Any]:
    with get_db_session() as session:
        total_students = session.query(func.count(User.id)).filter(
            User.role == "student",
            User.status == "active",
        ).scalar() or 0

        total_exams = session.query(func.count(Exam.exam_id)).scalar() or 0

        avg_score_raw = session.query(func.avg(Submission.score)).scalar()
        average_score = round(float(avg_score_raw), 2) if avg_score_raw is not None else 0.0

        total_submissions = session.query(func.count(Submission.submission_id)).scalar() or 0

    return {
        "total_students": int(total_students),
        "total_exams": int(total_exams),
        "average_score": average_score,
        "total_submissions": int(total_submissions),
    }


if __name__ == "__main__":
    init_db()
    print("Database tables initialized successfully via SQLAlchemy.")
