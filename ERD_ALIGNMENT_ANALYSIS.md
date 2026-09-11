# AeroOMR Current System vs. Approved Conceptual ERD Gap Analysis

**Institution**: St. Rita's College of Balingasag (SRCB)  
**System**: AeroOMR — Automated OMR Examination & Academic Management System  
**Document Type**: System Architecture & Database Alignment Gap Analysis  
**Target Audience**: Database Architects, Systems Analysts, Software Engineers, Academic Evaluators  

---

## A. CURRENT SYSTEM STRUCTURE

The working **AeroOMR** system currently operates under a **pragmatic, denormalized, high-throughput architecture**:

```
                                  ┌───────────────────────────┐
                                  │        users Table        │
                                  │ • id (PK)                 │
                                  │ • name, email, password   │
                                  │ • role ('admin'|'dean'|   │
                                  │   'programme-head'|       │
                                  │   'teacher'|'student')    │
                                  │ • programme ('BSIT')      │
                                  │ • department              │
                                  │ • student_id ('2023-0001')│
                                  │ • status ('active'|...)   │
                                  └───────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
   ┌───────────────────────────┐                                 ┌───────────────────────────┐
   │        exams Table        │                                 │     submissions Table     │
   │ • id (PK)                 │                                 │ • id (PK)                 │
   │ • name                    │ 1 ─── has many submissions ───► │ • exam_id (FK → exams.id) │
   │ • exam_type, academic_year│                                 │ • student_id (loose string│
   │ • semester, exam_date     │                                 │   from OMR bubble decode) │
   │ • subject (text string)   │                                 │ • score, total_questions  │
   │ • course_code (text 'ITP')│                                 │ • answers (JSON string /  │
   │ • section (text 'BSIT 3A')│                                 │   submission_answers tbl) │
   │ • program (text 'BSIT')   │                                 │ • created_at / graded_at  │
   │ • instructor_name (text)  │                                 └───────────────────────────┘
   │ • num_items (1–100)       │                                               │
   │ • answer_key (JSON string/│                                               │
   │   answer_keys table)      │                                               ▼
   └───────────────────────────┘                                 ┌───────────────────────────┐
                                                                 │ Client-Side Excel Roster  │
                                                                 │ (RosterImportModal.tsx)   │
                                                                 │ • student_id, name        │
                                                                 │ • course_section, email   │
                                                                 └───────────────────────────┘
```

1. **User Accounts & Roles**: Centralized in a single `users` table where `role` governs permissions (`admin`, `dean`, `programme-head`, `teacher`, `student`).
2. **Exams**: Stored with flattened text metadata (`subject`, `course_code`, `section`, `program`, `instructor_name`).
3. **Answer Keys & Answers**: Defined relationally in `schema.sql` (`answer_keys`, `submission_answers`), while serialized as JSON strings in runtime `database.py` for speed.
4. **Sections & Rosters**: Uploaded client-side via Excel (`.xlsx`) at exam time, used in-memory to pair decoded student IDs with names and send email reports.

---

## B. CONCEPTUAL ERD STRUCTURE

The **Approved Conceptual ERD** specifies a normalized academic domain model:

```
 USER (Account & Role)
   ├── 1:1 is-a ──► INSTRUCTOR ── 1:M employs ── PROGRAM (Academic Unit)
   │                  │                            ├── 1:M includes ──► SUBJECT
   │                  │                            └── 1:M has ──────► SECTION
   │                  │                                                   │
   │                  ├── M:M teaches ──► SUBJECT                         │
   │                  │                      │                            │ 1:M has
   │                  │                      │ 1:M covers                 ▼
   │                  └── 1:M creates ───────┼───────────────► EXAMINATION
   │                                         │                   ├── 1:M defines ──► ANSWER KEY
   │                                         │                   └── 1:M has ──────► SUBMISSION
   │                                                                                    │ 1:M contains
   └── 1:1 is-a ──► STUDENT                                                             ▼
                      │                                                        SUBMISSION ANSWER
                      ├── 1:M enrolls ──► ENROLLMENT (Term, Status) ◄── 1:M has ── SECTION
                      │                         │
                      └── 1:M submits ──────────┴──────────────────────────────────────► SUBMISSION
```

---

## C. ENTITY-BY-ENTITY GAP ANALYSIS

| Conceptual Entity | 1. In Database? | 2. Implicit in other table/field? | 3. In Frontend? | 4. In Backend? | 5. Current Representation | 6. Missing vs. Conceptual ERD | 7. Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **USER** | **Yes** (`users` table) | N/A | **Yes** (`LoginPage`, `RegisterForm`, `AdminUserManagement`) | **Yes** (`/api/auth/*`, `/api/users/*`) | `users` table (`id`, `name`, `email`, `password`, `role`, `status`) | None. Fully implements authentication and approval workflows. | **NO CHANGE** |
| **STUDENT** | **Partial** (`users` row) | `users.role = 'student'` + `users.student_id` | **Yes** (`StudentPortalView`, `StudentExamCard`, `StudentStatsHeader`) | **Yes** (Filtered by role and `student_id`) | `users` row with `role='student'`, `student_id` | Dedicated `students` profile table with explicit foreign key to `user_id`. | **MODIFY** *(Keep role on User; link student_id relationally)* |
| **ENROLLMENT** | **No** | Implicit in Excel roster uploads | **Yes** (`RosterImportModal.tsx`, `StudentRosterEntry` interface) | **No** | In-memory parsed state from uploaded `.xlsx` files | Persistent database table recording student membership in a section for an academic year/semester. | **ADD** *(Formalize existing Excel roster data into DB)* |
| **SECTION** | **No** | `exams.section` VARCHAR column | **Yes** (Section input in `ExamCreationModal`, filters in Dean/Teacher views) | **Partial** (Stored as plain text on exams) | `exams.section` text field + UI state | Dedicated `sections` table with `section_name`, `year_level`, and `program_id`. | **ADD** *(Replace free text with relational selection)* |
| **PROGRAM** | **No** | `users.programme`, `exams.program` | **Yes** (Department/Programme dropdowns in Auth, Dean, and Teacher views) | **Partial** (Queried via string filter e.g. `?programme=BSIT`) | VARCHAR columns on `users` and `exams` | Dedicated `programs` table (`program_id`, `program_code`, `program_name`). | **ADD** *(Promote string literals to master lookup table)* |
| **INSTRUCTOR** | **Partial** (`users` row) | `users.role = 'teacher'` + `exams.instructor_name` | **Yes** (`TeacherExamCompiler`, Exam author metadata) | **Yes** (Filtered by role in backend) | `users` row with `role='teacher'`, plain text `exams.instructor_name` | Dedicated `instructors` entity table linked to `user_id` and `program_id`. | **MODIFY** *(Keep role on User; link `instructor_id` on exams)* |
| **SUBJECT** | **No** | `exams.subject` + `exams.course_code` | **Yes** (Subject and Course Code inputs in `ExamCreationModal`, `TeacherExamCompiler`) | **Partial** (Stored as text fields on exam) | Free-form VARCHAR fields in `exams` table | Dedicated `subjects` table (`subject_id`, `subject_name`, `course_code`/`description`, `units`, `program_id`). | **ADD** *(Master subject catalog)* |
| **EXAMINATION** | **Yes** (`exams` table) | N/A | **Yes** (`ExamCard`, `ExamCreationModal`, `ExamDetailsModal`, `TeacherExamCompiler`) | **Yes** (`/api/exams/*`) | `exams` table (all exam parameters, item counts, passing scores, dates) | Currently stores denormalized strings for instructor and subject instead of FK IDs. | **MODIFY** *(Add `instructor_id` FK and `subject_id` FK alongside text fields)* |
| **ANSWER KEY** | **Yes** (`answer_keys` / JSON) | In runtime `exams.answer_key` JSON | **Yes** (Interactive 1–100 visual bubble key composer) | **Yes** (Validated in `main.py`, stored via `database.py`) | `schema.sql` has `answer_keys` table; `database.py` stores JSON string | None functionally; runtime uses JSON column while schema has normalized table. | **KEEP** *(Both representations are fully functional)* |
| **SUBMISSION** | **Yes** (`submissions` table) | N/A | **Yes** (`SubmissionTable`, `GradingHistoryView`, `StudentPortalView`) | **Yes** (`/api/grade`, `/api/submissions`) | `submissions` table (`id`, `exam_id`, `student_id`, `score`, `total_questions`, `graded_at`) | `student_id` is a loose string rather than a strict FK to a student entity. | **MODIFY** *(Enable optional relational link to student account)* |
| **SUBMISSION ANSWER**| **Yes** (`submission_answers` / JSON) | In runtime `submissions.answers` JSON | **Yes** (Item analysis breakdown, overlay viewer, answer inspection) | **Yes** (Evaluated in `omr.py`, saved via `database.py`) | `schema.sql` has `submission_answers` table; `database.py` stores JSON | None functionally. | **KEEP** *(Both representations are fully functional)* |

---

## D. RELATIONSHIP GAP ANALYSIS

| Conceptual Relationship | Expected Role in System | Current Implementation Status | Gap / Discrepancy |
| :--- | :--- | :--- | :--- |
| **USER → INSTRUCTOR** | 1:1 specialization of User | **Implemented via `users.role = 'teacher'`** | No dedicated join table; handled cleanly via role enum. |
| **USER → STUDENT** | 1:1 specialization of User | **Implemented via `users.role = 'student'`** | Handled via role enum and `users.student_id`. |
| **PROGRAM → INSTRUCTOR** | Program employs instructors | **Represented via `users.programme` string** | No foreign key constraint between teacher and department. |
| **PROGRAM → SUBJECT** | Program curriculum owns subjects | **Represented via `exams.program` string** | No relational foreign key constraint. |
| **PROGRAM → SECTION** | Program contains student sections | **Managed only in Frontend UI filters** | Missing in MySQL database. |
| **INSTRUCTOR → SUBJECT** | Instructor assigned to teach subjects | **Implicit per exam creation** | Teacher manually enters subject name when making an exam. |
| **INSTRUCTOR → EXAMINATION**| Instructor authors an examination | **Represented via `exams.instructor_name` string** | Denormalized text instead of `instructor_id` foreign key. |
| **SUBJECT → EXAMINATION** | Exam evaluates a specific subject | **Represented via `exams.subject` & `course_code`**| Denormalized text instead of `subject_id` foreign key. |
| **STUDENT → ENROLLMENT** | Student belongs to an enrollment record | **Managed via Excel upload (`RosterImportModal`)** | Transient in frontend; no persistent DB enrollment rows. |
| **SECTION → ENROLLMENT** | Section contains enrolled students | **Managed via Excel upload (`RosterImportModal`)** | Transient in frontend; no persistent DB section membership. |
| **EXAMINATION → ANSWER KEY**| Exam defines 1–100 correct answers | **Fully Implemented** | Relationally linked in `schema.sql` / JSON in runtime. |
| **EXAMINATION → SUBMISSION**| Exam contains student submissions | **Fully Implemented (`submissions.exam_id` FK)** | Explicit foreign key with `ON DELETE CASCADE`. |
| **STUDENT → SUBMISSION** | Student submits an answer sheet | **Partially Implemented (`submissions.student_id`)**| Stored as extracted string; not constrained by foreign key. |
| **SUBMISSION → SUBMISSION ANSWER**| Submission contains question responses| **Fully Implemented** | Normalized in `schema.sql` / JSON in runtime. |

---

## E. FEATURES THAT ALREADY MATCH

1. **Authentication & Role Authorization**:
   - `users` table handles all 5 system roles (`admin`, `dean`, `programme-head`, `teacher`, `student`).
   - Registration and approval lifecycle (`pending` $\rightarrow$ `active` / `rejected`).
2. **Comprehensive Examination Engine**:
   - `exams` entity captures examination title, term, academic year, question count (1–100), passing score, instructions, and schedule.
3. **OMR Answer Key & Question Evaluation**:
   - 1–100 item support with A–E choices.
   - Ambiguous / multi-fill detection (`is_ambiguous`), blank mark detection (`is_empty`), and scoring calculation.
4. **Grading & Submissions Pipeline**:
   - OpenCV image processing $\rightarrow$ corner detection $\rightarrow$ perspective warp $\rightarrow$ bubble fill ratio analysis $\rightarrow$ database submission persistence.
5. **Item Analysis & Transmuted Grade Calculation**:
   - Outcome-Based Education (OBE) Difficulty Index ($P$) and Discrimination Index ($D$).
   - Philippine Transmuted Grade scale ($1.00$ to $5.00$).

---

## F. FEATURES THAT NEED DATABASE SUPPORT (TABLES / SCHEMA)

To fulfill the Conceptual ERD without disrupting live grading, database tables are needed for:

1. **`programs` Table**:
   - `program_id`, `program_code` (e.g. `'BSIT'`), `program_name` (e.g. `'Bachelor of Science in Information Technology'`).
2. **`subjects` Table**:
   - `subject_id`, `course_code` (e.g. `'ITP305'`), `subject_name` (e.g. `'Event-Driven Programming'`), `units`, `program_id (FK)`.
3. **`sections` Table**:
   - `section_id`, `section_name` (e.g. `'BSIT 3-A'`), `year_level` (e.g. `3`), `program_id (FK)`.
4. **`enrollments` Table**:
   - `enrollment_id`, `academic_year`, `semester`, `enrollment_status` (`'enrolled'`, `'dropped'`), `student_id (FK)`, `section_id (FK)`.

---

## G. FEATURES THAT NEED BACKEND SUPPORT (FASTAPI / PYMYSQL)

1. **Academic Master Data CRUD Endpoints**:
   - `GET / POST /api/programs`
   - `GET / POST /api/subjects` (with optional `?program_id=` filter)
   - `GET / POST /api/sections` (with optional `?program_id=` filter)
2. **Roster Persistence Endpoint (Formalizing Enrollment)**:
   - `POST /api/sections/{section_id}/enrollments/import` (to persist Excel roster rows into `enrollments`).
   - `GET /api/sections/{section_id}/students` (to fetch enrolled students for an exam or section).
3. **Relational Exam Creation Support**:
   - Allow `POST /api/exams` to accept `subject_id` and `instructor_id` while continuing to accept legacy text values for backwards compatibility.

---

## H. FEATURES THAT NEED FRONTEND SUPPORT (REACT / TYPESCRIPT)

1. **Academic Catalog Management Views**:
   - Dean / Programme Head UI components to manage Subjects, Sections, and Programs (`DeanAcademicManagement.tsx`).
2. **Connected Dropdowns in Exam Creation**:
   - In `ExamCreationModal.tsx`, populate Subjects, Programs, and Sections from backend API endpoints rather than raw free-text inputs.
3. **Roster Import to Database Sync**:
   - In `RosterImportModal.tsx`, add an option to "Save Roster to Section Enrollment" in the database in addition to the current in-memory grading workflow.

---

## I. WHAT MUST NOT BE CHANGED

> [!IMPORTANT]
> The following core components are working correctly and **must not be broken or rewritten**:

1. **The Computer Vision / OMR Engine (`omr.py`, `image_normalizer.py`, `coordinates.json`)**:
   - Corner detection heuristics, 180° rotation auto-correction, 850x1100 perspective transform, Otsu binarization, and base64 overlay generation.
2. **Loose Student ID Grading Tolerance**:
   - When grading an answer sheet from a webcam or photo, if a student bubbles an unregistered or misread ID (e.g., `?` or incomplete digit), the grading pipeline **must not crash** on a database foreign key violation. Submissions must continue to save successfully.
3. **Role Architecture on `users.role`**:
   - Do **not** split `users` into separate administrative tables (`admins`, `deans`, `programme_heads`). The current single-table structure with `role` is clean and adheres to standard identity practices.
4. **Philippine Grade Transmutation & OBE Item Analysis**:
   - Math formulas in `types.ts`, `ItemAnalysisTable.tsx`, and `excelUtils.ts` are fully operational and verified.

---

## J. RECOMMENDED IMPLEMENTATION ORDER

```
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Formalize Conceptual Schema (DDL for programs, subjects, sections) │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Implement Enrollment Table & Persist Roster Imports                │
│ (Formalizes student rosters into DB without breaking loose OMR grading)   │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Add Backend CRUD Endpoints for Academic Management                 │
│ (/api/programs, /api/subjects, /api/sections, /api/enrollments)            │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Connect Frontend Exam Creation & Dean Management to Master Data    │
│ (Dropdowns replace free-text inputs in ExamCreationModal & Dean views)     │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ STEP 5: End-to-End Regression Testing (Camera OMR, Grading, OBE Analytics) │
└────────────────────────────────────────────────────────────────────────────┘
```

### Can `ENROLLMENT` Naturally Formalize Student Rosters?
**Yes, perfectly.**
Currently, teachers upload Excel rosters into `RosterImportModal.tsx` as transient data. Adding an `enrollments` table linking `student_id` to `section_id` allows teachers and administrators to:
1. Save and reuse class rosters permanently.
2. Auto-populate student names during live OMR camera scanning.
3. Keep the OMR engine resilient by gracefully handling unknown/guest student IDs during grading.

---
*End of Analysis Report. No modifications were performed on the system.*
