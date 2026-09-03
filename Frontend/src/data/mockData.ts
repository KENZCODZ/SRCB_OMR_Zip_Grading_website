import type { AuthUser, Exam, Submission, StudentRosterEntry } from '../types';

export interface MetricData {
  id: string;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'primary' | 'success' | 'warning' | 'info';
  trend?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: 'scan' | 'exam' | 'system';
}

export const mockUsers: AuthUser[] = [
  {
    id: 'admin-001',
    role: 'admin',
    name: 'System Administrator',
    email: 'admin@srcb.edu.ph',
    department: 'IT Systems & Administration',
    programme: 'Institution-wide',
    scope: 'Quick OMR Scanner & Account Provisioning',
    permissions: [
      'Quick OMR Sheet Scanner',
      'Create and Manage Teacher & Student Accounts',
      'Optical Mark Recognition Realtime Processing',
    ],
  },
  {
    id: 'dean-001',
    role: 'dean',
    name: 'Dr. Maria Santos',
    email: 'dean@srcb.edu.ph',
    department: 'Office of the Dean',
    programme: 'Institution-wide',
    scope: 'All departments and programmes',
    permissions: [
      'Monitor examination results across all Higher Education programs',
      'View student examination scores and academic performance',
      'Monitor examinations handled by teachers',
      'View overall examination progress and records',
      'Manage and oversee user access within the system',
    ]
  },
  {
    id: 'ph-001',
    role: 'programme-head',
    name: 'Prof. Ramon Cruz',
    email: 'ramon.cruz@srcb.edu.ph',
    department: 'College of Computing',
    programme: 'BSIT',
    scope: 'BSIT programme only',
    permissions: [
      'Monitor examination results within their assigned academic program only',
      'View student scores and examination records for their program',
      'Monitor examinations handled by teachers under their program',
      'Access examination records and reports within their assigned program',
    ]
  },
  {
    id: 'teacher-001',
    role: 'teacher',
    name: 'Ms. Jenny Garcia',
    email: 'jenny.garcia@srcb.edu.ph',
    department: 'Computer Studies',
    programme: 'BSIT',
    scope: 'Exam creation and grading',
    permissions: [
      'Manage courses and subjects',
      'Create and manage examinations',
      'Create and maintain answer keys',
      'Upload and automatically process student test papers',
      'Automatically check and grade student test papers',
      'Record student submissions and examination scores',
      'Release and publish grading results for students to view',
      'Review processed test papers and grading results',
      'Manage examination records',
    ]
  },
  {
    id: 'student-001',
    role: 'student',
    name: 'Kenneth Ernest Palicte',
    email: 'k.palicte@srcb.edu.ph',
    department: 'Computer Studies',
    programme: 'BSIT',
    studentId: '2023-00142',
    student_id: '2023-00142',
    scope: 'Own examination records only',
    permissions: [
      'View their own examination scores',
      'View which exam questions were answered correctly or incorrectly',
      'Access only their personal examination records',
    ]
  },
  {
    id: 'student-002',
    role: 'student',
    name: 'Juan Dela Cruz',
    email: 'student12345@srcb.edu.ph',
    department: 'Computer Studies',
    programme: 'BSIT',
    studentId: '12345',
    student_id: '12345',
    scope: 'Own examination records only',
    permissions: [
      'View their own examination scores',
      'View which exam questions were answered correctly or incorrectly',
      'Access only their personal examination records',
    ]
  }
];

export const mockClassRoster: StudentRosterEntry[] = [
  {
    student_id: '2023-00142',
    name: 'Kenneth Ernest Palicte',
    course_section: 'BSIT 3-A',
    email: 'k.palicte@srcb.edu.ph',
  },
  {
    student_id: '12345',
    name: 'Juan Dela Cruz',
    course_section: 'BSIT 3-A',
    email: 'student12345@srcb.edu.ph',
  },
  {
    student_id: '2023-00189',
    name: 'Alyssa Bautista',
    course_section: 'BSIT 3-A',
    email: 'a.bautista@srcb.edu.ph',
  },
  {
    student_id: '2023-00210',
    name: 'John Paul Dizon',
    course_section: 'BSIT 3-A',
    email: 'j.dizon@srcb.edu.ph',
  },
  {
    student_id: '2023-00245',
    name: 'Mary Grace Alcantara',
    course_section: 'BSIT 3-A',
    email: 'm.alcantara@srcb.edu.ph',
  },
  {
    student_id: '2023-00288',
    name: 'Sam Christopher Cruz',
    course_section: 'BSIT 3-A',
    email: 's.cruz@srcb.edu.ph',
  }
];

export const mockSystemMetrics: MetricData[] = [];

// Helper to generate answer key
function generateSampleKey(count: number): Record<string, string> {
  const choices = ['A', 'B', 'C', 'D', 'E'];
  const key: Record<string, string> = {};
  for (let i = 1; i <= count; i++) {
    key[i.toString()] = choices[(i * 7) % 5];
  }
  return key;
}

// Helper to generate student answers matching a score
function generateSampleAnswers(
  key: Record<string, string>,
  targetScore: number,
  totalItems: number,
  hasAmbiguous: boolean = false
): Record<string, { selected: string | null; is_ambiguous: boolean; is_empty: boolean }> {
  const answers: Record<string, { selected: string | null; is_ambiguous: boolean; is_empty: boolean }> = {};
  const choices = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 1; i <= totalItems; i++) {
    const qStr = i.toString();
    const correctChoice = key[qStr] || 'A';
    if (i <= targetScore) {
      answers[qStr] = {
        selected: correctChoice,
        is_ambiguous: false,
        is_empty: false,
      };
    } else if (i === totalItems && hasAmbiguous) {
      answers[qStr] = {
        selected: null,
        is_ambiguous: true,
        is_empty: false,
      };
    } else {
      // Pick a wrong choice
      const wrongChoice = choices.find(c => c !== correctChoice) || 'B';
      answers[qStr] = {
        selected: wrongChoice,
        is_ambiguous: false,
        is_empty: false,
      };
    }
  }
  return answers;
}

const prelimKey50 = generateSampleKey(50);
const midtermKey75 = generateSampleKey(75);
const prefinalKey40 = generateSampleKey(40);
const finalKey100 = generateSampleKey(100);

export const mockExams: Exam[] = [
  {
    id: 'exam-prelim-50',
    name: 'Prelim Examination - Web Systems and Technologies',
    exam_type: 'Preliminary',
    academic_year: '2025-2026',
    semester: '1st Semester',
    subject: 'Web Systems and Technologies',
    course_code: 'ITP 305',
    section: 'BSIT 3-A',
    program: 'BSIT',
    instructor_name: 'Ms. Jenny Garcia',
    num_items: 50,
    passing_score: 38,
    instructions: 'Select the best answer. Completely shade the corresponding bubble using black or blue pen.',
    exam_date: '2025-09-15',
    answer_key: prelimKey50,
    created_at: '2025-09-15T08:00:00.000Z',
  },
  {
    id: 'exam-midterm-75',
    name: 'Midterm Examination - Data Structures & Algorithms',
    exam_type: 'Midterm',
    academic_year: '2025-2026',
    semester: '1st Semester',
    subject: 'Data Structures & Algorithms',
    course_code: 'CS 201',
    section: 'BSIT 3-A',
    program: 'BSIT',
    instructor_name: 'Ms. Jenny Garcia',
    num_items: 75,
    passing_score: 56,
    instructions: 'Comprehensive 75-item midterm exam covering Trees, Graphs, Sorting, and Algorithmic Complexity.',
    exam_date: '2025-10-24',
    answer_key: midtermKey75,
    created_at: '2025-10-24T09:30:00.000Z',
  },
  {
    id: 'exam-prefinal-40',
    name: 'Pre-Final Assessment - Information Assurance & Security',
    exam_type: 'Pre-Final',
    academic_year: '2025-2026',
    semester: '1st Semester',
    subject: 'Information Assurance & Security',
    course_code: 'IAS 312',
    section: 'BSIT 3-A',
    program: 'BSIT',
    instructor_name: 'Ms. Jenny Garcia',
    num_items: 40,
    passing_score: 30,
    instructions: '40 items on Cryptographic Principles, Network Protocols, and Risk Mitigation Standards.',
    exam_date: '2025-11-18',
    answer_key: prefinalKey40,
    created_at: '2025-11-18T13:00:00.000Z',
  },
  {
    id: 'exam-final-100',
    name: 'Final Departmental Examination - Advanced Database Systems',
    exam_type: 'Final',
    academic_year: '2025-2026',
    semester: '1st Semester',
    subject: 'Advanced Database Systems',
    course_code: 'ITP 308',
    section: 'BSIT 3-A',
    program: 'BSIT',
    instructor_name: 'Ms. Jenny Garcia',
    num_items: 100,
    passing_score: 75,
    instructions: 'Standard 100-item Institutional Final Exam. Strictly no erasure or ambiguous shading.',
    exam_date: '2025-12-12',
    answer_key: finalKey100,
    created_at: '2025-12-12T10:00:00.000Z',
  }
];

export const mockSubmissions: Submission[] = [
  // Prelim (50 items)
  {
    id: 'sub-p1',
    exam_id: 'exam-prelim-50',
    student_id: '2023-00142',
    score: 44,
    total_questions: 50,
    answers: generateSampleAnswers(prelimKey50, 44, 50),
    created_at: '2025-09-15T10:15:00.000Z',
  },
  {
    id: 'sub-p2',
    exam_id: 'exam-prelim-50',
    student_id: '12345',
    score: 41,
    total_questions: 50,
    answers: generateSampleAnswers(prelimKey50, 41, 50),
    created_at: '2025-09-15T10:16:00.000Z',
  },
  {
    id: 'sub-p3',
    exam_id: 'exam-prelim-50',
    student_id: '2023-00189',
    score: 48,
    total_questions: 50,
    answers: generateSampleAnswers(prelimKey50, 48, 50),
    created_at: '2025-09-15T10:17:00.000Z',
  },
  {
    id: 'sub-p4',
    exam_id: 'exam-prelim-50',
    student_id: '2023-00210',
    score: 36,
    total_questions: 50,
    answers: generateSampleAnswers(prelimKey50, 36, 50, true),
    created_at: '2025-09-15T10:18:00.000Z',
  },
  {
    id: 'sub-p5',
    exam_id: 'exam-prelim-50',
    student_id: '2023-00245',
    score: 45,
    total_questions: 50,
    answers: generateSampleAnswers(prelimKey50, 45, 50),
    created_at: '2025-09-15T10:19:00.000Z',
  },
  {
    id: 'sub-p6',
    exam_id: 'exam-prelim-50',
    student_id: '2023-00288',
    score: 39,
    total_questions: 50,
    answers: generateSampleAnswers(prelimKey50, 39, 50),
    created_at: '2025-09-15T10:20:00.000Z',
  },

  // Midterm (75 items)
  {
    id: 'sub-m1',
    exam_id: 'exam-midterm-75',
    student_id: '2023-00142',
    score: 67,
    total_questions: 75,
    answers: generateSampleAnswers(midtermKey75, 67, 75),
    created_at: '2025-10-24T11:45:00.000Z',
  },
  {
    id: 'sub-m2',
    exam_id: 'exam-midterm-75',
    student_id: '12345',
    score: 62,
    total_questions: 75,
    answers: generateSampleAnswers(midtermKey75, 62, 75),
    created_at: '2025-10-24T11:46:00.000Z',
  },
  {
    id: 'sub-m3',
    exam_id: 'exam-midterm-75',
    student_id: '2023-00189',
    score: 71,
    total_questions: 75,
    answers: generateSampleAnswers(midtermKey75, 71, 75),
    created_at: '2025-10-24T11:47:00.000Z',
  },
  {
    id: 'sub-m4',
    exam_id: 'exam-midterm-75',
    student_id: '2023-00210',
    score: 54,
    total_questions: 75,
    answers: generateSampleAnswers(midtermKey75, 54, 75),
    created_at: '2025-10-24T11:48:00.000Z',
  },
  {
    id: 'sub-m5',
    exam_id: 'exam-midterm-75',
    student_id: '2023-00245',
    score: 69,
    total_questions: 75,
    answers: generateSampleAnswers(midtermKey75, 69, 75),
    created_at: '2025-10-24T11:49:00.000Z',
  },

  // Pre-Final (40 items)
  {
    id: 'sub-pf1',
    exam_id: 'exam-prefinal-40',
    student_id: '2023-00142',
    score: 35,
    total_questions: 40,
    answers: generateSampleAnswers(prefinalKey40, 35, 40),
    created_at: '2025-11-18T14:30:00.000Z',
  },
  {
    id: 'sub-pf2',
    exam_id: 'exam-prefinal-40',
    student_id: '12345',
    score: 32,
    total_questions: 40,
    answers: generateSampleAnswers(prefinalKey40, 32, 40),
    created_at: '2025-11-18T14:31:00.000Z',
  },
  {
    id: 'sub-pf3',
    exam_id: 'exam-prefinal-40',
    student_id: '2023-00189',
    score: 38,
    total_questions: 40,
    answers: generateSampleAnswers(prefinalKey40, 38, 40),
    created_at: '2025-11-18T14:32:00.000Z',
  },

  // Final (100 items)
  {
    id: 'sub-f1',
    exam_id: 'exam-final-100',
    student_id: '2023-00142',
    score: 92,
    total_questions: 100,
    answers: generateSampleAnswers(finalKey100, 92, 100),
    created_at: '2025-12-12T12:15:00.000Z',
  },
  {
    id: 'sub-f2',
    exam_id: 'exam-final-100',
    student_id: '12345',
    score: 84,
    total_questions: 100,
    answers: generateSampleAnswers(finalKey100, 84, 100),
    created_at: '2025-12-12T12:16:00.000Z',
  },
  {
    id: 'sub-f3',
    exam_id: 'exam-final-100',
    student_id: '2023-00189',
    score: 95,
    total_questions: 100,
    answers: generateSampleAnswers(finalKey100, 95, 100),
    created_at: '2025-12-12T12:17:00.000Z',
  }
];

export const mockRecentActivities: ActivityLog[] = [];

