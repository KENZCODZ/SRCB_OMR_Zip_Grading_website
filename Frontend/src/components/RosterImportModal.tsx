import React, { useRef, useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, X } from 'lucide-react';
import type { StudentRosterEntry } from '../types';
import { parseRosterFile } from '../utils/excelUtils';

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
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1.5rem'
      }}
    >
      <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet className="text-primary" size={20} />
            Import Class Roster (.xlsx / .csv)
          </h3>
          <button className="btn btn-secondary btn-icon-only" onClick={onClose}>
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
          style={{ padding: '2rem 1rem', marginBottom: '1.5rem' }}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
        >
          <UploadCloud size={40} className="dropzone-icon" />
          <h4 style={{ margin: '0.5rem 0 0.25rem 0' }}>Click or drag a Class Roster file here</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Supports Excel (.xlsx, .xls) or CSV files with headers: <strong>Student ID, Student Name, Course & Section</strong>
          </p>
        </div>

        {loading && (
          <div className="spinner-container" style={{ padding: '1rem' }}>
            <div className="spinner"></div>
            <p style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '0.5rem' }}>Parsing roster spreadsheet data...</p>
          </div>
        )}

        {errorMsg && (
          <div className="toast toast-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {previewRoster.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                Roster Preview ({previewRoster.length} students loaded)
              </h4>
              <span className="badge badge-success flex-align-center">
                <CheckCircle2 size={13} style={{ marginRight: 4 }} /> Ready to Match
              </span>
            </div>

            <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
              <table className="custom-table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Course & Section</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRoster.slice(0, 10).map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>{r.student_id}</td>
                      <td>{r.name}</td>
                      <td>{r.course_section || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewRoster.length > 10 && (
                <div style={{ padding: '0.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  ...and {previewRoster.length - 10} more students
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleConfirmImport}>
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
