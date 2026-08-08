from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional
import uuid
import os
import sys
import cv2
import numpy as np
from contextlib import asynccontextmanager

# Add current directory to path to prevent ModuleNotFoundError when run from root
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_db, save_exam, update_exam, get_exam, list_exams, save_submission, list_submissions, delete_exam, authenticate_user, get_dashboard_summary
from omr import OMREngine, OMRCornerDetectionError

# Lifespan events handler (modern replacement for startup/shutdown events)
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield

# Initialize FastAPI App
app = FastAPI(title="OMR Grading System API", lifespan=lifespan)

# Enable CORS for frontend integration
# NOTE: allow_origins=["*"] is incompatible with allow_credentials=True per the CORS spec
# (browsers will reject the response). Listing the actual dev + production origins instead.
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

    # ── Academic metadata (all optional for backwards compatibility) ───────────
    exam_type: Optional[str] = Field(None, description="Preliminary | Midterm | Pre-Final | Final")
    academic_year: Optional[str] = Field(None, description="e.g. 2025-2026")
    semester: Optional[str] = Field(None, description="1st Semester | 2nd Semester | Summer")
    subject: Optional[str] = Field(None, description="Course / Subject name")
    course_code: Optional[str] = Field(None, description="Course code e.g. ITP305")
    section: Optional[str] = Field(None, description="Class section e.g. BSIT 3-A")
    program: Optional[str] = Field(None, description="Programme / Department")
    instructor_name: Optional[str] = Field(None, description="Name of the instructor")

    # ── Examination settings ───────────────────────────────────────────────────
    num_items: Optional[int] = Field(50, ge=1, le=100, description="Total number of test items (1-100)")
    passing_score: Optional[int] = Field(None, ge=0, description="Optional raw score threshold")
    instructions: Optional[str] = Field(None, description="Optional instructions for students")
    exam_date: Optional[str] = Field(None, description="Scheduled exam date (YYYY-MM-DD)")


class ExamUpdate(BaseModel):
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

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024

# Initialize OMR engine
omr_engine = OMREngine()

@app.post("/api/auth/login")
def login_user(payload: LoginRequest):
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return user

@app.get("/api/dashboard/summary")
def dashboard_summary():
    return get_dashboard_summary()

@app.post("/api/exams", status_code=status.HTTP_201_CREATED)
def create_new_exam(exam: ExamCreate):
    exam_id = str(uuid.uuid4())
    # Validate answer key format: keys must be integer strings between 1 and 100
    for q, ans in exam.answer_key.items():
        try:
            q_num = int(q)
            if q_num < 1 or q_num > 100:
                raise HTTPException(status_code=400, detail="Question number must be between 1 and 100.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Question keys must be integers.")

        if ans not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(status_code=400, detail=f"Invalid option '{ans}' for question {q}. Must be A, B, C, D, or E.")

    res = save_exam(
        exam_id=exam_id,
        name=exam.name,
        answer_key=exam.answer_key,
        exam_type=exam.exam_type,
        academic_year=exam.academic_year,
        semester=exam.semester,
        subject=exam.subject,
        course_code=exam.course_code,
        section=exam.section,
        program=exam.program,
        instructor_name=exam.instructor_name,
        num_items=exam.num_items or 50,
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

    for q, ans in exam.answer_key.items():
        try:
            q_num = int(q)
            if q_num < 1 or q_num > 100:
                raise HTTPException(status_code=400, detail="Question number must be between 1 and 100.")
        except ValueError:
            raise HTTPException(status_code=400, detail="Question keys must be integers.")

        if ans not in ["A", "B", "C", "D", "E"]:
            raise HTTPException(status_code=400, detail=f"Invalid option '{ans}' for question {q}. Must be A, B, C, D, or E.")

    success = update_exam(
        exam_id=exam_id,
        answer_key=exam.answer_key,
        exam_type=exam.exam_type,
        academic_year=exam.academic_year,
        semester=exam.semester,
        subject=exam.subject,
        course_code=exam.course_code,
        section=exam.section,
        program=exam.program,
        instructor_name=exam.instructor_name,
        num_items=exam.num_items,
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
    existing = get_exam(exam_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Exam not found.")
    
    success = delete_exam(exam_id)
    if success:
        return {"status": "success", "message": "Exam and all its submissions deleted successfully."}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete exam.")

@app.post("/api/grade")
async def grade_exam_sheet(
    exam_id: str = Form(...),
    file: UploadFile = File(...)
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
    try:
        results = omr_engine.grade_sheet(image, exam["answer_key"])
    except OMRCornerDetectionError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during grading: {str(e)}")
        
    # 6. Save submission to backend SQLite
    submission_id = str(uuid.uuid4())
    save_submission(
        submission_id=submission_id,
        exam_id=exam_id,
        student_id=results["student_id"],
        score=results["score"],
        total_questions=results["total_questions"],
        answers=results["answers"]
    )
    
    # 7. Return graded results
    return {
        "submission_id": submission_id,
        "student_id": results["student_id"],
        "score": results["score"],
        "total_questions": results["total_questions"],
        "answers": results["answers"],
        "overlay_image": results["overlay_base64"]
    }

@app.get("/api/submissions")
def get_all_submissions(exam_id: str | None = None):
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
        "overlay_image": results["overlay_base64"]
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
