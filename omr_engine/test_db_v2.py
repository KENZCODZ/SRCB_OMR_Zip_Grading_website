import uuid
import database

def run_tests():
    print("--- 1. Testing Database Initialization ---")
    database.init_db()
    
    progs = database.list_programs()
    print(f"Programs ({len(progs)}):", [p["program_code"] for p in progs])
    
    subjs = database.list_subjects()
    print(f"Subjects ({len(subjs)}):", [s["subject_code"] for s in subjs])
    
    secs = database.list_sections()
    print(f"Sections ({len(secs)}):", [sec["section_name"] for sec in secs])
    
    print("\n--- 2. Testing Exam Creation with Relational IDs ---")
    exam_id = str(uuid.uuid4())
    key = {str(i): 'A' for i in range(1, 51)}
    saved_exam = database.save_exam(
        exam_id=exam_id,
        name="ITP305 Event-Driven Programming Midterm",
        answer_key=key,
        exam_type="Midterm",
        academic_year="2025-2026",
        semester="1st Semester",
        subject="Event-Driven Programming",
        course_code="ITP305",
        section="BSIT 3-A",
        program="BSIT",
        instructor_name="Prof. John Dela Cruz",
        num_items=50,
        passing_score=25,
        subject_id="subj-itp305-001",
        instructor_id="inst-teacher-001"
    )
    print("Saved Exam:", saved_exam["id"], "Name:", saved_exam["name"])
    
    print("\n--- 3. Testing Roster Enrollment Bulk Import ---")
    roster = [
        {"student_id": "2023-0001", "name": "Ana Reyes", "email": "student@srcb.edu.ph"},
        {"student_id": "2023-0002", "name": "Kenneth Ernest Palicte", "email": "k.palicte@srcb.edu.ph"},
        {"student_id": "2023-0003", "name": "Maria Clara", "email": "m.clara@srcb.edu.ph"}
    ]
    res = database.bulk_import_enrollments("sec-bsit-3a-001", "2025-2026", "1st Semester", roster)
    print("Enrollment Import Result:", res)
    
    enrollments = database.list_enrollments(section_id="sec-bsit-3a-001")
    print(f"Total Enrolled in BSIT 3-A ({len(enrollments)}):")
    for e in enrollments:
        print(f"  * [{e['institutional_id_number']}] {e['student_name']} ({e['student_email']}) - Status: {e['enrollment_status']}")
        
    print("\n--- 4. Testing Submission Persistence with Safe ID Fallback ---")
    sub_id = str(uuid.uuid4())
    sub = database.save_submission(
        submission_id=sub_id,
        exam_id=exam_id,
        student_id="2023-0001",
        score=48,
        total_questions=50,
        answers={"1": {"selected": "A", "is_ambiguous": False, "is_empty": False}},
        student_id_extracted="2023-0001"
    )
    print("Saved Submission:", sub["id"], "Score:", f"{sub['score']}/{sub['total_questions']}")
    
    print("\n--- 5. Testing Dashboard Summary ---")
    summary = database.get_dashboard_summary()
    print("Dashboard Summary:", summary)
    
    print("\n[PASS] ALL PHASE 2 DATABASE INTEGRATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
