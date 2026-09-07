import React from 'react';
import { BarChart2, Download, CheckCircle2, HelpCircle, FileSpreadsheet } from 'lucide-react';
import type { Submission } from '../../types';
import { calculateItemAnalysis, exportItemAnalysisExcel } from '../../utils/excelUtils';

export interface ItemAnalysisTableProps {
  examName: string;
  answerKey: Record<string, string>;
  submissions: Submission[];
}

export const ItemAnalysisTable: React.FC<ItemAnalysisTableProps> = ({
  examName,
  answerKey,
  submissions,
}) => {
  const analysisData = calculateItemAnalysis(answerKey, submissions);

  if (analysisData.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
        }}
      >
        <BarChart2 size={36} style={{ color: '#94a3b8', marginBottom: '0.75rem' }} />
        <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          No Submissions Available for Item Analysis
        </h4>
        <p style={{ margin: '0.4rem 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
          Scan or upload student bubble sheets for this examination to calculate psychometric metrics.
        </p>
      </div>
    );
  }

  const handleExport = () => {
    exportItemAnalysisExcel(examName, answerKey, submissions);
  };

  // Calculate summary metrics
  const totalItems = analysisData.length;
  const goodDiscriminationCount = analysisData.filter(
    (d) => d.discrimination_category === 'Very Good' || d.discrimination_category === 'Reasonable'
  ).length;
  const avgDifficulty = (
    analysisData.reduce((acc, curr) => acc + curr.difficulty_index, 0) / totalItems
  ).toFixed(2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Metric Summary Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'var(--primary-light-surface, #f5f3ff)',
              color: 'var(--primary, #28166f)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Evaluated Items
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {totalItems} Questions
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              High Discrimination (D ≥ 0.30)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#059669' }}>
              {Math.round((goodDiscriminationCount / totalItems) * 100)}% ({goodDiscriminationCount}/{totalItems})
            </div>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.85rem',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#f8fafc',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <HelpCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Mean Difficulty Index (P)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              {avgDifficulty} (Balanced)
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FileSpreadsheet size={18} style={{ color: 'var(--primary, #28166f)' }} />
              Item Psychometric Diagnostics
            </h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              CHED & OBE Difficulty (P) and Discrimination (D) values across {submissions.length} scanned answer sheets.
            </p>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExport}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              color: '#0f172a',
            }}
          >
            <Download size={14} />
            Export (.xlsx)
          </button>
        </div>

        <div style={{ maxHeight: '460px', overflowY: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              textAlign: 'left',
            }}
          >
            <thead
              style={{
                position: 'sticky',
                top: 0,
                background: '#f8fafc',
                zIndex: 2,
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <tr>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Item #</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Key</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Correct Responses</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Difficulty (P)</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>P-Rating</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>Discrimination (D)</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700 }}>D-Rating</th>
                <th style={{ padding: '0.75rem 1rem', color: '#475569', fontWeight: 700, textAlign: 'center' }}>
                  Distractor Breakdown (A / B / C / D / E / Blank)
                </th>
              </tr>
            </thead>
            <tbody>
              {analysisData.map((row, index) => {
                const isEasy = row.difficulty_category === 'Easy';
                const isModerate = row.difficulty_category === 'Moderate';

                const pBadgeStyle = isEasy
                  ? { background: 'var(--primary-light-surface, #f5f3ff)', color: '#2563eb', border: '1px solid var(--primary-light-border, #ddd6fe)' }
                  : isModerate
                    ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                    : { background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };

                const isGoodDisc =
                  row.discrimination_category === 'Very Good' || row.discrimination_category === 'Reasonable';
                const isMarginal = row.discrimination_category === 'Marginal';

                const dBadgeStyle = isGoodDisc
                  ? { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' }
                  : isMarginal
                    ? { background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a' }
                    : { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };

                return (
                  <tr
                    key={row.question_number}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fbff',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: '#0f172a' }}>
                      Q{row.question_number}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 800, color: 'var(--primary, #28166f)' }}>
                      {row.correct_answer}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', color: '#334155' }}>
                      <strong>{row.correct_count}</strong> / {row.total_responses}
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {row.difficulty_index.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span
                        style={{
                          ...pBadgeStyle,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {row.difficulty_category}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                      {row.discrimination_index.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.65rem 1rem' }}>
                      <span
                        style={{
                          ...dBadgeStyle,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {row.discrimination_category}
                      </span>
                    </td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.75rem',
                          background: '#f1f5f9',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                          const count = row.distractor_counts[opt as 'A' | 'B' | 'C' | 'D' | 'E'] || 0;
                          const isKey = row.correct_answer === opt;
                          return (
                            <span
                              key={opt}
                              style={{
                                color: isKey ? '#059669' : '#475569',
                                fontWeight: isKey ? 800 : 500,
                              }}
                            >
                              {opt}: {count}
                            </span>
                          );
                        })}
                        <span style={{ color: '#94a3b8' }}>|</span>
                        <span style={{ color: '#64748b' }}>
                          Blank: {row.distractor_counts.empty || 0}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemAnalysisTable;
