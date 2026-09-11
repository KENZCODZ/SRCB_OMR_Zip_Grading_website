import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import type { StudentRosterEntry } from '../../types';
import { parseRosterFile } from '../../utils/excelUtils';

export interface RosterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (roster: StudentRosterEntry[]) => void;
}

export const RosterImportModal: React.FC<RosterImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [previewRoster, setPreviewRoster] = useState<StudentRosterEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const parsed = await parseRosterFile(file);
      if (parsed.length === 0) {
        setErrorMsg('No valid student roster records found. Make sure the file contains "Student ID" and "Student Name" columns.');
      } else {
        setPreviewRoster(parsed);
      }
    } catch (err: any) {
      setErrorMsg(`Failed to parse roster file: ${err.message || 'Invalid format'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = () => {
    onImportSuccess(previewRoster);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '700px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '1.15rem' }}>
            <FileSpreadsheet color="var(--primary, #28166f)" size={22} />
            Import Class Roster (.xlsx / .csv)
          </h3>
          <button
            className="btn"
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '0.4rem',
              color: '#64748b',
              cursor: 'pointer',
            }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".xlsx, .xls, .csv"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
            e.target.value = '';
          }}
        />

        <div
          className="dropzone"
          style={{
            padding: '2.5rem 1.5rem',
            marginBottom: '1.5rem',
            background: '#f8fafc',
            border: '2px dashed var(--primary-light-border, #ddd6fe)',
            borderRadius: '12px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
        >
          <UploadCloud size={44} color="var(--primary, #28166f)" style={{ marginBottom: '0.5rem' }} />
          <h4 style={{ margin: '0.5rem 0 0.25rem 0', color: '#0f172a', fontWeight: 800 }}>Click or drag a Class Roster file here</h4>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Supports Excel (.xlsx, .xls) or CSV files with headers: <strong>Student ID, Student Name, Course & Section</strong>
          </p>
        </div>

        {loading && (
          <div className="spinner-container" style={{ padding: '1rem', textAlign: 'center' }}>
            <div className="spinner"></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--primary, #28166f)', fontWeight: 700, marginTop: '0.5rem' }}>Parsing roster spreadsheet data...</p>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {previewRoster.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0f172a', fontWeight: 700 }}>
                Roster Preview ({previewRoster.length} students loaded)
              </h4>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={13} /> Ready to Match
              </span>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '1.5rem', background: '#ffffff' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', color: '#475569' }}>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Student ID</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Full Name</th>
                    <th style={{ padding: '0.6rem 0.8rem', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Course & Section</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRoster.slice(0, 10).map((r, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ fontWeight: 700, color: 'var(--primary, #28166f)', padding: '0.6rem 0.8rem' }}>{r.student_id}</td>
                      <td style={{ color: '#0f172a', padding: '0.6rem 0.8rem' }}>{r.name}</td>
                      <td style={{ color: '#64748b', padding: '0.6rem 0.8rem' }}>{r.course_section || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRoster.length > 10 && (
                <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: '#64748b', background: '#f8fafc' }}>
                  ...and {previewRoster.length - 10} more students
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 600,
                  borderRadius: '8px',
                }}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  background: 'var(--primary, #28166f)',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 2px 6px rgba(0,98,255,0.25)',
                }}
                onClick={handleConfirmImport}
              >
                Import & Apply Roster
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RosterImportModal;
