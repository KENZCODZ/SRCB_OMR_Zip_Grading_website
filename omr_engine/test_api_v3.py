"""
Integration test suite for Phase 3 Academic Management & Relational OMR Endpoints.
Uses FastAPI TestClient to test endpoints in-process against MySQL test database.
"""
import os
import sys

# Ensure omr_engine directory is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_and_exams():
    res = client.get("/api/exams")
    assert res.status_code == 200
    print("[OK] GET /api/exams passed")

def test_academic_management_endpoints():
    # 1. GET /api/programs
    res = client.get("/api/programs")
    assert res.status_code == 200, f"GET /api/programs failed: {res.text}"
    programs = res.json()
    assert isinstance(programs, list)
    assert len(programs) > 0
    prog_id = programs[0]["id"]
    print(f"[OK] GET /api/programs returned {len(programs)} programs")

    # 1b. GET /api/instructors
    res = client.get("/api/instructors")
    assert res.status_code == 200, f"GET /api/instructors failed: {res.text}"
    instructors = res.json()
    assert isinstance(instructors, list)
    print(f"[OK] GET /api/instructors returned {len(instructors)} instructors")

    # 2. POST /api/programs
    import uuid
    test_code = f"T{uuid.uuid4().hex[:4].upper()}"
    res = client.post("/api/programs", json={
        "program_code": test_code,
        "program_name": "Bachelor of Science in Information Systems",
        "department_name": "College of Computer Studies"
    })
    assert res.status_code in (200, 201), f"POST /api/programs failed: {res.text}"
    new_prog = res.json()
    assert new_prog["program_code"] == test_code
    print(f"[OK] POST /api/programs created program {test_code}")

    # 3. GET /api/subjects
    res = client.get(f"/api/subjects?program_id={prog_id}")
    assert res.status_code == 200
    subjects = res.json()
    assert isinstance(subjects, list)
    print(f"[OK] GET /api/subjects returned {len(subjects)} subjects for program {prog_id}")

    # 4. POST /api/subjects
    res = client.post("/api/subjects", json={
        "subject_code": "IS101",
        "subject_name": "Fundamentals of Information Systems",
        "program_id": new_prog["id"],
        "description": "Introductory IS course",
        "units": 3,
        "is_major": 1
    })
    assert res.status_code in (200, 201), f"POST /api/subjects failed: {res.text}"
    new_sub = res.json()
    assert new_sub["subject_code"] == "IS101"
    print("[OK] POST /api/subjects created subject IS101")

    # 5. GET & POST /api/sections
    res = client.post("/api/sections", json={
        "section_name": "BSIS 1-A",
        "year_level": 1,
        "program_id": new_prog["id"]
    })
    assert res.status_code in (200, 201), f"POST /api/sections failed: {res.text}"
    new_sec = res.json()
    sec_id = new_sec["id"]
    print("[OK] POST /api/sections created section BSIS 1-A")

    res = client.get(f"/api/sections?program_id={new_prog['id']}")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    print("[OK] GET /api/sections filtered by program passed")

    # 6. POST /api/sections/{id}/enrollments/import
    res = client.post(f"/api/sections/{sec_id}/enrollments/import", json={
        "academic_year": "2025-2026",
        "semester": "1st Semester",
        "students": [
            {"student_id": "2026-9001", "name": "Elena Gilbert", "email": "elena@school.edu.ph"},
            {"student_id": "2026-9002", "name": "Stefan Salvatore", "email": "stefan@school.edu.ph"}
        ]
    })
    assert res.status_code == 200, f"Roster import failed: {res.text}"
    import_res = res.json()
    assert import_res["status"] == "success"
    assert import_res["results"]["enrolled"] == 2
    print(f"[OK] POST /api/sections/{sec_id}/enrollments/import enrolled 2 students")

    # 7. GET /api/enrollments
    res = client.get(f"/api/enrollments?section_id={sec_id}&academic_year=2025-2026&semester=1st%20Semester")
    assert res.status_code == 200
    enrollments = res.json()
    assert len(enrollments) == 2
    print(f"[OK] GET /api/enrollments retrieved {len(enrollments)} enrolled students")

    print("\nSUCCESS: ALL PHASE 3 API ENDPOINTS VALIDATED SUCCESSFULLY!")

if __name__ == "__main__":
    test_health_and_exams()
    test_academic_management_endpoints()
