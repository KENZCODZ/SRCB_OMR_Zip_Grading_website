import React, { useState, useMemo, useEffect } from 'react';
import { Eye, Inbox, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { Submission, Exam, StudentRosterEntry } from '../types';
import { calculateTransmutedGrade } from '../utils/excelUtils';

export interface SubmissionTableProps {
  submissions: Submission[];
  exams: Exam[];
  roster?: StudentRosterEntry[];
  searchQuery?: string;
  onSelectSubmission: (submission: Submission) => void;
  formatDate: (iso: string) => string;
  selectedSubmissionId?: string;
  onRowHighlight?: (id: string) => void;
}

export const SubmissionTable: React.FC<SubmissionTableProps> = ({
  submissions,
  exams,
  roster = [],
  searchQuery = '',
  onSelectSubmission,
  formatDate,
  selectedSubmissionId,
  onRowHighlight,
}) => {
  const [activeRowId, setActiveRowId] = useState<string>(
    selectedSubmissionId || (submissions.length > 0 ? submissions[0].id : '')
  );
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Sync prop changes
  useEffect(() => {
    if (selectedSubmissionId) {
      setActiveRowId(selectedSubmissionId);
    } else if (submissions.length > 0 && !activeRowId) {
      setActiveRowId(submissions[0].id);
    }
  }, [selectedSubmissionId, submissions, activeRowId]);

  const getExamName = (examId: string) => {
    const found = exams.find((e) => e.id === examId);
    return found ? found.name : 'Institutional Exam';
  };

  const rosterMap = useMemo(() => {
    const map = new Map<string, StudentRosterEntry>();
    roster.forEach((r) => map.set(r.student_id.toLowerCase(), r));
    return map;
  }, [roster]);

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const examName = getExamName(sub.exam_id).toLowerCase();
      const matchedStudent = rosterMap.get((sub.student_id || '').toLowerCase());
      const studentName = matchedStudent ? matchedStudent.name.toLowerCase() : '';
      const query = searchQuery.trim().toLowerCase();

      return (
        !query ||
        sub.student_id.toLowerCase().includes(query) ||
        examName.includes(query) ||
        studentName.includes(query) ||
        sub.id.toLowerCase().includes(query)
      );
    });
  }, [submissions, searchQuery, rosterMap, exams]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSubmissions.length / pageSize) || 1;
  const paginatedSubmissions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubmissions.slice(start, start + pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  const handleRowClick = (sub: Submission) => {
    setActiveRowId(sub.id);
    if (onRowHighlight) {
      onRowHighlight(sub.id);
    }
  };

  // Generate avatar initials
  const getAvatarInitials = (name: string, id: string) => {
    if (name && name.length > 0) {
      const cleaned = name.replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s+/i, '').trim();
      const parts = cleaned.split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      return cleaned.slice(0, 2).toUpperCase();
    }
    return (id || 'ST').slice(-2).toUpperCase();
  };

  const getStatusDetails = (score: number, total: number) => {
    const pct = Math.round((score / total) * 100);
    if (pct >= 90) {
      return { label: 'High Distinction', dotColor: '#10b981' };
    }
    if (pct >= 75) {
      return { label: 'Passed', dotColor: '#0062ff' };
    }
    if (pct >= 60) {
      return { label: 'Conditional', dotColor: '#f59e0b' };
    }
    return { label: 'Needs Remediation', dotColor: '#ef4444' };
  };

  if (filteredSubmissions.length === 0) {
    return (
      <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#ffffff', border: '1px solid #eef2f7', borderRadius: '16px' }}>
        <Inbox size={38} className="text-muted" style={{ marginBottom: 10, opacity: 0.5 }} />
        <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>No Examination Submissions Recorded</h4>
        <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Scan student bubble sheets or grade exams using the Quick Scanner module to populate records.
        </p>
      </div>
    );
  }

  return (
    <div className="reference-table-wrapper">
      <div className="floating-table-container">
        {/* Header Row */}
        <div className="floating-table-header">
          <div className="col-id">#ID</div>
          <div className="col-name">Student Examinee</div>
          <div className="col-address">Examination / Subject</div>
          <div className="col-date">Date Graded</div>
          <div className="col-price">Score & Grade</div>
          <div className="col-status">Academic Standing</div>
          <div className="col-action">Actions</div>
        </div>

        {/* Body Rows */}
        <div className="floating-rows-list">
          {paginatedSubmissions.map((sub, index) => {
            const matchedStudent = rosterMap.get((sub.student_id || '').toLowerCase());
            const studentDisplayName = matchedStudent ? matchedStudent.name : `Student ${sub.student_id}`;
            const totalQ = sub.total_questions || 50;
            const transmuted = calculateTransmutedGrade(sub.score, totalQ);
            const status = getStatusDetails(sub.score, totalQ);
            const isSelected = activeRowId === sub.id;

            return (
              <div
                key={sub.id}
                className={`floating-row-card ${isSelected ? 'highlighted' : ''}`}
                onClick={() => handleRowClick(sub)}
              >
                {/* ID Column */}
                <div className="col-id">
                  <span className="id-badge">#{index + 1}</span>
                </div>

                {/* Name & Avatar Column */}
                <div className="col-name">
                  <div className="avatar-wrapper">
                    <div className="student-avatar-circle">
                      {getAvatarInitials(studentDisplayName, sub.student_id)}
                    </div>
                    <div className="student-info-text">
                      <div className="student-name-title" title={studentDisplayName}>
                        {studentDisplayName}
                      </div>
                      <div className="student-sub-id" title={matchedStudent?.course_section || sub.student_id}>
                        {matchedStudent?.course_section ? `${matchedStudent.course_section}` : `ID: ${sub.student_id}`}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Examination Subject Column */}
                <div className="col-address">
                  <div className="exam-title-text" title={getExamName(sub.exam_id)}>
                    {getExamName(sub.exam_id)}
                  </div>
                  <div className="exam-sub-info">Higher Education • Standard OMR Sheet</div>
                </div>

                {/* Date Column */}
                <div className="col-date">
                  <span className="date-text">{formatDate(sub.created_at)}</span>
                </div>

                {/* Score Column */}
                <div className="col-price">
                  <div className="score-primary">
                    {sub.score}/{totalQ} <span className="score-pct">({Math.round((sub.score / totalQ) * 100)}%)</span>
                  </div>
                  <div className="score-transmuted">CHED Grade {transmuted.grade}</div>
                </div>

                {/* Status Column */}
                <div className="col-status">
                  <span className="status-pill">
                    <span className="status-dot" style={{ backgroundColor: isSelected ? '#ffffff' : status.dotColor }} />
                    <span className="status-label-text">{status.label}</span>
                  </span>
                </div>

                {/* Action Column */}
                <div className="col-action" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="icon-action-btn"
                    title="Inspect Submission Details"
                    onClick={() => onSelectSubmission(sub)}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-action-btn"
                    title="View Details"
                    onClick={() => onSelectSubmission(sub)}
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination Footer */}
      {filteredSubmissions.length > pageSize && (
        <div className="reference-pagination-bar">
          <div className="pagination-info">
            Showing {String((currentPage - 1) * pageSize + 1).padStart(2, '0')}-
            {String(Math.min(currentPage * pageSize, filteredSubmissions.length)).padStart(2, '0')} of {filteredSubmissions.length} submissions
          </div>

          <div className="pagination-controls">
            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={15} />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                onClick={() => setCurrentPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="page-nav-btn"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionTable;
