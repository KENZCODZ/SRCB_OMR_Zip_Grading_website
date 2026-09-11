export interface Exam {
  id: string;
  name: string;
  answer_key: Record<string, string>; // Maps question number "1"–"100" to answer "A"–"E"
  created_at: string;

  // ── Academic metadata ──────────────────────────────────────────────────────
  exam_type?: string;        // "Preliminary" | "Midterm" | "Pre-Final" | "Final"
  academic_year?: string;    // e.g. "2025-2026"
  semester?: string;         // "1st Semester" | "2nd Semester" | "Summer"
  subject?: string;          // Course / Subject name
  course_code?: string;      // e.g. "ITP305"
  section?: string;          // e.g. "BSIT 3-A"
  program?: string;          // Programme / Department
  instructor_name?: string;  // Instructor full name

  // ── Examination settings ───────────────────────────────────────────────────
  num_items?: number;        // Total number of test items (1–100), defaults to 50
  passing_score?: number;    // Optional raw score threshold
  instructions?: string;     // Optional instructions text
  exam_date?: string;        // Scheduled date "YYYY-MM-DD"
  subject_id?: string;       // Optional relational link to subjects table
  instructor_id?: string;    // Optional relational link to instructors table
}

export interface SubmissionAnswerDetail {
  selected: string | null;
  is_ambiguous: boolean;
  is_empty: boolean;
}

export interface Submission {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, SubmissionAnswerDetail>;
  created_at: string;
}

export interface QuickScanResult {
  student_id: string;
  answers: Record<string, string | null>;
  overlay_image: string; // Base64 string
}

export interface GradeResult {
  submission_id: string;
  student_id: string;
  score: number;
  total_questions: number;
  answers: Record<string, SubmissionAnswerDetail>;
  overlay_image: string; // Base64 string
}

// Student Roster Import Entry
export interface StudentRosterEntry {
  student_id: string;
  name: string;
  course_section?: string;
  email?: string;
}

export type UserRole = 'admin' | 'dean' | 'programme-head' | 'teacher' | 'student';

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  programme?: string;
  department?: string;
  studentId?: string;
  student_id?: string;
  status?: 'pending' | 'active' | 'rejected' | 'suspended';
  scope: string;
  permissions: string[];
}

export interface PendingUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  programme?: string;
  department?: string;
  student_id?: string;
  status: 'pending' | 'active' | 'rejected' | 'suspended';
  created_at: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
  programme?: string;
  department?: string;
  student_id?: string;
}

// Philippine Transmuted Grade Summary
export interface TransmutedGradeResult {
  score: number;
  total_questions: number;
  percentage: number;
  grade: string; // e.g. "1.00", "1.50", "3.00", "5.00"
  status: 'Passed' | 'Failed' | 'Incomplete';
  remarks: string;
}

// Outcome-Based Education (OBE) Item Analysis Row
export interface ItemAnalysisRow {
  question_number: number;
  correct_answer: string;
  correct_count: number;
  total_responses: number;
  difficulty_index: number; // P = R / N (0.0 to 1.0)
  difficulty_category: 'Easy' | 'Moderate' | 'Difficult';
  discrimination_index: number; // D (-1.0 to 1.0)
  discrimination_category: 'Very Good' | 'Reasonable' | 'Marginal' | 'Poor';
  distractor_counts: {
    A: number;
    B: number;
    C: number;
    D: number;
    E: number;
    empty: number;
  };
}

// Student Result Email Distribution Status & Record
export type EmailDeliveryStatus = 'pending' | 'sent' | 'failed';

export interface StudentResultEmailRecord {
  id: string;
  submissionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  examId: string;
  examTitle: string;
  examType: string;
  courseCode?: string;
  subject?: string;
  section?: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  status: 'Passed' | 'Failed' | 'Incomplete';
  remarks: string;
  deliveryStatus: EmailDeliveryStatus;
  sentAt?: string;
  errorMessage?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'alert' | 'exam' | 'user' | 'grade';
  read: boolean;
  targetTab?: string;
}

// ── Conceptual ERD Academic Models ──────────────────────────────────────────
export interface Program {
  id: string;
  program_code: string;
  program_name: string;
  department_name?: string;
  created_at: string;
}

export interface Instructor {
  id: string;
  instructor_id: string;
  user_id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  program_id?: string;
  program_code?: string;
  program_name?: string;
  faculty_id_number?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  program_id: string;
  description?: string;
  units: number;
  is_major: number; // 1 = major, 0 = minor/GE
  created_at: string;
  program_code?: string;
  program_name?: string;
}

export interface Section {
  id: string;
  section_name: string;
  year_level: number;
  program_id: string;
  created_at: string;
  program_code?: string;
  program_name?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  section_id: string;
  academic_year: string;
  semester: string;
  created_at: string;
  student_number?: string;
  full_name?: string;
  email?: string;
  section_name?: string;
  year_level?: number;
  program_code?: string;
}

export interface RosterImportResponse {
  status: string;
  section_id: string;
  academic_year: string;
  semester: string;
  results: {
    total: number;
    enrolled: number;
    created_students: number;
    errors: string[];
  };
}

