-- ==============================================================================
-- AeroOMR Phase 2: Additive & Backward-Compatible Academic Schema
-- ==============================================================================

USE aeroomr_db;
SET NAMES utf8mb4;

-- 1. programs Table
CREATE TABLE IF NOT EXISTS programs (
    program_id VARCHAR(64) NOT NULL,
    program_code VARCHAR(30) NOT NULL UNIQUE,
    program_name VARCHAR(255) NOT NULL,
    department_name VARCHAR(255) DEFAULT NULL,
    created_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (program_id),
    KEY idx_programs_code (program_code)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Academic degree programs (BSIT, BSCS, BSCrim)';

-- 2. instructors Table (1:1 specialization with users)
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    program_id VARCHAR(64) DEFAULT NULL,
    faculty_id_number VARCHAR(50) DEFAULT NULL,
    created_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (instructor_id),
    CONSTRAINT fk_instructors_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_instructors_program
        FOREIGN KEY (program_id) REFERENCES programs (program_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Instructor profile specialization of user';

-- 3. students Table (1:1 specialization with users)
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL UNIQUE,
    institutional_id_number VARCHAR(64) NOT NULL UNIQUE,
    created_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (student_id),
    KEY idx_students_inst_id (institutional_id_number),
    CONSTRAINT fk_students_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student profile specialization of user';

-- 4. subjects Table (Master Course Catalog)
CREATE TABLE IF NOT EXISTS subjects (
    subject_id VARCHAR(64) NOT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    units TINYINT UNSIGNED NOT NULL DEFAULT 3,
    is_major TINYINT(1) NOT NULL DEFAULT 1,
    program_id VARCHAR(64) NOT NULL,
    created_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (subject_id),
    KEY idx_subjects_code (subject_code),
    CONSTRAINT fk_subjects_program
        FOREIGN KEY (program_id) REFERENCES programs (program_id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Academic subjects / courses catalog';

-- 5. sections Table (Class Cohorts)
CREATE TABLE IF NOT EXISTS sections (
    section_id VARCHAR(64) NOT NULL,
    section_name VARCHAR(100) NOT NULL,
    year_level TINYINT UNSIGNED NOT NULL DEFAULT 1,
    program_id VARCHAR(64) NOT NULL,
    created_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (section_id),
    KEY idx_sections_prog (program_id),
    CONSTRAINT fk_sections_program
        FOREIGN KEY (program_id) REFERENCES programs (program_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Academic class sections under programs';

-- 6. enrollments Table (Student Term Membership)
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) NOT NULL,
    section_id VARCHAR(64) NOT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(30) NOT NULL,
    enrollment_status VARCHAR(20) NOT NULL DEFAULT 'enrolled',
    enrolled_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (enrollment_id),
    UNIQUE KEY uq_enrollments_term (student_id, section_id, academic_year, semester),
    KEY idx_enrollments_section (section_id, academic_year, semester),
    CONSTRAINT fk_enrollments_student
        FOREIGN KEY (student_id) REFERENCES students (student_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_enrollments_section
        FOREIGN KEY (section_id) REFERENCES sections (section_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student term registration in class sections';

-- 7. Additive foreign key columns to exams (Safe & Non-breaking)
-- (Executed safely with conditional column addition in database.py)

-- ==============================================================================
-- Default Seed Data
-- ==============================================================================

-- Seed BSIT Program
INSERT IGNORE INTO programs (program_id, program_code, program_name, department_name, created_at)
VALUES (
    'prog-bsit-001',
    'BSIT',
    'Bachelor of Science in Information Technology',
    'College of Computing Studies',
    UTC_TIMESTAMP()
);

-- Seed Initial Common Subjects
INSERT IGNORE INTO subjects (subject_id, subject_code, subject_name, description, units, is_major, program_id, created_at)
VALUES 
(
    'subj-itp305-001',
    'ITP305',
    'Event-Driven Programming',
    'Desktop & GUI application development using event-driven architectures and paradigms.',
    3,
    1,
    'prog-bsit-001',
    UTC_TIMESTAMP()
),
(
    'subj-itp306-001',
    'ITP306',
    'Mobile Application Development',
    'Native and cross-platform mobile application engineering.',
    3,
    1,
    'prog-bsit-001',
    UTC_TIMESTAMP()
),
(
    'subj-itp307-001',
    'ITP307',
    'Data Mining and Analytics',
    'Knowledge discovery, predictive modeling, and statistical data warehousing.',
    3,
    1,
    'prog-bsit-001',
    UTC_TIMESTAMP()
);

-- Seed Initial Class Sections
INSERT IGNORE INTO sections (section_id, section_name, year_level, program_id, created_at)
VALUES 
(
    'sec-bsit-3a-001',
    'BSIT 3-A',
    3,
    'prog-bsit-001',
    UTC_TIMESTAMP()
),
(
    'sec-bsit-3b-001',
    'BSIT 3-B',
    3,
    'prog-bsit-001',
    UTC_TIMESTAMP()
);
