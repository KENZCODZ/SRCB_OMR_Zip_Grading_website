import React from 'react';
import { BarChart2, Download } from 'lucide-react';
import type { Submission } from '../types';
import { calculateItemAnalysis, exportItemAnalysisExcel } from '../utils/excelUtils';

export interface ItemAnalysisTableProps {
  examName: string;
  answerKey: Record<string, string>;
  submissions: Submission[];
}

export const ItemAnalysisTable: React.FC<ItemAnalysisTableProps> = ({
  examName,
  answerKey,
  submissions
}) => {
  const analysisData = calculateItemAnalysis(answerKey, submissions);

  if (analysisData.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
        No submission data available to compute Item Analysis for this exam yet.
      </div>
    );
  }

  const handleExport = () => {
    exportItemAnalysisExcel(examName, answerKey, submissions);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 className="text-primary" size={18} />
            OBE Item Analysis & Quality Assurance
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Calculates Question Difficulty Index (P) and Discrimination Index (D) across {submissions.length} scanned submissions.
          </p>
        </div>

        <button className="btn btn-secondary btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Download size={14} />
          Export Item Analysis (.xlsx)
        </button>
      </div>

      <div className="table-responsive" style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <table className="custom-table" style={{ fontSize: '0.82rem' }}>
          <thead>
            <tr>
              <th>Item #</th>
              <th>Key</th>
              <th>Correct</th>
              <th>Difficulty (P)</th>
              <th>Evaluation</th>
              <th>Discrimination (D)</th>
              <th>Quality</th>
              <th style={{ textAlign: 'center' }}>Option Breakdown (A / B / C / D / E / Empty)</th>
            </tr>
          </thead>
          <tbody>
            {analysisData.map(row => {
              const diffBadgeClass = row.difficulty_category === 'Easy'
                ? 'badge-info'
                : row.difficulty_category === 'Moderate'
                  ? 'badge-success'
                  : 'badge-warning';

              const discBadgeClass = row.discrimination_category === 'Very Good' || row.discrimination_category === 'Reasonable'
                ? 'badge-success'
                : row.discrimination_category === 'Marginal'
                  ? 'badge-warning'
                  : 'badge-danger';

              return (
                <tr key={row.question_number} className="table-row-hover">
                  <td style={{ fontWeight: 700 }}>Q{row.question_number}</td>
                  <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{row.correct_answer}</td>
                  <td>{row.correct_count} / {row.total_responses}</td>
                  <td style={{ fontWeight: 600 }}>{row.difficulty_index}</td>
                  <td>
                    <span className={`badge ${diffBadgeClass}`}>
                      {row.difficulty_category}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{row.discrimination_index}</td>
                  <td>
                    <span className={`badge ${discBadgeClass}`}>
                      {row.discrimination_category}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px', fontSize: '0.75rem' }}>
                      <span style={{ color: row.correct_answer === 'A' ? 'var(--success)' : 'inherit' }}>A: {row.distractor_counts.A}</span>|
                      <span style={{ color: row.correct_answer === 'B' ? 'var(--success)' : 'inherit' }}>B: {row.distractor_counts.B}</span>|
                      <span style={{ color: row.correct_answer === 'C' ? 'var(--success)' : 'inherit' }}>C: {row.distractor_counts.C}</span>|
                      <span style={{ color: row.correct_answer === 'D' ? 'var(--success)' : 'inherit' }}>D: {row.distractor_counts.D}</span>|
                      <span style={{ color: row.correct_answer === 'E' ? 'var(--success)' : 'inherit' }}>E: {row.distractor_counts.E}</span>|
                      <span style={{ color: 'var(--text-muted)' }}>Blank: {row.distractor_counts.empty}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemAnalysisTable;
