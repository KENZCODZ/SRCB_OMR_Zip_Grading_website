import React from 'react';
import { Eye, GraduationCap, Calendar, Inbox, UserCheck } from 'lucide-react';
import type { Submission, Exam, StudentRosterEntry } from '../types';
import StatusBadge from './StatusBadge';
import { calculateTransmutedGrade } from '../utils/excelUtils';

export interface SubmissionTableProps {
  submissions: Submission[];
  exams: Exam[];
  roster?: StudentRosterEntry[];
  searchQuery?: string;
  onSelectSubmission: (submission: Submission) => void;
  formatDate: (iso: string) => string;
}

export const SubmissionTable: React.FC<SubmissionTableProps> = ({
  submissions,
  exams,
  roster = [],
  searchQuery = '',
  onSelectSubmission,
  formatDate
}) => {
  const getExamName = (examId: string) => {
    const found = exams.find(e => e.id === examId);
    return found ? found.name : 'Unknown Exam';
  };

  const rosterMap = new Map<string, StudentRosterEntry>();
  roster.forEach(r => rosterMap.set(r.student_id.toLowerCase(), r));

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const examName = getExamName(sub.exam_id).toLowerCase();
    const matchedStudent = rosterMap.get((sub.student_id || '').toLowerCase());
    const studentName = matchedStudent ? matchedStudent.name.toLowerCase() : '';

    return sub.student_id.toLowerCase().includes(query) || examName.includes(query) || studentName.includes(query);
  });

  if (filteredSubmissions.length === 0) {
    return (
      <div className="empty-state">
        <Inbox size={36} className="text-muted" style={{ marginBottom: 8 }} />
        <p style={{ margin: 0, fontWeight: 500 }}>No submissions found matching criteria</p>
      </div>
    );
  }

  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Student Roster</th>
            <th>Exam Title</th>
            <th>Score & Status</th>
            <th>PH CHED Grade</th>
            <th>Date & Time</th>
            <th style={{ textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubmissions.map(sub => {
            const matchedStudent = rosterMap.get((sub.student_id || '').toLowerCase());
            const transmuted = calculateTransmutedGrade(sub.score, sub.total_questions || 50);

            return (
              <tr key={sub.id} className="table-row-hover">
                <td style={{ fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {matchedStudent ? (
                      <UserCheck size={16} className="text-success" />
                    ) : (
                      <GraduationCap size={16} className="text-primary" />
                    )}
                    <div>
                      <div>{matchedStudent ? matchedStudent.name : sub.student_id}</div>
                      {matchedStudent && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                          ID: {sub.student_id} {matchedStudent.course_section ? `• ${matchedStudent.course_section}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td>{getExamName(sub.exam_id)}</td>
                <td>
                  <StatusBadge score={sub.score} totalQuestions={sub.total_questions || 50} />
                </td>
                <td>
                  <span className={`badge ${transmuted.status === 'Passed' ? 'badge-success' : 'badge-danger'}`}>
                    Grade {transmuted.grade} ({transmuted.remarks})
                  </span>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                    <Calendar size={14} />
                    {formatDate(sub.created_at)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onSelectSubmission(sub)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Eye size={14} />
                    Inspect
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SubmissionTable;
