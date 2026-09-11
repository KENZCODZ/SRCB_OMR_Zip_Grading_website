import type {
  Exam,
  Submission,
  QuickScanResult,
  GradeResult,
  PendingUser,
  RegisterPayload,
  Program,
  Instructor,
  Subject,
  Section,
  Enrollment,
  RosterImportResponse,
} from './types';
import { cacheManager } from './utils/cacheManager';

// Detect whether we are running in local Vite development server
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function handleResponse<T>(response: Response, defaultErrorMsg: string): Promise<T> {
  const text = await response.text();
  let data: any = null;

  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      // Body is not valid JSON (e.g. HTML 404/500 page or proxy error)
    }
  }

  if (!response.ok) {
    const detail = data?.detail || (text && text.length < 150 && !text.includes('<!DOCTYPE') ? text : null) || defaultErrorMsg;
    throw new Error(detail);
  }

  if (data === null) {
    if (!text || text.trim().length === 0) {
      return {} as T;
    }
    throw new Error('Server returned non-JSON response. Please ensure backend server is running on port 8000.');
  }

  return data as T;
}

function catchNetworkError(err: any, fallbackMsg: string): never {
  if (err instanceof TypeError && err.message?.includes('fetch')) {
    throw new Error('Unable to connect to backend server. Please ensure Python backend is running on port 8000.');
  }
  if (err instanceof Error && err.message) {
    throw err;
  }
  throw new Error(typeof err === 'string' && err ? err : fallbackMsg);
}

export async function registerUser(payload: RegisterPayload): Promise<{ status: string; message: string; user: any }> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<{ status: string; message: string; user: any }>(response, 'Registration failed');
    cacheManager.invalidate(/^users_pending/);
    return result;
  } catch (err) {
    catchNetworkError(err, 'Registration failed');
  }
}

export async function loginUser(email: string, password: string): Promise<{ id: string; name: string; email: string; role: string; programme?: string | null; department?: string | null; student_id?: string | null; studentId?: string | null }> {
  try {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return await handleResponse(response, 'Invalid email or password');
  } catch (err) {
    catchNetworkError(err, 'Login failed');
  }
}

export async function fetchPendingUsers(programme?: string, options?: { forceRefresh?: boolean }): Promise<PendingUser[]> {
  const cacheKey = programme ? `users_pending_${programme}` : 'users_pending_all';
  return cacheManager.fetchWithCache(
    cacheKey,
    async () => {
      try {
        const query = programme ? `?programme=${encodeURIComponent(programme)}` : '';
        const response = await fetch(`${API_BASE}/api/users/pending${query}`);
        return await handleResponse<PendingUser[]>(response, 'Failed to fetch pending registrations');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch pending registrations');
      }
    },
    options
  );
}

export async function approveUser(userId: string): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}/approve`, {
      method: 'POST',
    });
    const result = await handleResponse<{ status: string; message: string }>(response, 'Failed to approve registration');
    cacheManager.invalidate(/^users_pending/);
    cacheManager.invalidate('users_all');
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to approve registration');
  }
}

export async function rejectUser(userId: string): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}/reject`, {
      method: 'POST',
    });
    const result = await handleResponse<{ status: string; message: string }>(response, 'Failed to reject registration');
    cacheManager.invalidate(/^users_pending/);
    cacheManager.invalidate('users_all');
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to reject registration');
  }
}

export async function fetchAllUsers(options?: { forceRefresh?: boolean }): Promise<PendingUser[]> {
  return cacheManager.fetchWithCache(
    'users_all',
    async () => {
      try {
        const response = await fetch(`${API_BASE}/api/users`);
        return await handleResponse<PendingUser[]>(response, 'Failed to fetch user accounts');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch user accounts');
      }
    },
    options
  );
}

export async function adminCreateUser(payload: {
  name: string;
  email: string;
  password: string;
  role: 'teacher' | 'student';
  programme?: string;
  department?: string;
  student_id?: string;
}): Promise<{ status: string; message: string; user: any }> {
  try {
    const response = await fetch(`${API_BASE}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<{ status: string; message: string; user: any }>(response, 'Failed to create user account');
    cacheManager.invalidate('users_all');
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to create user account');
  }
}

export async function deleteUser(userId: string): Promise<{ status: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'DELETE',
    });
    const result = await handleResponse<{ status: string; message: string }>(response, 'Failed to delete user account');
    cacheManager.invalidate('users_all');
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to delete user account');
  }
}

export async function fetchDashboardSummary(options?: { forceRefresh?: boolean }): Promise<{ total_accounts: number; total_students: number; total_teachers: number; total_exams: number; average_score: number; total_submissions: number }> {
  return cacheManager.fetchWithCache(
    'dashboard_summary',
    async () => {
      try {
        const response = await fetch(`${API_BASE}/api/dashboard/summary`);
        return await handleResponse<{ total_accounts: number; total_students: number; total_teachers: number; total_exams: number; average_score: number; total_submissions: number }>(response, 'Failed to fetch dashboard summary');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch dashboard summary');
      }
    },
    options
  );
}

export async function fetchExams(options?: { forceRefresh?: boolean }): Promise<Exam[]> {
  return cacheManager.fetchWithCache(
    'exams',
    async () => {
      try {
        const response = await fetch(`${API_BASE}/api/exams`);
        return await handleResponse<Exam[]>(response, 'Failed to fetch exams');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch exams');
      }
    },
    options
  );
}

export interface ExamPayload {
  name: string;
  answer_key: Record<string, string>;
  exam_type?: string;
  academic_year?: string;
  semester?: string;
  subject?: string;
  course_code?: string;
  section?: string;
  program?: string;
  instructor_name?: string;
  subject_id?: string;
  instructor_id?: string;
  num_items?: number;
  passing_score?: number;
  instructions?: string;
  exam_date?: string;
}

export async function createExam(payload: ExamPayload): Promise<Exam> {
  try {
    const response = await fetch(`${API_BASE}/api/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        answer_key: payload.answer_key,
        exam_type: payload.exam_type ?? null,
        academic_year: payload.academic_year ?? null,
        semester: payload.semester ?? null,
        subject: payload.subject ?? null,
        course_code: payload.course_code ?? null,
        section: payload.section ?? null,
        program: payload.program ?? null,
        instructor_name: payload.instructor_name ?? null,
        subject_id: payload.subject_id ?? null,
        instructor_id: payload.instructor_id ?? null,
        num_items: payload.num_items ?? 50,
        passing_score: payload.passing_score ?? null,
        instructions: payload.instructions ?? null,
        exam_date: payload.exam_date ?? null,
      }),
    });
    const result = await handleResponse<Exam>(response, 'Failed to create exam');
    cacheManager.invalidate('exams');
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to create exam');
  }
}

export async function updateExam(examId: string, payload: ExamPayload): Promise<Exam> {
  try {
    const response = await fetch(`${API_BASE}/api/exams/${examId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: payload.name,
        answer_key: payload.answer_key,
        exam_type: payload.exam_type ?? null,
        academic_year: payload.academic_year ?? null,
        semester: payload.semester ?? null,
        subject: payload.subject ?? null,
        course_code: payload.course_code ?? null,
        section: payload.section ?? null,
        program: payload.program ?? null,
        instructor_name: payload.instructor_name ?? null,
        subject_id: payload.subject_id ?? null,
        instructor_id: payload.instructor_id ?? null,
        num_items: payload.num_items ?? 50,
        passing_score: payload.passing_score ?? null,
        instructions: payload.instructions ?? null,
        exam_date: payload.exam_date ?? null,
      }),
    });
    const result = await handleResponse<Exam>(response, 'Failed to update exam');
    cacheManager.invalidate('exams');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to update exam');
  }
}

export async function gradeSheet(examId: string, file: File): Promise<GradeResult> {
  try {
    const formData = new FormData();
    formData.append('exam_id', examId);
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/grade`, {
      method: 'POST',
      body: formData,
    });
    const result = await handleResponse<GradeResult>(response, 'Failed to grade sheet');
    cacheManager.invalidate(/^submissions/);
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to grade sheet');
  }
}

export async function extractSheet(file: File): Promise<QuickScanResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse<QuickScanResult>(response, 'Failed to extract sheet data');
  } catch (err) {
    catchNetworkError(err, 'Failed to extract sheet data');
  }
}

export async function fetchSubmissions(examId?: string, options?: { forceRefresh?: boolean }): Promise<Submission[]> {
  const cacheKey = examId ? `submissions_${examId}` : 'submissions';
  return cacheManager.fetchWithCache(
    cacheKey,
    async () => {
      try {
        const url = examId ? `${API_BASE}/api/submissions?exam_id=${examId}` : `${API_BASE}/api/submissions`;
        const response = await fetch(url);
        return await handleResponse<Submission[]>(response, 'Failed to fetch submissions');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch submissions');
      }
    },
    options
  );
}

export async function deleteExam(examId: string): Promise<{ status: string, message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/exams/${examId}`, {
      method: 'DELETE',
    });
    const result = await handleResponse<{ status: string, message: string }>(response, 'Failed to delete exam');
    cacheManager.invalidate('exams');
    cacheManager.invalidate(/^submissions/);
    cacheManager.invalidate('dashboard_summary');
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to delete exam');
  }
}

// ── Academic Management Services (Conceptual ERD Alignment) ─────────────────

export async function fetchPrograms(options?: { forceRefresh?: boolean }): Promise<Program[]> {
  return cacheManager.fetchWithCache(
    'programs_all',
    async () => {
      try {
        const response = await fetch(`${API_BASE}/api/programs`);
        return await handleResponse<Program[]>(response, 'Failed to fetch academic programs');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch academic programs');
      }
    },
    options
  );
}

export async function fetchInstructors(programId?: string, options?: { forceRefresh?: boolean }): Promise<Instructor[]> {
  const cacheKey = programId ? `instructors_${programId}` : 'instructors_all';
  return cacheManager.fetchWithCache(
    cacheKey,
    async () => {
      try {
        const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
        const response = await fetch(`${API_BASE}/api/instructors${query}`);
        return await handleResponse<Instructor[]>(response, 'Failed to fetch faculty instructors');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch faculty instructors');
      }
    },
    options
  );
}

export async function createProgram(payload: {
  program_code: string;
  program_name: string;
  department_name?: string;
}): Promise<Program> {
  try {
    const response = await fetch(`${API_BASE}/api/programs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<Program>(response, 'Failed to create program');
    cacheManager.invalidate(/^programs/);
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to create program');
  }
}

export async function fetchSubjects(programId?: string, options?: { forceRefresh?: boolean }): Promise<Subject[]> {
  const cacheKey = programId ? `subjects_${programId}` : 'subjects_all';
  return cacheManager.fetchWithCache(
    cacheKey,
    async () => {
      try {
        const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
        const response = await fetch(`${API_BASE}/api/subjects${query}`);
        return await handleResponse<Subject[]>(response, 'Failed to fetch subjects');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch subjects');
      }
    },
    options
  );
}

export async function createSubject(payload: {
  subject_code: string;
  subject_name: string;
  program_id: string;
  description?: string;
  units?: number;
  is_major?: number;
}): Promise<Subject> {
  try {
    const response = await fetch(`${API_BASE}/api/subjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<Subject>(response, 'Failed to create subject');
    cacheManager.invalidate(/^subjects/);
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to create subject');
  }
}

export async function fetchSections(programId?: string, options?: { forceRefresh?: boolean }): Promise<Section[]> {
  const cacheKey = programId ? `sections_${programId}` : 'sections_all';
  return cacheManager.fetchWithCache(
    cacheKey,
    async () => {
      try {
        const query = programId ? `?program_id=${encodeURIComponent(programId)}` : '';
        const response = await fetch(`${API_BASE}/api/sections${query}`);
        return await handleResponse<Section[]>(response, 'Failed to fetch sections');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch sections');
      }
    },
    options
  );
}

export async function createSection(payload: {
  section_name: string;
  year_level: number;
  program_id: string;
}): Promise<Section> {
  try {
    const response = await fetch(`${API_BASE}/api/sections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<Section>(response, 'Failed to create section');
    cacheManager.invalidate(/^sections/);
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to create section');
  }
}

export async function fetchEnrollments(
  filter?: { section_id?: string; academic_year?: string; semester?: string },
  options?: { forceRefresh?: boolean }
): Promise<Enrollment[]> {
  const queryParams = new URLSearchParams();
  if (filter?.section_id) queryParams.set('section_id', filter.section_id);
  if (filter?.academic_year) queryParams.set('academic_year', filter.academic_year);
  if (filter?.semester) queryParams.set('semester', filter.semester);

  const qs = queryParams.toString();
  const cacheKey = qs ? `enrollments_${qs}` : 'enrollments_all';

  return cacheManager.fetchWithCache(
    cacheKey,
    async () => {
      try {
        const response = await fetch(`${API_BASE}/api/enrollments${qs ? `?${qs}` : ''}`);
        return await handleResponse<Enrollment[]>(response, 'Failed to fetch enrollments');
      } catch (err) {
        catchNetworkError(err, 'Failed to fetch enrollments');
      }
    },
    options
  );
}

export async function importSectionRoster(
  sectionId: string,
  payload: {
    academic_year: string;
    semester: string;
    students: Array<{ student_id: string; name: string; email?: string }>;
  }
): Promise<RosterImportResponse> {
  try {
    const response = await fetch(`${API_BASE}/api/sections/${sectionId}/enrollments/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await handleResponse<RosterImportResponse>(response, 'Failed to import class roster');
    cacheManager.invalidate(/^enrollments/);
    return result;
  } catch (err) {
    catchNetworkError(err, 'Failed to import class roster');
  }
}



