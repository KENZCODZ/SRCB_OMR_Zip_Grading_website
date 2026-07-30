import type { Exam, Submission, QuickScanResult, GradeResult } from './types';

// Detect whether we are running in local Vite development server
const API_BASE = import.meta.env.VITE_API_BASE ?? '';

export async function loginUser(email: string, password: string): Promise<{ id: string; name: string; email: string; role: string; programme?: string | null; department?: string | null }> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Login failed');
  }

  return response.json();
}

export async function fetchDashboardSummary(): Promise<{ total_students: number; total_exams: number; average_score: number; total_submissions: number }> {
  const response = await fetch(`${API_BASE}/api/dashboard/summary`);
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard summary');
  }
  return response.json();
}

export async function fetchExams(): Promise<Exam[]> {
  const response = await fetch(`${API_BASE}/api/exams`);
  if (!response.ok) {
    throw new Error('Failed to fetch exams');
  }
  return response.json();
}

export async function createExam(name: string, answerKey: Record<string, string>): Promise<Exam> {
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
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to create exam');
  }
  return response.json();
}

export async function gradeSheet(examId: string, file: File): Promise<GradeResult> {
  const formData = new FormData();
  formData.append('exam_id', examId);
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/grade`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to grade sheet');
  }
  return response.json();
}

export async function extractSheet(file: File): Promise<QuickScanResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/extract`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to extract sheet data');
  }
  return response.json();
}

export async function fetchSubmissions(examId?: string): Promise<Submission[]> {
  const url = examId ? `${API_BASE}/api/submissions?exam_id=${examId}` : `${API_BASE}/api/submissions`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch submissions');
  }
  return response.json();
}

export async function deleteExam(examId: string): Promise<{ status: string, message: string }> {
  const response = await fetch(`${API_BASE}/api/exams/${examId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Failed to delete exam');
  }
  return response.json();
}
