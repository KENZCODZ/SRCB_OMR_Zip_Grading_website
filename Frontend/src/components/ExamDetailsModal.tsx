import React from 'react';
import {
  X,
  BookOpen,
  Calendar,
  User,
  Layers,
  FileText,
  Hash,
  GraduationCap,
  Clock,
  Award,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Exam } from '../types';

interface ExamDetailsModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (examId: string) => void;
  formatDate: (iso: string) => string;
}

const ExamDetailsModal: React.FC<ExamDetailsModalProps> = ({
  exam,
  isOpen,
  onClose,
  onDelete,
  formatDate,
}) => {
  if (!isOpen || !exam) return null;

  const safeExamType = exam.exam_type || 'Midterm';
  const questionCount = exam.num_items || Object.keys(exam.answer_key || {}).length || 0;
  const configuredAnswers = Object.values(exam.answer_key || {}).filter(Boolean).length;

  const getExamTypeBadgeStyle = (type: string) => {
    switch (type.toLowerCase()) {
      case 'preliminary':
      case 'prelim':
        return { background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)' };
      case 'midterm':
        return { background: 'rgba(245, 158, 11, 0.2)', color: 'var(--srcb-gold-light)', border: '1px solid rgba(245, 158, 11, 0.4)' };
      case 'pre-final':
      case 'prefinal':
        return { background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.4)' };
      case 'final':
        return { background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)' };
      default:
        return { background: 'rgba(148, 163, 184, 0.2)', color: '#cbd5e1', border: '1px solid rgba(148, 163, 184, 0.4)' };
    }
  };

  const answerChoiceColor = (ans: string) => {
    switch (ans) {
      case 'A': return '#60a5fa';
      case 'B': return '#34d399';
      case 'C': return '#f59e0b';
      case 'D': return '#f87171';
      case 'E': return '#a78bfa';
      default:   return '#94a3b8';
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(exam.id);
      onClose();
    }
  };

  const keyEntries = Object.entries(exam.answer_key || {})
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));

  const columns: Array<Array<{ q: string; ans: string }>> = [];
  const itemsPerCol = 10;
  for (let i = 0; i < keyEntries.length; i += itemsPerCol) {
    columns.push(keyEntries.slice(i, i + itemsPerCol).map(([q, ans]) => ({ q, ans })));
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1.5rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '860px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--srcb-gold-accent)',
          boxShadow: '0 30px 60px -15px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(8, 17, 40, 0.95) 100%)',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
            <div
              style={{
                width: '44px', height: '44px',
                borderRadius: '12px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--srcb-gold-accent)',
                flexShrink: 0,
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '3px' }}>
                <span
                  style={{
                    ...getExamTypeBadgeStyle(safeExamType),
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  {safeExamType}
                </span>
                {exam.course_code && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                    [{exam.course_code}]
                  </span>
                )}
                {exam.section && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    • {exam.section}
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {exam.name}
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {onDelete && (
              <button
                className="btn btn-danger"
                style={{ padding: '0.45rem 1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                onClick={handleDelete}
              >
                <Trash2 size={15} /> Delete Exam
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-icon-only"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>

          {/* Section 1: Academic & Exam Info */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--srcb-gold-light)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={16} /> Examination Identity & Academic Context
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.85rem' }}>
              {([
                { icon: GraduationCap, label: 'Subject / Course', value: exam.subject },
                { icon: Hash, label: 'Course Code', value: exam.course_code },
                { icon: User, label: 'Section', value: exam.section },
                { icon: BookOpen, label: 'Program / Dept.', value: exam.program },
                { icon: User, label: 'Instructor', value: exam.instructor_name },
                { icon: Calendar, label: 'Academic Year', value: exam.academic_year },
                { icon: Clock, label: 'Semester', value: exam.semester },
                { icon: Calendar, label: 'Exam Date', value: exam.exam_date ? new Date(exam.exam_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                { icon: Layers, label: 'Total Items', value: questionCount ? `${questionCount} items` : '—' },
                { icon: Award, label: 'Passing Score', value: exam.passing_score ? `${exam.passing_score} pts` : '—' },
              ] as const).map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                    <Icon size={12} color="var(--srcb-gold-accent)" />
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: value && value !== '—' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {value || '—'}
                  </div>
                </div>
              ))}
            </div>

            {exam.instructions && (
              <div
                style={{
                  marginTop: '1rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                  <FileText size={12} color="var(--srcb-gold-accent)" />
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600 }}>
                    Exam Instructions
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {exam.instructions}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Answer Key */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--srcb-gold-light)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> Configured Answer Key
              </h3>
              <div>
                {configuredAnswers === questionCount && questionCount > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                    <CheckCircle2 size={14} /> Complete ({configuredAnswers}/{questionCount})
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>
                    <AlertCircle size={14} /> {configuredAnswers}/{questionCount} configured
                  </span>
                )}
              </div>
            </div>

            {keyEntries.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1.5rem' }}>
                No answer key configured for this examination.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${Math.min(columns.length, 5)}, 1fr)`,
                  gap: '0.5rem',
                }}
              >
                {columns.map((col, colIdx) => (
                  <div key={colIdx}>
                    {col.map(({ q, ans }) => (
                      <div
                        key={q}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.3rem 0.5rem',
                          borderRadius: '6px',
                          marginBottom: '3px',
                          background: 'rgba(255,255,255,0.025)',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '22px', textAlign: 'right' }}>
                          {q}.
                        </span>
                        <span
                          style={{
                            width: '24px', height: '24px',
                            borderRadius: '50%',
                            background: `${answerChoiceColor(ans)}22`,
                            border: `1.5px solid ${answerChoiceColor(ans)}`,
                            color: answerChoiceColor(ans),
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {ans}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={12} />
              Created: {formatDate(exam.created_at)}
            </span>
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamDetailsModal;
