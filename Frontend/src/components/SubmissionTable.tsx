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
              <tr 
                key={sub.id} 
                className="table-row-hover"
                style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                onClick={() => onSelectSubmission(sub)}
              >
                <td style={{ padding: '1.15rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: matchedStudent ? 'var(--success-bg)' : 'var(--info-bg)',
                      color: matchedStudent ? 'var(--success-text)' : 'var(--info)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {matchedStudent ? <UserCheck size={16} /> : <GraduationCap size={16} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                        {matchedStudent ? matchedStudent.name : sub.student_id}
                      </div>
                      {matchedStudent && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                          ID: <span style={{ fontFamily: 'monospace' }}>{sub.student_id}</span> 
                          {matchedStudent.course_section ? <span style={{ margin: '0 0.35rem', color: 'var(--border)' }}>•</span> : ''}
                          {matchedStudent.course_section}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                  {getExamName(sub.exam_id)}
                </td>
                <td>
                  <StatusBadge score={sub.score} totalQuestions={sub.total_questions || 50} />
                </td>
                <td>
                  <span 
                    className={`badge ${transmuted.status === 'Passed' ? 'badge-success' : 'badge-danger'}`}
                    style={{ padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.78rem' }}
                  >
                    Grade {transmuted.grade} <span style={{ opacity: 0.85, fontWeight: 500 }}>({transmuted.remarks})</span>
                  </span>
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>
                    <Calendar size={13} style={{ color: 'var(--gold-deep)' }} />
                    {formatDate(sub.created_at)}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSubmission(sub);
                    }}
                    style={{ borderRadius: '6px', padding: '0.4rem 0.8rem' }}
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
