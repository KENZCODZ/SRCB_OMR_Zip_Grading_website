from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
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
    save_exam,
    update_exam,
    get_exam,
    list_exams,
    delete_exam,
    save_submission,
    list_submissions,
    get_dashboard_summary,
    get_user_by_email,
    register_user,
    list_pending_users,
    update_user_status,
    authenticate_user,
)
from omr import OMREngine, OMRCornerDetectionError

# Lifespan events handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

# Initialize FastAPI App
app = FastAPI(title="OMR Grading System API", lifespan=lifespan)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:5174",   # Vite dev server fallback port
        "http://localhost:8000",   # FastAPI production serve
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:8000",
        "http://0.0.0.0:5173",
        "http://0.0.0.0:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Schemas
class ExamCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Full examination title")
    answer_key: dict[str, str] = Field(..., description="Mapping of question numbers (1-100) to answers (A-E)")

    # Academic metadata
    exam_type: Optional[str] = Field(None, description="Preliminary | Midterm | Pre-Final | Final")
    academic_year: Optional[str] = Field(None, description="e.g. 2025-2026")
    semester: Optional[str] = Field(None, description="1st Semester | 2nd Semester | Summer")
    subject: Optional[str] = Field(None, description="Course / Subject name")
    course_code: Optional[str] = Field(None, description="Course code e.g. ITP305")
    section: Optional[str] = Field(None, description="Class section e.g. BSIT 3-A")
    program: Optional[str] = Field(None, description="Programme / Department")
    instructor_name: Optional[str] = Field(None, description="Name of the instructor")

    # Examination settings
    num_items: Optional[int] = Field(50, ge=1, le=100, description="Total number of test items (1-100)")
    passing_score: Optional[int] = Field(None, ge=0, description="Optional raw score threshold")
    instructions: Optional[str] = Field(None, description="Optional instructions for students")
    exam_date: Optional[str] = Field(None, description="Scheduled exam date (YYYY-MM-DD)")


class ExamUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, description="Full examination title")
    answer_key: dict[str, str] = Field(..., description="Mapping of question numbers (1-100) to answers (A-E)")

    # All metadata fields are optional on update (PATCH-like semantics)
    exam_type: Optional[str] = None
    academic_year: Optional[str] = None
    semester: Optional[str] = None
    subject: Optional[str] = None
    course_code: Optional[str] = None
    section: Optional[str] = None
    program: Optional[str] = None
    instructor_name: Optional[str] = None
    num_items: Optional[int] = Field(None, ge=1, le=100)
    passing_score: Optional[int] = Field(None, ge=0)
    instructions: Optional[str] = None
    exam_date: Optional[str] = None


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
def register_new_user(payload: RegisterRequest):
    # Check if email is already registered
    existing_user = get_user_by_email(payload.email)
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

    created_user = register_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=role_normalized,
        programme=payload.programme,
        department=payload.department,
    )

    return {
        "status": "success",
        "message": "Registration submitted successfully! Your account is pending confirmation by the Programme Head.",
        "user": created_user,
    }


@app.post("/api/auth/login")
def login_user(payload: LoginRequest):
    res = authenticate_user(payload.email, payload.password)
    if not res.get("success"):
        error_code = res.get("error")
        if error_code == "pending_approval":
            raise HTTPException(
                status_code=403,
                detail="Your registration is currently pending confirmation by the Programme Head. Please await approval before signing in.",
            )
        elif error_code == "account_rejected":
            raise HTTPException(
                status_code=403,
                detail="Your registration request was not approved by the Programme Head.",
            )
        else:
            raise HTTPException(
                status_code=401,
                detail="Invalid school email or password.",
            )
    return res.get("user")


@app.get("/api/users/pending")
def get_pending_registrations(programme: Optional[str] = None):
    return list_pending_users(programme)


@app.post("/api/users/{user_id}/approve")
def approve_pending_user(user_id: str):
    success = update_user_status(user_id, "active")
    if not success:
        raise HTTPException(status_code=404, detail="Pending user not found or already processed.")
    return {"status": "success", "message": "User registration confirmed and account activated."}


@app.post("/api/users/{user_id}/reject")
def reject_pending_user(user_id: str):
    success = update_user_status(user_id, "rejected")
    if not success:
        raise HTTPException(status_code=404, detail="Pending user not found or already processed.")
    return {"status": "success", "message": "User registration request has been rejected."}


@app.get("/api/dashboard/summary")
def dashboard_summary():
    return get_dashboard_summary()


# ==========================================
# Exam Management Routes
# ==========================================

@app.post("/api/exams", status_code=status.HTTP_201_CREATED)
def create_new_exam(exam: ExamCreate):
    exam_id = str(uuid.uuid4())
    num_items = exam.num_items or 50

    if num_items < 1 or num_items > 100:
        raise HTTPException(status_code=400, detail="Number of items must be between 1 and 100.")

    valid_answer_key: dict[str, str] = {}
    for q, ans in exam.answer_key.items():
        try:
            q_num = int(q)
            if q_num < 1 or q_num > num_items:
                raise HTTPException(
                    status_code=400,
                    detail=f"Question number {q_num} is outside the configured range of 1 to {num_items} for this exam.",
                )
        except ValueError:
            raise HTTPException(status_code=400, detail="Question keys must be integers.")

        ans_clean = str(ans).strip().upper()
        if ans_clean not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid option '{ans}' for question {q}. Must be A, B, C, D, or E.",
            )

        valid_answer_key[str(q_num)] = ans_clean

    if len(valid_answer_key) != num_items:
        raise HTTPException(
            status_code=400,
            detail=f"Answer key mismatch! This exam is configured for {num_items} items, but {len(valid_answer_key)} answers were provided.",
        )

    res = save_exam(
        exam_id=exam_id,
        name=exam.name,
        answer_key=valid_answer_key,
        exam_type=exam.exam_type,
        academic_year=exam.academic_year,
        semester=exam.semester,
        subject=exam.subject,
        course_code=exam.course_code,
        section=exam.section,
        program=exam.program,
        instructor_name=exam.instructor_name,
        num_items=num_items,
        passing_score=exam.passing_score,
        instructions=exam.instructions,
        exam_date=exam.exam_date,
    )
    return res


@app.put("/api/exams/{exam_id}")
def edit_exam_key(exam_id: str, exam: ExamUpdate):
    existing = get_exam(exam_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Exam not found.")

    target_num_items = exam.num_items if exam.num_items is not None else (existing.get("num_items") or 50)
    if target_num_items < 1 or target_num_items > 100:
        raise HTTPException(status_code=400, detail="Number of items must be between 1 and 100.")

    valid_answer_key: dict[str, str] = {}
    for q, ans in exam.answer_key.items():
        try:
            q_num = int(q)
            if q_num < 1 or q_num > target_num_items:
                raise HTTPException(
                    status_code=400,
                    detail=f"Question number {q_num} is outside the configured range of 1 to {target_num_items} for this exam.",
                )
        except ValueError:
            raise HTTPException(status_code=400, detail="Question keys must be integers.")

        ans_clean = str(ans).strip().upper()
        if ans_clean not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid option '{ans}' for question {q}. Must be A, B, C, D, or E.",
            )

        valid_answer_key[str(q_num)] = ans_clean

    if len(valid_answer_key) != target_num_items:
        raise HTTPException(
            status_code=400,
            detail=f"Answer key mismatch! This exam is configured for {target_num_items} items, but {len(valid_answer_key)} answers were provided.",
        )

    success = update_exam(
        exam_id=exam_id,
        answer_key=valid_answer_key,
        name=exam.name,
        exam_type=exam.exam_type,
        academic_year=exam.academic_year,
        semester=exam.semester,
        subject=exam.subject,
        course_code=exam.course_code,
        section=exam.section,
        program=exam.program,
        instructor_name=exam.instructor_name,
        num_items=target_num_items,
        passing_score=exam.passing_score,
        instructions=exam.instructions,
        exam_date=exam.exam_date,
    )
    if success:
        return {"status": "success", "message": "Exam updated successfully."}
    else:
        raise HTTPException(status_code=500, detail="Failed to update exam.")


@app.get("/api/exams")
def get_all_exams():
    return list_exams()


@app.delete("/api/exams/{exam_id}")
def delete_existing_exam(exam_id: str):
    success = delete_exam(exam_id)
    if not success:
        raise HTTPException(status_code=404, detail="Exam not found.")
    return {"status": "success", "message": "Exam and all its submissions deleted successfully."}


# ==========================================
# OMR Grading & Submission Routes
# ==========================================

@app.post("/api/grade")
async def grade_exam_sheet(
    exam_id: str = Form(...),
    file: UploadFile = File(...),
):
    # 1. Validate exam exists
    exam = get_exam(exam_id)
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
    num_items = exam.get("num_items") or len(exam.get("answer_key", {})) or 50
    answer_key = {
        str(q): ans
        for q, ans in exam.get("answer_key", {}).items()
        if 1 <= int(q) <= num_items
    }
    if len(answer_key) != num_items:
        raise HTTPException(
            status_code=400,
            detail=f"Exam is configured for {num_items} items, but the stored answer key contains {len(answer_key)} valid entries.",
        )

    try:
        results = omr_engine.grade_sheet(image, answer_key)
    except OMRCornerDetectionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during grading: {str(e)}")

    # 6. Save submission to database
    submission_id = str(uuid.uuid4())
    save_submission(
        submission_id=submission_id,
        exam_id=exam_id,
        student_id=results["student_id"],
        score=results["score"],
        total_questions=results["total_questions"],
        answers=results["answers"],
    )

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
def get_all_submissions(exam_id: Optional[str] = None):
    return list_submissions(exam_id)


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


# Ensure Frontend/dist exists before mounting to avoid FastAPI startup crash
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Frontend", "dist"))
if not os.path.exists(frontend_dir):
    os.makedirs(frontend_dir, exist_ok=True)
    with open(os.path.join(frontend_dir, "index.html"), "w") as f:
        f.write("<h1>OMR Frontend Building... Please run npm run build in Frontend/ directory.</h1>")

app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
