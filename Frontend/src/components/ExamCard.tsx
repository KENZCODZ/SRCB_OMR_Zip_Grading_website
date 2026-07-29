import React from 'react';
import { BookOpen, Calendar, Trash2, ChevronRight } from 'lucide-react';
import type { Exam } from '../types';

export interface ExamCardProps {
  exam: Exam;
  isSelected?: boolean;
  onSelect: (examId: string) => void;
  onDelete?: (examId: string) => void;
  formatDate: (iso: string) => string;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  isSelected = false,
  onSelect,
  onDelete,
  formatDate
}) => {
  const { id, name, answer_key, created_at } = exam;
  const questionCount = Object.keys(answer_key || {}).length;

  return (
    <div
      className={`card exam-item-card ${isSelected ? 'exam-card-selected' : ''}`}
      onClick={() => onSelect(id)}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      <div className="flex-justify-between">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="icon-avatar">
            <BookOpen size={20} className="text-primary" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{name}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>
                <strong>{questionCount}</strong> items configured
              </span>
              <span>•</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} />
                {formatDate(created_at)}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onDelete && (
            <button
              className="btn btn-secondary btn-icon-only"
              title="Delete Exam"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
              }}
            >
              <Trash2 size={16} className="text-danger" />
            </button>
          )}
          <ChevronRight size={18} className="text-muted" />
        </div>
      </div>
    </div>
  );
};

export default ExamCard;
