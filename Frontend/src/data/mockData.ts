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
    id: 'dean-001',
    role: 'dean',
    name: 'Dr. Maria Santos',
    email: 'dean@srcb.edu.ph',
    department: 'Office of the Dean',
    programme: 'Institution-wide',
    scope: 'All departments and programmes',
    permissions: ['View all students', 'Monitor institution analytics', 'Access every exam report', 'Review all item analyses']
  },
  {
    id: 'ph-001',
    role: 'programme-head',
    name: 'Prof. Ramon Cruz',
    email: 'ramon.cruz@srcb.edu.ph',
    department: 'College of Computing',
    programme: 'BSIT',
    scope: 'BSIT programme only',
    permissions: ['View BSIT students', 'Monitor programme progress', 'Review programme analytics', 'Access faculty performance insights']
  },
  {
    id: 'teacher-001',
    role: 'teacher',
    name: 'Ms. Jenny Garcia',
    email: 'jenny.garcia@srcb.edu.ph',
    department: 'Computer Studies',
    programme: 'BSIT',
    scope: 'Exam creation and grading',
    permissions: ['Create exams', 'Upload answer keys', 'Scan and grade sheets', 'Publish results and feedback']
  },
  {
    id: 'student-001',
    role: 'student',
    name: 'Kenneth Ernest Palicte',
    email: 'k.palicte@srcb.edu.ph',
    department: 'Computer Studies',
    programme: 'BSIT',
    studentId: '2023-00142',
    scope: 'Own examination records only',
    permissions: ['View personal results', 'Review feedback', 'Track performance history']
  }
];

export const mockClassRoster: StudentRosterEntry[] = [
  {
    student_id: '2023-00142',
    name: 'Kenneth Ernest Palicte',
    course_section: 'BSIT 3-A',
    email: 'k.palicte@srcb.edu.ph'
  },
  {
    student_id: '2023-00188',
    name: 'Maria Clara Santos',
    course_section: 'BSIT 3-A',
    email: 'm.santos@srcb.edu.ph'
  },
  {
    student_id: '2023-00210',
    name: 'Juan Dela Cruz',
    course_section: 'BSIT 3-B',
    email: 'j.delacruz@srcb.edu.ph'
  },
  {
    student_id: '2023-00305',
    name: 'Jenny Rose Garcia',
    course_section: 'BSIT 3-A',
    email: 'j.garcia@srcb.edu.ph'
  }
];

export const mockSystemMetrics: MetricData[] = [
  {
    id: 'm1',
    title: 'Total Scanned Sheets',
    value: '1,284',
    subtitle: 'Across all active subjects',
    color: 'primary',
    trend: '+12% this week'
  },
  {
    id: 'm2',
    title: 'Overall Class Average',
    value: '84.6%',
    subtitle: 'Target benchmark: 75%',
    color: 'success',
    trend: '+3.2% vs last term'
  },
  {
    id: 'm3',
    title: 'Active Answer Keys',
    value: '18',
    subtitle: 'Ready for automated grading',
    color: 'info',
    trend: '3 updated today'
  },
  {
    id: 'm4',
    title: 'Flagged Submissions',
    value: '4',
    subtitle: 'Ambiguous marks requiring review',
    color: 'warning',
    trend: '-2 since yesterday'
  }
];

export const mockExams: Exam[] = [
  {
    id: 'ex-101',
    name: 'ITP 305 - Web Systems & Tech 1 Midterm',
    created_at: '2026-07-20T08:30:00.000Z',
    answer_key: {
      '1': 'A', '2': 'C', '3': 'B', '4': 'D', '5': 'E',
      '6': 'A', '7': 'A', '8': 'C', '9': 'B', '10': 'D'
    }
  },
  {
    id: 'ex-102',
    name: 'ITP 302 - Data Structures & Algorithms Quiz',
    created_at: '2026-07-22T10:15:00.000Z',
    answer_key: {
      '1': 'B', '2': 'B', '3': 'D', '4': 'A', '5': 'C',
      '6': 'E', '7': 'C', '8': 'A', '9': 'D', '10': 'B'
    }
  },
  {
    id: 'ex-103',
    name: 'ITP 308 - Database Management Systems Final',
    created_at: '2026-07-24T14:00:00.000Z',
    answer_key: {
      '1': 'C', '2': 'A', '3': 'E', '4': 'D', '5': 'B',
      '6': 'B', '7': 'C', '8': 'A', '9': 'E', '10': 'D'
    }
  }
];

export const mockSubmissions: Submission[] = [
  {
    id: 'sub-001',
    exam_id: 'ex-101',
    student_id: '2023-00142',
    score: 48,
    total_questions: 50,
    created_at: '2026-07-25T09:12:00.000Z',
    answers: {
      '1': { selected: 'A', is_ambiguous: false, is_empty: false },
      '2': { selected: 'C', is_ambiguous: false, is_empty: false },
      '3': { selected: 'B', is_ambiguous: false, is_empty: false }
    }
  },
  {
    id: 'sub-002',
    exam_id: 'ex-101',
    student_id: '2023-00188',
    score: 42,
    total_questions: 50,
    created_at: '2026-07-25T09:15:00.000Z',
    answers: {
      '1': { selected: 'A', is_ambiguous: false, is_empty: false },
      '2': { selected: 'D', is_ambiguous: true, is_empty: false },
      '3': { selected: 'B', is_ambiguous: false, is_empty: false }
    }
  },
  {
    id: 'sub-003',
    exam_id: 'ex-102',
    student_id: '2023-00210',
    score: 35,
    total_questions: 50,
    created_at: '2026-07-25T11:45:00.000Z',
    answers: {
      '1': { selected: 'B', is_ambiguous: false, is_empty: false },
      '2': { selected: null, is_ambiguous: false, is_empty: true }
    }
  },
  {
    id: 'sub-004',
    exam_id: 'ex-103',
    student_id: '2023-00305',
    score: 50,
    total_questions: 50,
    created_at: '2026-07-25T15:20:00.000Z',
    answers: {
      '1': { selected: 'C', is_ambiguous: false, is_empty: false },
      '2': { selected: 'A', is_ambiguous: false, is_empty: false }
    }
  }
];

export const mockRecentActivities: ActivityLog[] = [
  {
    id: 'act-1',
    timestamp: '10 mins ago',
    action: 'Batch Sheet Grading',
    details: 'Graded 24 student sheets for Web Systems Midterm',
    type: 'scan'
  },
  {
    id: 'act-2',
    timestamp: '1 hour ago',
    action: 'Answer Key Created',
    details: 'Uploaded key image for DBMS Final Exam',
    type: 'exam'
  },
  {
    id: 'act-3',
    timestamp: '3 hours ago',
    action: 'Quick OMR Scan',
    details: 'Extracted student ID 2023-00305 successfully',
    type: 'system'
  }
];
