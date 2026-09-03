import React, { useState, useEffect, useRef } from "react";
import {
  X,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  FileText,
  Sparkles,
  RotateCcw,
  CheckSquare,
} from "lucide-react";
import type { Exam, AuthUser } from "../../types";
import { extractSheet } from "../../api";

interface ExamCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    examData: Omit<Exam, "id" | "created_at">,
    examId?: string,
  ) => Promise<void>;
  currentUser: AuthUser | null;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  editingExam?: Exam | null;
}

export const ExamCreationModal: React.FC<ExamCreationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  addToast,
  editingExam,
}) => {
  // Form State - Exam Information
  const [examTitle, setExamTitle] = useState("");
  const [examType, setExamType] = useState<string>("Midterm");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [semester, setSemester] = useState("1st Semester");
  const [subject, setSubject] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [section, setSection] = useState("");
  const [program, setProgram] = useState("BSIT");
  const [instructorName, setInstructorName] = useState("");
  const [numItems, setNumItems] = useState<number>(50);
  const [passingScore, setPassingScore] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [examDate, setExamDate] = useState("");

  // Answer Key State
  const [answerKey, setAnswerKey] = useState<Record<string, string>>({});
  const [keyUploadLoading, setKeyUploadLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const keyScanInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = Boolean(editingExam);

  useEffect(() => {
    if (!isOpen) return;

    if (editingExam) {
      setExamTitle(editingExam.name ?? "");
      setExamType(editingExam.exam_type ?? "Midterm");
      setAcademicYear(editingExam.academic_year ?? "2025-2026");
      setSemester(editingExam.semester ?? "1st Semester");
      setSubject(editingExam.subject ?? "");
      setCourseCode(editingExam.course_code ?? "");
      setSection(editingExam.section ?? "");
      setProgram(editingExam.program ?? "BSIT");
      setInstructorName(
        editingExam.instructor_name ??
          currentUser?.name ??
          "Prof. Faculty Member",
      );
      setNumItems(editingExam.num_items ?? 50);
      setPassingScore(editingExam.passing_score?.toString() ?? "");
      setInstructions(editingExam.instructions ?? "");
      setExamDate(editingExam.exam_date ?? "");
      setAnswerKey(editingExam.answer_key ?? {});
      setErrors({});
      return;
    }

    setExamTitle("");
    setExamType("Midterm");
    setAcademicYear("2025-2026");
    setSemester("1st Semester");
    setSubject("");
    setCourseCode("");
    setSection("");
    setProgram("BSIT");
    setInstructorName(currentUser?.name ?? "Prof. Faculty Member");
    setNumItems(50);
    setPassingScore("");
    setInstructions("");
    setExamDate("");
    setAnswerKey({});
    setErrors({});
  }, [currentUser, editingExam, isOpen]);

  if (!isOpen) return null;

  // Validation handler
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!examTitle.trim()) errs.examTitle = "Exam Title is required.";
    if (!examType) errs.examType = "Exam Type is required.";
    if (!academicYear.trim()) errs.academicYear = "Academic Year is required.";
    if (!semester) errs.semester = "Semester is required.";
    if (!subject.trim()) errs.subject = "Course / Subject is required.";
    if (!courseCode.trim()) errs.courseCode = "Course Code is required.";
    if (!section.trim()) errs.section = "Section is required.";
    if (!program.trim()) errs.program = "Program/Department is required.";
    if (!instructorName.trim())
      errs.instructorName = "Instructor Name is required.";
    if (!numItems || numItems < 1 || numItems > 100) {
      errs.numItems = "Number of items must be between 1 and 100.";
    }

    const filteredKey = Object.fromEntries(
      Object.entries(answerKey).filter(([qNum]) => {
        const parsed = Number(qNum);
        return Number.isFinite(parsed) && parsed >= 1 && parsed <= numItems;
      }),
    );
    const configuredCount = Object.values(filteredKey).filter(Boolean).length;
    const extraEntries = Object.keys(answerKey).filter((qNum) => {
      const parsed = Number(qNum);
      return !Number.isFinite(parsed) || parsed < 1 || parsed > numItems;
    }).length;

    if (configuredCount === 0) {
      errs.answerKey = "Please configure an answer key with at least 1 item.";
    } else if (configuredCount !== numItems || extraEntries > 0) {
      errs.answerKey = `Answer key mismatch! Configured ${configuredCount} of ${numItems} items. Please set the official answer for each question in this exam.`;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Sheet Image Scan for Auto Key Extraction
  const handleKeySheetUpload = async (file: File) => {
    if (!file) return;
    setKeyUploadLoading(true);
    try {
      const res = await extractSheet(file);
      const extractedKey: Record<string, string> = {};
      Object.entries(res.answers).forEach(([q, val]) => {
        const qNum = parseInt(q, 10);
        if (qNum >= 1 && qNum <= numItems && val) {
          extractedKey[q] = val;
        }
      });
      setAnswerKey(extractedKey);
      addToast(
        "success",
        `Extracted ${Object.keys(extractedKey).length} answers from key sheet image!`,
      );
    } catch (err: any) {
      addToast(
        "error",
        err.message || "Failed to extract answer key from image.",
      );
    } finally {
      setKeyUploadLoading(false);
    }
  };

  // Quick Auto-Fill Demo Answer Key
  const handleAutoFillDemoKey = () => {
    const choices = ["A", "B", "C", "D", "E"];
    const demoKey: Record<string, string> = {};
    for (let i = 1; i <= numItems; i++) {
      demoKey[i.toString()] = choices[(i - 1) % 5];
    }
    setAnswerKey(demoKey);
    addToast("info", `Auto-filled demo answer key for ${numItems} items.`);
  };

  // Clear Answer Key
  const handleClearKey = () => {
    setAnswerKey({});
    addToast("info", "Answer key cleared.");
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast("error", "Please fix all validation errors before saving.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Trim answer key to specified numItems
      const trimmedKey: Record<string, string> = {};
      for (let i = 1; i <= numItems; i++) {
        const qStr = i.toString();
        if (answerKey[qStr]) {
          trimmedKey[qStr] = answerKey[qStr];
        }
      }

      const examPayload = {
        name: examTitle.trim(),
        exam_type: examType,
        academic_year: academicYear.trim(),
        semester: semester,
        subject: subject.trim(),
        course_code: courseCode.trim(),
        section: section.trim(),
        program: program.trim(),
        instructor_name: instructorName.trim(),
        num_items: Number(numItems),
        passing_score: passingScore ? Number(passingScore) : undefined,
        instructions: instructions.trim() || undefined,
        exam_date: examDate || undefined,
        answer_key: trimmedKey,
      };

      await onSave(examPayload, editingExam?.id);

      addToast(
        "success",
        `Examination "${examTitle}" ${isEditMode ? "updated" : "created"} successfully!`,
      );
      onClose();
    } catch (err: any) {
      addToast("error", err.message || "Failed to save examination.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const configuredCount = Object.values(answerKey).filter(Boolean).length;
  const isKeyComplete = configuredCount === numItems && numItems > 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1.5rem",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "960px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "18px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ffffff",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0062ff",
              }}
            >
              <BookOpen size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                Comprehensive Examination Setup
              </h2>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#64748b",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Define examination details and configure the official answer key
                before scanning.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn"
            style={{
              background: "#f8fafc",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "0.45rem",
              color: "#64748b",
              cursor: "pointer",
            }}
            onClick={onClose}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {/* SECTION 1: Examination Identity & Academic Context */}
            <div
              style={{
                background: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  marginBottom: "1rem",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <FileText size={18} color="#0062ff" /> 1. Examination Identity & Metadata
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "1rem",
                }}
              >
                {/* Exam Title */}
                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Exam Title <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Web Systems & Technologies Midterm Examination"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                  />
                  {errors.examTitle && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.examTitle}
                    </span>
                  )}
                </div>

                {/* Exam Type */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Exam Type <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                  >
                    <option value="Preliminary">Preliminary Examination</option>
                    <option value="Midterm">Midterm Examination</option>
                    <option value="Pre-Final">Pre-Final Examination</option>
                    <option value="Final">Final Examination</option>
                  </select>
                </div>

                {/* Number of Items */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Number of Items (1-100){" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    className="form-input"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={numItems}
                    onChange={(e) => {
                      const val = Math.max(
                        1,
                        Math.min(100, parseInt(e.target.value, 10) || 1),
                      );
                      setNumItems(val);
                      setAnswerKey((prev) =>
                        Object.fromEntries(
                          Object.entries(prev).filter(([qNum]) => {
                            const parsed = Number(qNum);
                            return (
                              Number.isFinite(parsed) &&
                              parsed >= 1 &&
                              parsed <= val
                            );
                          }),
                        ),
                      );
                    }}
                  />
                  {errors.numItems && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.numItems}
                    </span>
                  )}
                </div>

                {/* Course/Subject */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Course / Subject Title{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Web Systems and Technologies 1"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                  {errors.subject && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.subject}
                    </span>
                  )}
                </div>

                {/* Course Code */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Course Code <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ITP 305"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                  />
                  {errors.courseCode && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.courseCode}
                    </span>
                  )}
                </div>

                {/* Section */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Section <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. BSIT 3-A"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                  />
                  {errors.section && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.section}
                    </span>
                  )}
                </div>

                {/* Academic Year */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Academic Year{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. 2025-2026"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                  />
                  {errors.academicYear && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.academicYear}
                    </span>
                  )}
                </div>

                {/* Semester */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Semester <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Summer">Summer Term</option>
                  </select>
                </div>

                {/* Program/Department */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Program / Department{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. BSIT / College of Computing"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                  />
                  {errors.program && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.program}
                    </span>
                  )}
                </div>

                {/* Instructor Name */}
                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Instructor Name{" "}
                    <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Prof. Jenny Garcia"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                  />
                  {errors.instructorName && (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      {errors.instructorName}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* SECTION 2: Schedule & Optional Settings */}
            <div
              style={{
                background: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  fontSize: "1rem",
                  fontWeight: 800,
                  marginBottom: "1rem",
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Calendar size={18} color="#0062ff" /> 2. Exam Schedule & Administration
                Settings (Optional)
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "1rem",
                }}
              >
                {/* Examination Date */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Scheduled Exam Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>

                {/* Passing Score */}
                <div>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Passing Raw Score Benchmark
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={numItems}
                    className="form-input"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a" }}
                    placeholder={`e.g. ${Math.ceil(numItems * 0.5)}`}
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                  />
                </div>

                {/* Instructions */}
                <div style={{ gridColumn: "span 2" }}>
                  <label className="form-label" style={{ fontWeight: 700, color: "#0f172a" }}>
                    Exam Instructions for Students
                  </label>
                  <textarea
                    className="form-input"
                    rows={2}
                    placeholder="e.g. Use dark pencil or black pen. Shade the bubble completely. Erase neatly."
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#0f172a", resize: "vertical" }}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Answer Key Editor */}
            <div
              style={{
                background: "#f8fafc",
                padding: "1.25rem",
                borderRadius: "12px",
                border: errors.answerKey
                  ? "1px solid #ef4444"
                  : "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1rem",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: "1rem",
                      fontWeight: 800,
                      margin: 0,
                      color: "#0f172a",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <CheckSquare size={18} color="#0062ff" /> 3. Answer Key Editor ({numItems}{" "}
                    Items)
                  </h3>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "#64748b",
                      margin: "0.25rem 0 0 0",
                    }}
                  >
                    Click bubbles to set official answers or scan a completed
                    key sheet.
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      borderRadius: "8px",
                      background: isKeyComplete ? "#ecfdf5" : "#fffbeb",
                      color: isKeyComplete ? "#059669" : "#b45309",
                      border: isKeyComplete ? "1px solid #a7f3d0" : "1px solid #fde68a",
                    }}
                  >
                    {configuredCount} / {numItems} Configured
                  </span>

                  <input
                    type="file"
                    ref={keyScanInputRef}
                    style={{ display: "none" }}
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleKeySheetUpload(e.target.files[0]);
                      }
                      e.target.value = "";
                    }}
                  />

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => keyScanInputRef.current?.click()}
                    disabled={keyUploadLoading}
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.8rem",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                  >
                    <UploadCloud size={14} style={{ marginRight: "4px" }} />
                    {keyUploadLoading ? "Scanning..." : "Scan Key Image"}
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleAutoFillDemoKey}
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.8rem",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                  >
                    <Sparkles size={14} style={{ marginRight: "4px" }} />{" "}
                    Auto-Fill Demo
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleClearKey}
                    style={{
                      padding: "0.35rem 0.75rem",
                      fontSize: "0.8rem",
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      color: "#0f172a",
                      borderRadius: "8px",
                      fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={14} style={{ marginRight: "4px" }} /> Clear
                  </button>
                </div>
              </div>

              {errors.answerKey && (
                <div
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{errors.answerKey}</span>
                </div>
              )}

              {/* Dynamic Bubble Sheet Key Grid */}
              <div
                className="bubble-sheet-card"
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  maxHeight: "360px",
                  overflowY: "auto",
                  background: "#ffffff",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: numItems > 25 ? "1fr 1fr" : "1fr",
                    gap: "1.25rem",
                  }}
                >
                  {/* First Column */}
                  <div>
                    {Array.from(
                      {
                        length: Math.min(
                          numItems,
                          Math.ceil(numItems / (numItems > 25 ? 2 : 1)),
                        ),
                      },
                      (_, i) => i + 1,
                    ).map((qNum) => {
                      const qStr = qNum.toString();
                      return (
                        <div
                          key={qStr}
                          className="bubble-row"
                          style={{ padding: "0.3rem 0.5rem" }}
                        >
                          <span
                            className="bubble-num"
                            style={{ minWidth: "30px", color: "#0f172a", fontWeight: 700 }}
                          >
                            {qNum}.
                          </span>
                          <div className="bubble-options">
                            {["A", "B", "C", "D", "E"].map((opt) => {
                              const isActive = answerKey[qStr] === opt;
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    fontSize: "0.8rem",
                                    fontWeight: 700,
                                    borderRadius: "50%",
                                    border: isActive ? "1px solid #0062ff" : "1px solid #cbd5e1",
                                    background: isActive ? "#0062ff" : "#ffffff",
                                    color: isActive ? "#ffffff" : "#64748b",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    boxShadow: isActive ? "0 2px 5px rgba(0, 98, 255, 0.3)" : "none",
                                  }}
                                  onClick={() =>
                                    setAnswerKey((prev) => ({
                                      ...prev,
                                      [qStr]: prev[qStr] === opt ? "" : opt,
                                    }))
                                  }
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Second Column */}
                  {numItems > 25 && (
                    <div>
                      {Array.from(
                        { length: numItems - Math.ceil(numItems / 2) },
                        (_, i) => i + Math.ceil(numItems / 2) + 1,
                      ).map((qNum) => {
                        const qStr = qNum.toString();
                        return (
                          <div
                            key={qStr}
                            className="bubble-row"
                            style={{ padding: "0.3rem 0.5rem" }}
                          >
                            <span
                              className="bubble-num"
                              style={{ minWidth: "30px", color: "#0f172a", fontWeight: 700 }}
                            >
                              {qNum}.
                            </span>
                            <div className="bubble-options">
                              {["A", "B", "C", "D", "E"].map((opt) => {
                                const isActive = answerKey[qStr] === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      borderRadius: "50%",
                                      border: isActive ? "1px solid #0062ff" : "1px solid #cbd5e1",
                                      background: isActive ? "#0062ff" : "#ffffff",
                                      color: isActive ? "#ffffff" : "#64748b",
                                      cursor: "pointer",
                                      transition: "all 0.15s ease",
                                      boxShadow: isActive ? "0 2px 5px rgba(0, 98, 255, 0.3)" : "none",
                                    }}
                                    onClick={() =>
                                      setAnswerKey((prev) => ({
                                        ...prev,
                                        [qStr]: prev[qStr] === opt ? "" : opt,
                                      }))
                                    }
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "1rem",
              marginTop: "1.5rem",
              paddingTop: "1rem",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#475569",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{
                padding: "0.6rem 1.5rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "#0062ff",
                color: "#ffffff",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0, 98, 255, 0.25)",
              }}
            >
              <CheckCircle2 size={18} />
              {isSubmitting
                ? "Saving Examination..."
                : "Save Examination & Answer Key"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamCreationModal;
