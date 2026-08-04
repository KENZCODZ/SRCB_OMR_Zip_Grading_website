import type { Exam, Submission, QuickScanResult, GradeResult } from './types';

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

export async function loginUser(email: string, password: string): Promise<{ id: string; name: string; email: string; role: string; programme?: string | null; department?: string | null }> {
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

export async function fetchDashboardSummary(): Promise<{ total_students: number; total_exams: number; average_score: number; total_submissions: number }> {
  try {
    const response = await fetch(`${API_BASE}/api/dashboard/summary`);
    return await handleResponse(response, 'Failed to fetch dashboard summary');
  } catch (err) {
    catchNetworkError(err, 'Failed to fetch dashboard summary');
  }
}

export async function fetchExams(): Promise<Exam[]> {
  try {
    const response = await fetch(`${API_BASE}/api/exams`);
    return await handleResponse(response, 'Failed to fetch exams');
  } catch (err) {
    catchNetworkError(err, 'Failed to fetch exams');
  }
}

export async function createExam(name: string, answerKey: Record<string, string>): Promise<Exam> {
  try {
    const response = await fetch(`${API_BASE}/api/exams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        answer_key: answerKey,
      }),
    });
    return await handleResponse(response, 'Failed to create exam');
  } catch (err) {
    catchNetworkError(err, 'Failed to create exam');
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
    return await handleResponse(response, 'Failed to grade sheet');
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
    return await handleResponse(response, 'Failed to extract sheet data');
  } catch (err) {
    catchNetworkError(err, 'Failed to extract sheet data');
  }
}

export async function fetchSubmissions(examId?: string): Promise<Submission[]> {
  try {
    const url = examId ? `${API_BASE}/api/submissions?exam_id=${examId}` : `${API_BASE}/api/submissions`;
    const response = await fetch(url);
    return await handleResponse(response, 'Failed to fetch submissions');
  } catch (err) {
    catchNetworkError(err, 'Failed to fetch submissions');
  }
}

export async function deleteExam(examId: string): Promise<{ status: string, message: string }> {
  try {
    const response = await fetch(`${API_BASE}/api/exams/${examId}`, {
      method: 'DELETE',
    });
    return await handleResponse(response, 'Failed to delete exam');
  } catch (err) {
    catchNetworkError(err, 'Failed to delete exam');
  }
}

