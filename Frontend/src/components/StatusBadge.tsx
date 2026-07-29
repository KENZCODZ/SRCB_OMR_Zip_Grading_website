import React from 'react';
import { AlertTriangle, HelpCircle, Award, XCircle } from 'lucide-react';

export interface StatusBadgeProps {
  score?: number;
  totalQuestions?: number;
  isAmbiguous?: boolean;
  isEmpty?: boolean;
  customText?: string;
  variant?: 'score' | 'pass' | 'fail' | 'warning' | 'info';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  score,
  totalQuestions = 50,
  isAmbiguous = false,
  isEmpty = false,
  customText,
  variant
}) => {
  if (customText) {
    const badgeClass = variant ? `badge badge-${variant}` : 'badge badge-info';
    return <span className={badgeClass}>{customText}</span>;
  }

  if (isAmbiguous) {
    return (
      <span className="badge badge-warning flex-align-center">
        <AlertTriangle size={13} style={{ marginRight: 4 }} />
        Ambiguous Mark
      </span>
    );
  }

  if (isEmpty) {
    return (
      <span className="badge badge-secondary flex-align-center">
        <HelpCircle size={13} style={{ marginRight: 4 }} />
        Unanswered
      </span>
    );
  }

  if (score !== undefined) {
    const percentage = Math.round((score / totalQuestions) * 100);
    const isPassing = percentage >= 75;

    return (
      <span className={`badge ${isPassing ? 'badge-success' : 'badge-danger'} flex-align-center`}>
        {isPassing ? (
          <Award size={13} style={{ marginRight: 4 }} />
        ) : (
          <XCircle size={13} style={{ marginRight: 4 }} />
        )}
        {score} / {totalQuestions} ({percentage}%)
      </span>
    );
  }

  return <span className="badge badge-info">Standard</span>;
};

export default StatusBadge;
