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
    id: "admin-001",
    role: "admin",
    name: "System Administrator",
    email: "admin@srcb.edu.ph",
    programme: "Institution-wide",
    department: "IT Systems & Administration",
    scope: "Institutional User Management & Administration",
    permissions: [
      "Create and Manage Teacher, Student, & Staff Accounts",
      "Institutional User Directory Oversight",
      "Role-Based Access Control and System Diagnostics",
    ],
  },
  {
    id: "dean-001",
    role: "dean",
    name: "Dr. Maria Santos",
    email: "dean@srcb.edu.ph",
    department: "Office of the Dean",
    scope: "Institution-wide access across all departments and programmes",
    permissions: [
      "Monitor examination results across all Higher Education programs",
      "View student examination scores and academic performance",
      "Monitor examinations handled by teachers",
      "View overall examination progress and records",
      "Manage and oversee user access within the system",
    ],
  },
  {
    id: "ph-001",
    role: "programme-head",
    name: "Prof. Elaine Cruz",
    email: "programme-head@srcb.edu.ph",
    programme: "BSIT",
    department: "Computing Studies",
    scope: "Restricted to BSIT",
    permissions: [
      "Monitor examination results within their assigned academic program only",
      "View student scores and examination records for their program",
      "Monitor examinations handled by teachers under their program",
      "Access examination records and reports within their assigned program",
    ],
  },
  {
    id: "teacher-001",
    role: "teacher",
    name: "Prof. John Dela Cruz",
    email: "teacher@srcb.edu.ph",
    programme: "BSIT",
    department: "Computing Studies",
    scope: "Teaching access for Computing Studies",
    permissions: [
      "Manage courses and subjects",
      "Create and manage examinations",
      "Create and maintain answer keys",
      "Upload and automatically process student test papers",
      "Automatically check and grade student test papers",
      "Record student submissions and examination scores",
      "Release and publish grading results for students to view",
      "Review processed test papers and grading results",
      "Manage examination records",
    ],
  },
  {
    id: "student-001",
    role: "student",
    name: "Ana Reyes",
    email: "student@srcb.edu.ph",
    programme: "BSIT",
    department: "Computing Studies",
    studentId: "2023-0001",
    student_id: "2023-0001",
    scope: "Student access for BSIT",
    permissions: [
      "View their own examination scores",
      "View which exam questions were answered correctly or incorrectly",
      "Access only their personal examination records",
    ],
  },
  {
    id: "student-002",
    role: "student",
    name: "Kenneth Ernest Palicte",
    email: "k.palicte@srcb.edu.ph",
    programme: "BSIT",
    department: "Computer Studies",
    studentId: "2023-0002",
    student_id: "2023-0002",
    scope: "Student access for BSIT",
    permissions: [
      "View their own examination scores",
      "View which exam questions were answered correctly or incorrectly",
      "Access only their personal examination records",
    ],
  },
];

export const mockClassRoster: StudentRosterEntry[] = [];

export const mockSystemMetrics: MetricData[] = [];

export const mockExams: Exam[] = [];

export const mockSubmissions: Submission[] = [];

export const mockRecentActivities: ActivityLog[] = [];

