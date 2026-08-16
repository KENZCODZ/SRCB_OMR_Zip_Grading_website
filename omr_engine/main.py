from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from contextlib import asynccontextmanager
from typing import Optional, Dict, Any, List
import uuid
import os
import sys
import cv2
import numpy as np
from datetime import datetime, timezone

# Add current directory to path to prevent ModuleNotFoundError when run from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import (
    init_db,
    get_db,
    User,
    Exam,
    AnswerKey,
    Submission,
    SubmissionAnswer,
)
from omr import OMREngine, OMRCornerDetectionError

# Lifespan events handler (modern replacement for startup/shutdown events)
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

# Initialize FastAPI App
app = FastAPI(title="OMR Grading System API", lifespan=lifespan)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ExamCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Name of the exam")
    answer_key: dict = Field(..., description="Mapping of question numbers (1-50) to answers (A-E)")

class ExamUpdate(BaseModel):
    answer_key: dict = Field(..., description="Mapping of question numbers (1-50) to answers (A-E)")

class LoginRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="Full Name")
    email: str = Field(..., min_length=5, description="Institutional School Email")
    password: str = Field(..., min_length=6, description="Password")
    role: str = Field(..., description="Requested Role: teacher or student")
    programme: str = Field(default="BSIT", description="Academic Programme")
    department: str = Field(default="Computing Studies", description="Academic Department")
    student_id: str = Field(default="", description="Student ID number if student")

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Initialize OMR engine
omr_engine = OMREngine()


# ==========================================
# Authentication & User Management Routes
# ==========================================

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def register_new_user(payload: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email is already registered
    existing_user = db.query(User).filter(
        func.lower(User.email) == payload.email.strip().lower()
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this school email is already registered.",
        )

    # Validate role
    role_normalized = payload.role.strip().lower()
    if role_normalized not in ["teacher", "student", "faculty"]:
        role_normalized = "teacher"
    if role_normalized == "faculty":
        role_normalized = "teacher"

    user_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()
    status_val = "pending"

    new_user = User(
        id=user_id,
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        password=payload.password,
        role=role_normalized,
        programme=payload.programme.strip() if payload.programme else "BSIT",
        department=payload.department.strip() if payload.department else "Computing Studies",
        status=status_val,
        created_at=now_iso,
        updated_at=now_iso,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "status": "success",
        "message": "Registration submitted successfully! Your account is pending confirmation by the Programme Head.",
        "user": new_user.to_dict(),
    }


@app.post("/api/auth/login")
def login_user(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        func.lower(User.email) == payload.email.strip().lower()
    ).first()

    if not user or user.password != payload.password:
        raise HTTPException(
            status_code=401,
            detail="Invalid school email or password.",
        )

    user_status = user.status or "active"
    if user_status == "pending":
        raise HTTPException(
            status_code=403,
            detail="Your registration is currently pending confirmation by the Programme Head. Please await approval before signing in.",
        )
    elif user_status == "rejected":
        raise HTTPException(
            status_code=403,
            detail="Your registration request was not approved by the Programme Head.",
        )

    return user.to_dict()


@app.get("/api/users/pending")
def get_pending_registrations(programme: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(User).filter(User.status == "pending")
    if programme:
        query = query.filter((User.programme == programme) | (User.programme.is_(None)))
    users = query.order_by(User.created_at.desc()).all()
    return [u.to_dict() for u in users]


@app.post("/api/users/{user_id}/approve")
def approve_pending_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pending user not found or already processed.")
    
    user.status = "active"
    user.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    return {"status": "success", "message": "User registration confirmed and account activated."}


@app.post("/api/users/{user_id}/reject")
def reject_pending_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pending user not found or already processed.")
    
    user.status = "rejected"
    user.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    return {"status": "success", "message": "User registration request has been rejected."}


@app.get("/api/dashboard/summary")
def dashboard_summary(db: Session = Depends(get_db)):
    total_students = db.query(func.count(User.id)).filter(
        User.role == "student",
        User.status == "active",
    ).scalar() or 0

    total_exams = db.query(func.count(Exam.exam_id)).scalar() or 0

    avg_score_raw = db.query(func.avg(Submission.score)).scalar()
    average_score = round(float(avg_score_raw), 2) if avg_score_raw is not None else 0.0

    total_submissions = db.query(func.count(Submission.submission_id)).scalar() or 0

    return {
        "total_students": int(total_students),
        "total_exams": int(total_exams),
        "average_score": average_score,
        "total_submissions": int(total_submissions),
    }


# ==========================================
# Exam Management Routes
# ==========================================

@app.post("/api/exams", status_code=status.HTTP_201_CREATED)
def create_new_exam(exam_data: ExamCreate, db: Session = Depends(get_db)):
    exam_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    # Validate answer key format: keys should be string representations of 1-50
    validated_keys = {}
    for q, ans in exam_data.answer_key.items():
        try:
            q_num = int(q)
            if q_num < 1 or q_num > 50:
                raise HTTPException(status_code=400, detail="Question number must be between 1 and 50.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Question keys must be integers.")

        ans_clean = str(ans).strip().upper()
        if ans_clean not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(status_code=400, detail=f"Invalid option '{ans}' for question {q}. Must be A, B, C, D, or E.")
        validated_keys[q_num] = ans_clean

    new_exam = Exam(
        exam_id=exam_id,
        exam_name=exam_data.name.strip(),
        created_at=now_iso,
    )
    db.add(new_exam)
    db.flush()

    for q_num, ans_opt in validated_keys.items():
        ak = AnswerKey(
            exam_id=exam_id,
            question_number=q_num,
            correct_option=ans_opt,
        )
        db.add(ak)

    db.commit()
    db.refresh(new_exam)
    return new_exam.to_dict()


@app.put("/api/exams/{exam_id}")
def edit_exam_key(exam_id: str, exam_data: ExamUpdate, db: Session = Depends(get_db)):
    existing = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Exam not found.")

    validated_keys = {}
    for q, ans in exam_data.answer_key.items():
        try:
            q_num = int(q)
            if q_num < 1 or q_num > 50:
                raise HTTPException(status_code=400, detail="Question number must be between 1 and 50.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Question keys must be integers.")

        ans_clean = str(ans).strip().upper()
        if ans_clean not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(status_code=400, detail=f"Invalid option '{ans}' for question {q}. Must be A, B, C, D, or E.")
        validated_keys[q_num] = ans_clean

    # Clear old answer keys and add new ones
    db.query(AnswerKey).filter(AnswerKey.exam_id == exam_id).delete()
    db.flush()

    for q_num, ans_opt in validated_keys.items():
        ak = AnswerKey(
            exam_id=exam_id,
            question_number=q_num,
            correct_option=ans_opt,
        )
        db.add(ak)

    db.commit()
    return {"status": "success", "message": "Exam key updated successfully."}


@app.get("/api/exams")
def get_all_exams(db: Session = Depends(get_db)):
    exams = db.query(Exam).order_by(Exam.created_at.desc()).all()
    return [exam.to_dict() for exam in exams]


@app.delete("/api/exams/{exam_id}")
def delete_existing_exam(exam_id: str, db: Session = Depends(get_db)):
    existing = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Exam not found.")

    db.delete(existing)
    db.commit()
    return {"status": "success", "message": "Exam and all its submissions deleted successfully."}


# ==========================================
# OMR Grading & Submission Routes
# ==========================================

@app.post("/api/grade")
async def grade_exam_sheet(
    exam_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # 1. Validate exam exists
    exam = db.query(Exam).filter(Exam.exam_id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found.")

    # 2. Validate file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum limit of 10MB.")

    # 3. Validate content type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Unsupported media type. Only image uploads are allowed.")

    # 4. Convert bytes to OpenCV image
    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode the uploaded image file.")

    # 5. Process through OMR engine
    exam_dict = exam.to_dict()
    try:
        results = omr_engine.grade_sheet(image, exam_dict["answer_key"])
    except OMRCornerDetectionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during grading: {str(e)}")

    # 6. Save submission to MySQL database via SQLAlchemy
    submission_id = str(uuid.uuid4())
    now_iso = datetime.now(timezone.utc).isoformat()

    sub = Submission(
        submission_id=submission_id,
        exam_id=exam_id,
        student_id=results["student_id"],
        score=results["score"],
        total_questions=results["total_questions"],
        graded_at=now_iso,
    )
    db.add(sub)
    db.flush()

    for q_str, ans_data in results["answers"].items():
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
        db.add(sa)

    db.commit()

    # 7. Return graded results
    return {
        "submission_id": submission_id,
        "student_id": results["student_id"],
        "score": results["score"],
        "total_questions": results["total_questions"],
        "answers": results["answers"],
        "overlay_image": results["overlay_base64"],
    }


@app.get("/api/submissions")
def get_all_submissions(exam_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Submission)
    if exam_id:
        query = query.filter(Submission.exam_id == exam_id)
    submissions = query.order_by(Submission.graded_at.desc()).all()
    return [sub.to_dict() for sub in submissions]


@app.post("/api/extract")
async def extract_sheet_answers(
    file: UploadFile = File(...)
):
    # 1. Validate file size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds maximum limit of 10MB.")

    # 2. Validate content type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Unsupported media type. Only image uploads are allowed.")

    # 3. Convert bytes to OpenCV image
    nparr = np.frombuffer(file_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Could not decode the uploaded image file.")

    # 4. Process through OMR engine
    try:
        results = omr_engine.extract_answers(image)
    except OMRCornerDetectionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during bubble extraction: {str(e)}")

    # 5. Return results
    return {
        "student_id": results["student_id"],
        "answers": results["answers"],
        "overlay_image": results["overlay_base64"],
    }


# Ensure frontend/dist exists before mounting to avoid FastAPI startup crash
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Frontend", "dist"))
if not os.path.exists(frontend_dir):
    os.makedirs(frontend_dir, exist_ok=True)
    with open(os.path.join(frontend_dir, "index.html"), "w") as f:
        f.write("<h1>OMR Frontend Building... Please run npm run build in frontend/ directory.</h1>")

app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
