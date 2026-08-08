

-- AeroOMR Reference Schema (MySQL / MariaDB)
-- NOTE: The live application uses SQLite via database.py
--       This file is a reference schema for documentation and MySQL deployments.

CREATE DATABASE IF NOT EXISTS aeroomr_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE aeroomr_db;

SET NAMES utf8mb4;

-- Drop tables in reverse dependency order so the script can be re-run safely
DROP TABLE IF EXISTS submission_answers;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS answer_keys;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS users;

-- 0. users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('dean','programme-head','teacher','student') NOT NULL,
    programme VARCHAR(100) DEFAULT NULL,
    department VARCHAR(100) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Registered AeroOMR users with role-based access';

-- 1. exams  (comprehensive examination metadata)
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL                  COMMENT 'Full exam title',

    -- Academic metadata
    exam_type VARCHAR(50) DEFAULT NULL          COMMENT 'Preliminary | Midterm | Pre-Final | Final',
    academic_year VARCHAR(20) DEFAULT NULL      COMMENT 'e.g. 2025-2026',
    semester VARCHAR(30) DEFAULT NULL           COMMENT '1st Semester | 2nd Semester | Summer',
    subject VARCHAR(150) DEFAULT NULL           COMMENT 'Course / Subject name',
    course_code VARCHAR(30) DEFAULT NULL        COMMENT 'e.g. ITP305',
    section VARCHAR(50) DEFAULT NULL            COMMENT 'e.g. BSIT 3-A',
    program VARCHAR(100) DEFAULT NULL           COMMENT 'Programme / Department name',
    instructor_name VARCHAR(150) DEFAULT NULL   COMMENT 'Name of the instructor',

    -- Examination settings
    num_items INT UNSIGNED NOT NULL DEFAULT 50  COMMENT 'Total number of test items (1-100)',
    passing_score INT UNSIGNED DEFAULT NULL     COMMENT 'Optional raw score threshold',
    instructions TEXT DEFAULT NULL              COMMENT 'Optional exam instructions shown to students',
    exam_date DATE DEFAULT NULL                 COMMENT 'Scheduled date of the examination',

    -- Timestamps
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT chk_exams_num_items CHECK (num_items BETWEEN 1 AND 100),
    CONSTRAINT chk_exams_type CHECK (exam_type IN ('Preliminary','Midterm','Pre-Final','Final') OR exam_type IS NULL)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per examination created in AeroOMR';

-- 2. answer_keys
CREATE TABLE IF NOT EXISTS answer_keys (
    answer_key_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    exam_id VARCHAR(50) NOT NULL,
    question_number TINYINT UNSIGNED NOT NULL,
    correct_option CHAR(1) NOT NULL,
    PRIMARY KEY (answer_key_id),
    UNIQUE KEY uq_answer_keys_exam_question (exam_id, question_number),
    CONSTRAINT fk_answer_keys_exam
        FOREIGN KEY (exam_id) REFERENCES exams (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_answer_keys_question_number
        CHECK (question_number BETWEEN 1 AND 100),
    CONSTRAINT chk_answer_keys_correct_option
        CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Correct answer for each question of an exam';

-- 3. submissions
CREATE TABLE IF NOT EXISTS submissions (
    id VARCHAR(50) NOT NULL,
    exam_id VARCHAR(50) NOT NULL,
    student_id VARCHAR(20) DEFAULT NULL,
    score SMALLINT UNSIGNED NOT NULL,
    total_questions SMALLINT UNSIGNED NOT NULL,
    answers TEXT NOT NULL                       COMMENT 'JSON blob of per-question answer details',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_submissions_exam (exam_id),
    CONSTRAINT fk_submissions_exam
        FOREIGN KEY (exam_id) REFERENCES exams (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_submissions_score_within_total
        CHECK (score <= total_questions)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per graded student answer sheet';

-- 4. submission_answers (optional normalized view, runtime uses JSON blob)
CREATE TABLE IF NOT EXISTS submission_answers (
    submission_answer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    submission_id VARCHAR(50) NOT NULL,
    question_number SMALLINT UNSIGNED NOT NULL,
    selected_option VARCHAR(5) DEFAULT NULL,
    is_ambiguous TINYINT(1) NOT NULL DEFAULT 0,
    is_empty TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (submission_answer_id),
    UNIQUE KEY uq_submission_answers_submission_question (submission_id, question_number),
    CONSTRAINT fk_submission_answers_submission
        FOREIGN KEY (submission_id) REFERENCES submissions (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_submission_answers_question_number
        CHECK (question_number BETWEEN 1 AND 100)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student-marked answer for each question of a submission';
