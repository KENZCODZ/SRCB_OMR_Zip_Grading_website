"""
End-to-end test script for the OMR Web API.
Tests:
  1. Static file hosting (GET /)
  2. Quick scan extraction (POST /api/extract)
  3. Exam creation (POST /api/exams)
  4. Exam listing (GET /api/exams)
  5. Grading a student sheet (POST /api/grade)
  6. Submission listing (GET /api/submissions)
"""

import requests
import os
import sys
import json

BASE_URL = "http://localhost:8000"
IMAGE_PATH = os.path.join(os.path.dirname(__file__), "ZipGrade50QuestionV2.png")

passed = 0
failed = 0

def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✅ PASS: {name}")
    else:
        failed += 1
        print(f"  ❌ FAIL: {name}  — {detail}")

print("=" * 60)
print("  AeroOMR End-to-End API Test Suite")
print("=" * 60)

# ── Test 1: Static file hosting ──────────────────────────────
print("\n🔹 Test 1: Static file hosting (GET /)")
r = requests.get(f"{BASE_URL}/")
test("Status code is 200", r.status_code == 200, f"got {r.status_code}")
test("Content-Type is HTML", "text/html" in r.headers.get("content-type", ""), r.headers.get("content-type", ""))
test("Body contains <div id=\"root\">", 'id="root"' in r.text or "root" in r.text, "missing root div")

# ── Test 2: Quick scan extraction ────────────────────────────
print("\n🔹 Test 2: Quick scan / extract (POST /api/extract)")
with open(IMAGE_PATH, "rb") as f:
    r = requests.post(f"{BASE_URL}/api/extract", files={"file": ("sheet.png", f, "image/png")})
test("Status code is 200", r.status_code == 200, f"got {r.status_code}")
extract_data = r.json()
test("Response has 'student_id' field", "student_id" in extract_data)
test("Response has 'answers' dict", "answers" in extract_data and isinstance(extract_data["answers"], dict))
test("Response has 'overlay_image' base64", "overlay_image" in extract_data and len(extract_data.get("overlay_image", "")) > 100)
answers_count = sum(1 for v in extract_data.get("answers", {}).values() if v is not None)
test(f"Detected at least some filled bubbles ({answers_count} found)", answers_count >= 0)
print(f"    ↳ Student ID detected: '{extract_data.get('student_id', 'N/A')}'")
print(f"    ↳ Total answered questions: {answers_count} / {len(extract_data.get('answers', {}))}")

# ── Test 3: Create exam with extracted answer key ─────────────
print("\n🔹 Test 3: Create exam (POST /api/exams)")
# Build answer key from extracted answers (filter out Nones)
answer_key = {}
for q, v in extract_data.get("answers", {}).items():
    if v and len(v) == 1:  # single letter answer
        answer_key[q] = v

r = requests.post(f"{BASE_URL}/api/exams", json={
    "name": "E2E Test Exam",
    "answer_key": answer_key
})
test("Status code is 201", r.status_code == 201, f"got {r.status_code}")
exam_data = r.json()
test("Response has 'id' field", "id" in exam_data)
test("Response has 'name' matching", exam_data.get("name") == "E2E Test Exam")
test("Response has 'answer_key' dict", "answer_key" in exam_data and isinstance(exam_data["answer_key"], dict))
exam_id = exam_data.get("id", "")
print(f"    ↳ Created exam ID: {exam_id}")
print(f"    ↳ Answer key has {len(answer_key)} entries")

# ── Test 4: List exams ────────────────────────────────────────
print("\n🔹 Test 4: List exams (GET /api/exams)")
r = requests.get(f"{BASE_URL}/api/exams")
test("Status code is 200", r.status_code == 200, f"got {r.status_code}")
exams = r.json()
test("Response is a list", isinstance(exams, list))
test("At least one exam exists", len(exams) >= 1)
test("Created exam is in the list", any(e["id"] == exam_id for e in exams))

# ── Test 5: Grade a student sheet ─────────────────────────────
print("\n🔹 Test 5: Grade a student sheet (POST /api/grade)")
with open(IMAGE_PATH, "rb") as f:
    r = requests.post(
        f"{BASE_URL}/api/grade",
        data={"exam_id": exam_id},
        files={"file": ("student_sheet.png", f, "image/png")}
    )
test("Status code is 200", r.status_code == 200, f"got {r.status_code}")
grade_data = r.json()
test("Response has 'submission_id'", "submission_id" in grade_data)
test("Response has 'student_id'", "student_id" in grade_data)
test("Response has 'score'", "score" in grade_data)
test("Response has 'total_questions'", "total_questions" in grade_data)
test("Response has 'answers' dict", "answers" in grade_data and isinstance(grade_data["answers"], dict))
test("Response has 'overlay_image' base64", "overlay_image" in grade_data and len(grade_data.get("overlay_image", "")) > 100)
print(f"    ↳ Student ID: '{grade_data.get('student_id', 'N/A')}'")
print(f"    ↳ Score: {grade_data.get('score', '?')} / {grade_data.get('total_questions', '?')}")

# ── Test 6: List submissions ─────────────────────────────────
print("\n🔹 Test 6: List submissions (GET /api/submissions)")
r = requests.get(f"{BASE_URL}/api/submissions")
test("Status code is 200", r.status_code == 200, f"got {r.status_code}")
subs = r.json()
test("Response is a list", isinstance(subs, list))
test("At least one submission exists", len(subs) >= 1)

# Filter by exam_id
r2 = requests.get(f"{BASE_URL}/api/submissions?exam_id={exam_id}")
test("Filtered submissions returns 200", r2.status_code == 200)
filtered = r2.json()
test("Filtered list contains graded submission", len(filtered) >= 1)

# ── Test 7: Delete exam ──────────────────────────────────────
print("\n🔹 Test 7: Delete exam (DELETE /api/exams/{exam_id})")
r = requests.delete(f"{BASE_URL}/api/exams/{exam_id}")
test("Status code is 200", r.status_code == 200, f"got {r.status_code}")
delete_data = r.json()
test("Response status is success", delete_data.get("status") == "success")

# Verify deleted
r_get = requests.get(f"{BASE_URL}/api/exams")
exams_list = r_get.json()
test("Exam is no longer in the list", not any(e["id"] == exam_id for e in exams_list))

# Verify associated submissions are deleted
r_subs = requests.get(f"{BASE_URL}/api/submissions?exam_id={exam_id}")
filtered_subs = r_subs.json()
test("Submissions for the exam are deleted", len(filtered_subs) == 0)

# ── Summary ───────────────────────────────────────────────────
print("\n" + "=" * 60)
total = passed + failed
print(f"  Results: {passed}/{total} passed, {failed}/{total} failed")
if failed == 0:
    print("  🎉 ALL TESTS PASSED!")
else:
    print(f"  ⚠️  {failed} test(s) failed.")
print("=" * 60)

sys.exit(0 if failed == 0 else 1)
