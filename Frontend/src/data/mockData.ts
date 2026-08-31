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

export const mockClassRoster: StudentRosterEntry[] = [];

export const mockSystemMetrics: MetricData[] = [];

export const mockExams: Exam[] = [];

export const mockSubmissions: Submission[] = [];

export const mockRecentActivities: ActivityLog[] = [];

