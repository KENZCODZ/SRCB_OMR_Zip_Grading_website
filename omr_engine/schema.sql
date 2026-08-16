-- ==============================================================================
-- AeroOMR MySQL Database Schema
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS aeroomr_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE aeroomr_db;

SET NAMES utf8mb4;

-- Drop tables in reverse dependency order for clean re-runs
DROP TABLE IF EXISTS submission_answers;
DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS answer_keys;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS users;

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    programme VARCHAR(100) DEFAULT NULL,
    department VARCHAR(255) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at VARCHAR(50) NOT NULL,
    updated_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (id),
    KEY idx_users_email (email),
    KEY idx_users_role (role),
    KEY idx_users_status (status)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='System users (dean, programme-head, teacher, student)';

-- 2. exams
CREATE TABLE IF NOT EXISTS exams (
    exam_id VARCHAR(64) NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    created_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (exam_id)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per exam created in AeroOMR';

-- 3. answer_keys
CREATE TABLE IF NOT EXISTS answer_keys (
    answer_key_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    exam_id VARCHAR(64) NOT NULL,
    question_number TINYINT UNSIGNED NOT NULL,
    correct_option CHAR(1) NOT NULL,
    PRIMARY KEY (answer_key_id),
    UNIQUE KEY uq_answer_keys_exam_question (exam_id, question_number),
    CONSTRAINT fk_answer_keys_exam
        FOREIGN KEY (exam_id) REFERENCES exams (exam_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_answer_keys_question_number
        CHECK (question_number BETWEEN 1 AND 50),
    CONSTRAINT chk_answer_keys_correct_option
        CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Correct answer for each question of an exam';

-- 4. submissions
CREATE TABLE IF NOT EXISTS submissions (
    submission_id VARCHAR(64) NOT NULL,
    exam_id VARCHAR(64) NOT NULL,
    student_id VARCHAR(64) DEFAULT NULL,
    score TINYINT UNSIGNED NOT NULL,
    total_questions TINYINT UNSIGNED NOT NULL,
    graded_at VARCHAR(50) NOT NULL,
    PRIMARY KEY (submission_id),
    KEY idx_submissions_exam (exam_id),
    CONSTRAINT fk_submissions_exam
        FOREIGN KEY (exam_id) REFERENCES exams (exam_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_submissions_score_within_total
        CHECK (score <= total_questions)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='One row per graded student answer sheet';

-- 5. submission_answers
CREATE TABLE IF NOT EXISTS submission_answers (
    submission_answer_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    submission_id VARCHAR(64) NOT NULL,
    question_number TINYINT UNSIGNED NOT NULL,
    selected_option VARCHAR(5) DEFAULT NULL,
    is_ambiguous TINYINT(1) NOT NULL DEFAULT 0,
    is_empty TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (submission_answer_id),
    UNIQUE KEY uq_submission_answers_submission_question (submission_id, question_number),
    CONSTRAINT fk_submission_answers_submission
        FOREIGN KEY (submission_id) REFERENCES submissions (submission_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT chk_submission_answers_question_number
        CHECK (question_number BETWEEN 1 AND 50)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Student-marked answer for each question of a submission';
