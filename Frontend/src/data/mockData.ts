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

export const mockClassRoster: StudentRosterEntry[] = [];

export const mockSystemMetrics: MetricData[] = [];

export const mockExams: Exam[] = [];

export const mockSubmissions: Submission[] = [];

export const mockRecentActivities: ActivityLog[] = [];

