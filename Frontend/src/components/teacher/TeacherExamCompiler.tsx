import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Eye,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  Send,
  Database,
  Users,
} from "lucide-react";
import type { Exam, Submission, StudentRosterEntry, AuthUser } from "../../types";
import {
  calculateTransmutedGrade,
  exportExamBatchExcel,
  exportCHEDGradeSheet,
  exportCompleteDatabaseExcel,
} from "../../utils/excelUtils";

export interface TeacherExamCompilerProps {
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  currentUser?: AuthUser | null;
  onSelectSubmission?: (submission: Submission) => void;
  onInspectExam?: (exam: Exam) => void;
  addToast?: (type: any, message: string) => void;
  formatDate: (iso: string) => string;
}

export const TeacherExamCompiler: React.FC<TeacherExamCompilerProps> = ({
  exams,
  submissions,
  roster,
  currentUser: _currentUser,
  onSelectSubmission,
  onInspectExam,
  addToast,
  formatDate,
}) => {
  // Filters State (Results & Reports)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("All");
  const [selectedSemester, setSelectedSemester] = useState<string>("All");
  const [selectedExamType, setSelectedExamType] = useState<string>("All");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [sentSubmissionIds, setSentSubmissionIds] = useState<Set<string>>(new Set());

  // Individual Student Grade Delivery Function
  const handleSendSingleGrade = (sub: Submission, student?: StudentRosterEntry, exam?: Exam) => {
    const studentName = student ? student.name : `Student ID ${sub.student_id}`;
    setSentSubmissionIds((prev) => new Set(prev).add(sub.id));
    if (addToast) {
      addToast("success", `Official grade report sent to ${studentName} (${sub.student_id}) for "${exam?.name || "Exam"}".`);
    }
  };

  // Batch Grade Delivery to All Students in Exam
  const handleSendAllInGroup = (exam: Exam, groupSubs: Submission[]) => {
    if (groupSubs.length === 0) return;
    const isAllSent = groupSubs.every((s) => sentSubmissionIds.has(s.id));
    if (isAllSent) {
      if (addToast) {
        addToast("info", `All student grade reports for "${exam.name}" have already been sent.`);
      }
      return;
    }
    setSentSubmissionIds((prev) => {
      const next = new Set(prev);
      groupSubs.forEach((s) => next.add(s.id));
      return next;
    });
    if (addToast) {
      addToast("success", `Batch grade reports delivered to all ${groupSubs.length} students in "${exam.name}".`);
    }
  };

  // Helper map for Student Roster lookup
  const rosterMap = useMemo(() => {
    const map = new Map<string, StudentRosterEntry>();
    roster.forEach((r) => map.set(r.student_id.toLowerCase(), r));
    return map;
  }, [roster]);

  // Extract unique filter options from exams
  const academicYears = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.academic_year) set.add(e.academic_year);
    });
    return ["All", ...Array.from(set).sort()];
  }, [exams]);

  const semesters = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.semester) set.add(e.semester);
    });
    return ["All", ...Array.from(set).sort()];
  }, [exams]);

  const examTypes = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.exam_type) set.add(e.exam_type);
    });
    return ["All", ...Array.from(set).sort()];
  }, [exams]);

  const sections = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.section) set.add(e.section);
    });
    return ["All", ...Array.from(set).sort()];
  }, [exams]);

  // Filter exams based on session and class criteria
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (
        selectedAcademicYear !== "All" &&
        exam.academic_year !== selectedAcademicYear
      ) {
        return false;
      }
      if (selectedSemester !== "All" && exam.semester !== selectedSemester) {
        return false;
      }
      if (selectedExamType !== "All" && exam.exam_type !== selectedExamType) {
        return false;
      }
      if (selectedSection !== "All" && exam.section !== selectedSection) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = exam.name.toLowerCase().includes(q);
        const matchesSubject = (exam.subject || "").toLowerCase().includes(q);
        const matchesCode = (exam.course_code || "").toLowerCase().includes(q);
        const matchesSection = (exam.section || "").toLowerCase().includes(q);
        const matchesInstructor = (exam.instructor_name || "")
          .toLowerCase()
          .includes(q);
        if (
          !matchesName &&
          !matchesSubject &&
          !matchesCode &&
          !matchesSection &&
          !matchesInstructor
        ) {
          return false;
        }
      }
      return true;
    });
  }, [
    exams,
    selectedAcademicYear,
    selectedSemester,
    selectedExamType,
    selectedSection,
    searchQuery,
  ]);

  // Group submissions by exam_id (respecting actual configured item count)
  const compiledExamGroups = useMemo(() => {
    return filteredExams.map((exam) => {
      const examSubs = submissions.filter((s) => s.exam_id === exam.id);
      const totalItems =
        exam.num_items || Object.keys(exam.answer_key || {}).length || 50;
      const totalScanned = examSubs.length;

      const totalScore = examSubs.reduce((acc, curr) => acc + curr.score, 0);
      const meanScore =
        totalScanned > 0 ? Number((totalScore / totalScanned).toFixed(2)) : 0;
      const avgPercentage =
        totalScanned > 0 && totalItems > 0
          ? Math.round(50 + (meanScore / totalItems) * 50)
          : 0;

      const passedCount = examSubs.filter((s) => {
        const trans = calculateTransmutedGrade(s.score, totalItems);
        return trans.status === "Passed";
      }).length;

      const passRate =
        totalScanned > 0 ? Math.round((passedCount / totalScanned) * 100) : 0;

      // Count submissions with ambiguous marks
      const flaggedCount = examSubs.filter((s) => {
        if (!s.answers) return false;
        return Object.values(s.answers).some((ans) => ans?.is_ambiguous);
      }).length;

      return {
        exam,
        submissions: examSubs,
        totalItems,
        totalScanned,
        meanScore,
        avgPercentage,
        passedCount,
        passRate,
        flaggedCount,
      };
    });
  }, [filteredExams, submissions]);


  // Export Batch Excel Handler (Specific Exam)
  const handleExportBatch = (exam: Exam, subs: Submission[]) => {
    try {
      exportExamBatchExcel(exam, subs, roster);
      if (addToast) {
        addToast(
          "success",
          `Exported compiled batch report for "${exam.name}" successfully!`,
        );
      }
    } catch (err: any) {
      if (addToast) {
        addToast(
          "error",
          err.message || "Failed to export batch report.",
        );
      }
    }
  };

  // Export CHED Grade Sheet Handler
  const handleExportCHED = (exam: Exam, subs: Submission[]) => {
    try {
      exportCHEDGradeSheet(exam.name, subs, roster, exam);
      if (addToast) {
        addToast(
          "success",
          `Exported CHED grade sheet for "${exam.name}" successfully!`,
        );
      }
    } catch (err: any) {
      if (addToast) {
        addToast("error", err.message || "Failed to export CHED grade sheet.");
      }
    }
  };

  // Export All Examination Files
  const handleExportAllExams = () => {
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster, {
        examTypeFilter: selectedExamType === "All" ? undefined : selectedExamType,
        semesterFilter: selectedSemester === "All" ? undefined : selectedSemester,
      });
      if (addToast) {
        addToast("success", "Exported all examination result records to Excel successfully!");
      }
    } catch (err: any) {
      if (addToast) {
        addToast("error", err.message || "Failed to export all examination files.");
      }
    }
  };

  // Copy Formatted Class Grades Summary to Clipboard
  const handleCopyClassSummary = (
    exam: Exam,
    subs: Submission[],
    totalItems: number,
  ) => {
    if (subs.length === 0) {
      if (addToast) addToast("info", "No student records to copy.");
      return;
    }

    let summaryText = `====================================================\n`;
    summaryText += `ST. RITA'S COLLEGE OF BALINGASAG - GRADE DISTRIBUTION\n`;
    summaryText += `Exam: ${exam.name}\n`;
    summaryText += `Session: ${exam.academic_year || "2025-2026"} ${exam.semester || "1st Sem"} | ${exam.exam_type || "Midterm"}\n`;
    summaryText += `Class: ${exam.course_code || "N/A"} - ${exam.section || "N/A"} (${exam.subject || "N/A"})\n`;
    summaryText += `Instructor: ${exam.instructor_name || "Faculty Member"}\n`;
    summaryText += `Date Generated: ${new Date().toLocaleString()}\n`;
    summaryText += `====================================================\n\n`;
    summaryText += `STUDENT ID\tSTUDENT NAME\tRAW SCORE\tPERCENT\tGRADE\tREMARKS\n`;

    subs.forEach((sub) => {
      const matched = rosterMap.get((sub.student_id || "").toLowerCase());
      const studentName = matched ? matched.name : "N/A";
      const trans = calculateTransmutedGrade(sub.score, totalItems);
      summaryText += `${sub.student_id}\t${studentName}\t${sub.score}/${totalItems}\t${trans.percentage}%\t${trans.grade}\t${trans.status}\n`;
    });

    navigator.clipboard.writeText(summaryText);
    if (addToast) {
      addToast(
        "success",
        `Copied compiled grade summary for "${exam.section || exam.name}" to clipboard!`,
      );
    }
  };

  const toggleExpandGroup = (examId: string) => {
    setExpandedExamId((prev) => (prev === examId ? null : examId));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Filter & Global Export Actions Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--primary-light-surface, #f5f3ff)",
                color: "var(--primary, #28166f)",
                border: "1px solid var(--primary-light-border, #ddd6fe)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Filter size={17} />
            </div>
            <div>
              <h3
                style={{
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.01em",
                }}
              >
                Gradebook Filters
              </h3>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b", fontWeight: 500 }}>
                Filter classes by academic session, term, exam type, and section
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              flexWrap: "wrap",
              flex: "1 1 360px",
              justifyContent: "flex-end",
            }}
          >
            <div
              style={{
                position: "relative",
                minWidth: "250px",
                flex: "1 1 250px",
              }}
            >
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#64748b",
                }}
              />
              <input
                type="text"
                placeholder="Search subject, course code, section, or student..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  height: "38px",
                  paddingLeft: "36px",
                  paddingRight: "12px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  color: "#0f172a",
                  outline: "none",
                  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
              />
            </div>

            {/* Export All Examination Database Option */}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleExportAllExams}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: 700,
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#059669",
                borderRadius: "8px",
                padding: "0.45rem 0.95rem",
                fontSize: "0.82rem",
                height: "38px",
                flexShrink: 0,
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
              }}
              title="Export all examination result records to a single multi-sheet Excel file"
            >
              <Database size={15} /> Export All Database (.xlsx)
            </button>
          </div>
        </div>

        {/* Elegant Academic Select Dropdowns Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: "0.85rem",
          }}
        >
          {/* Academic Year Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "#334155",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Academic Year
            </label>
            <div className="academic-select-wrapper">
              <select
                className="academic-select"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
              >
                {academicYears.map((ay) => (
                  <option key={ay} value={ay}>
                    {ay === "All" ? "All Academic Years" : `AY ${ay}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>

          {/* Semester Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "#334155",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Semester / Term
            </label>
            <div className="academic-select-wrapper">
              <select
                className="academic-select"
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
              >
                {semesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem === "All" ? "All Semesters" : sem}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>

          {/* Exam Type Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "#334155",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Exam Period
            </label>
            <div className="academic-select-wrapper">
              <select
                className="academic-select"
                value={selectedExamType}
                onChange={(e) => setSelectedExamType(e.target.value)}
              >
                {examTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "All" ? "All Exam Periods" : type}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>

          {/* Section Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "#334155",
                fontWeight: 700,
                display: "block",
                marginBottom: "4px",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              Class Section
            </label>
            <div className="academic-select-wrapper">
              <select
                className="academic-select"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                {sections.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec === "All" ? "All Sections" : `Sec: ${sec}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="academic-select-arrow" />
            </div>
          </div>
        </div>
      </div>

      {/* Compiled Examination Groups List */}
          {compiledExamGroups.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem 1.5rem",
                background: "#ffffff",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
              }}
            >
              <BookOpen
                size={42}
                style={{ color: "#94a3b8", marginBottom: "1rem" }}
              />
              <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem", color: "#0f172a" }}>
                No Examination Sessions Match Filter
              </h3>
              <p
                style={{
                  color: "#64748b",
                  fontSize: "0.88rem",
                  maxWidth: "480px",
                  margin: "0 auto",
                }}
              >
                Try clearing search terms or selecting different Academic Year,
                Semester, or Class Section options.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {compiledExamGroups.map((group) => {
                const {
                  exam,
                  submissions: groupSubs,
                  totalItems,
                  totalScanned,
                  meanScore,
                  avgPercentage,
                  passRate,
                  flaggedCount,
                } = group;

                const isExpanded = expandedExamId === exam.id;
                const isAllSent =
                  groupSubs.length > 0 &&
                  groupSubs.every((s) => sentSubmissionIds.has(s.id));

                return (
                  <div
                    key={exam.id}
                    style={{
                      background: "#ffffff",
                      borderRadius: "16px",
                      border: isExpanded ? "2px solid var(--primary, #28166f)" : "1px solid #e2e8f0",
                      overflow: "hidden",
                      boxShadow: isExpanded
                        ? "0 4px 14px rgba(0, 98, 255, 0.08)"
                        : "0 2px 6px rgba(0, 0, 0, 0.02)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* 1. Card Top Section: Exam Header & Action Controls */}
                    <div
                      style={{
                        padding: "1.25rem 1.5rem",
                        background: "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "1rem",
                          flex: "1 1 380px",
                        }}
                      >
                        <div
                          style={{
                            width: "42px",
                            height: "42px",
                            borderRadius: "10px",
                            background: "var(--primary-light-surface, #f5f3ff)",
                            color: "var(--primary, #28166f)",
                            border: "1px solid var(--primary-light-border, #ddd6fe)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            marginTop: "2px",
                          }}
                        >
                          <BookOpen size={20} />
                        </div>

                        <div>
                          {/* Session Badges */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              className="badge"
                              style={{
                                background: "var(--primary-light-surface, #f5f3ff)",
                                color: "var(--primary, #28166f)",
                                border: "1px solid var(--primary-light-border, #ddd6fe)",
                                fontSize: "0.72rem",
                                fontWeight: 700,
                              }}
                            >
                              {exam.exam_type || "Midterm"}
                            </span>

                            {exam.course_code && (
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: 800,
                                  color: "var(--primary, #28166f)",
                                }}
                              >
                                [{exam.course_code}]
                              </span>
                            )}

                            {exam.section && (
                              <span
                                className="badge"
                                style={{
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  border: "1px solid #a7f3d0",
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                }}
                              >
                                Section: {exam.section}
                              </span>
                            )}

                            {exam.academic_year && (
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#64748b",
                                  fontWeight: 600,
                                }}
                              >
                                AY {exam.academic_year} ({exam.semester || "1st Sem"})
                              </span>
                            )}
                          </div>

                          {/* Examination Title */}
                          <h3
                            style={{
                              fontSize: "1.15rem",
                              fontWeight: 800,
                              margin: "0 0 4px 0",
                              color: "#0f172a",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {exam.name}
                          </h3>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.85rem",
                              fontSize: "0.78rem",
                              color: "#64748b",
                              flexWrap: "wrap",
                              fontWeight: 500,
                            }}
                          >
                            <span>Subject: <strong style={{ color: "#334155" }}>{exam.subject || "N/A"}</strong></span>
                            <span>• Program: <strong style={{ color: "#334155" }}>{exam.program || "BSIT"}</strong></span>
                            <span>• Instructor: <strong style={{ color: "#334155" }}>{exam.instructor_name || "Faculty Member"}</strong></span>
                            <span style={{ fontWeight: 700, color: "var(--primary, #28166f)" }}>• {totalItems} Test Items</span>
                            {exam.exam_date && (
                              <span>• Date: {exam.exam_date}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Top Right Action Buttons: Only Inspect and Class Roster toggle */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        {onInspectExam && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onInspectExam(exam)}
                            title="Inspect Answer Key & Exam Details"
                            style={{
                              fontSize: "0.8rem",
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              color: "#0f172a",
                              borderRadius: "8px",
                              fontWeight: 600,
                              height: "36px",
                            }}
                          >
                            <Eye size={14} style={{ marginRight: "4px" }} /> Inspect
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => toggleExpandGroup(exam.id)}
                          style={{
                            fontSize: "0.8rem",
                            borderRadius: "8px",
                            fontWeight: 700,
                            height: "36px",
                            background: isExpanded ? "var(--primary-light-surface, #f5f3ff)" : "#ffffff",
                            color: isExpanded ? "var(--primary, #28166f)" : "#334155",
                            border: isExpanded ? "1px solid var(--primary-light-border, #ddd6fe)" : "1px solid #e2e8f0",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                          title={isExpanded ? "Collapse Student Roster" : "Expand Student Roster"}
                        >
                          <Users size={14} />
                          <span>{isExpanded ? "Hide Roster" : `Class Roster (${totalScanned})`}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* 2. Card Middle Section: Key Performance & Analytics Strip */}
                    <div
                      style={{
                        padding: "0.9rem 1.5rem",
                        background: isExpanded ? "#f5f9ff" : "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "0.85rem",
                        cursor: "pointer",
                      }}
                      onClick={() => toggleExpandGroup(exam.id)}
                    >
                      {/* Metric 1: Total Scanned */}
                      <div
                        style={{
                          background: "#ffffff",
                          borderRadius: "10px",
                          padding: "0.65rem 0.95rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                          }}
                        >
                          Total Scanned
                        </div>
                        <div
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: "#0f172a",
                            marginTop: "2px",
                          }}
                        >
                          {totalScanned} Students
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "1px" }}>
                          Cohort submissions
                        </div>
                      </div>

                      {/* Metric 2: Mean Score */}
                      <div
                        style={{
                          background: "#ffffff",
                          borderRadius: "10px",
                          padding: "0.65rem 0.95rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                          }}
                        >
                          Class Mean Score
                        </div>
                        <div
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: "var(--primary, #28166f)",
                            marginTop: "2px",
                          }}
                        >
                          {meanScore} / {totalItems}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginTop: "1px" }}>
                          {avgPercentage}% cohort average
                        </div>
                      </div>

                      {/* Metric 3: Pass Rate */}
                      <div
                        style={{
                          background: "#ffffff",
                          borderRadius: "10px",
                          padding: "0.65rem 0.95rem",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                          }}
                        >
                          Pass Rate
                        </div>
                        <div
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: passRate >= 75 ? "#059669" : "#ef4444",
                            marginTop: "2px",
                          }}
                        >
                          {passRate}%
                        </div>
                        <div style={{ fontSize: "0.72rem", color: passRate >= 75 ? "#059669" : "#ef4444", fontWeight: 600, marginTop: "1px" }}>
                          {passRate >= 75 ? "Target benchmark met" : "Below 75% threshold"}
                        </div>
                      </div>

                      {/* Metric 4: Quality & Integrity Control */}
                      <div
                        style={{
                          background: flaggedCount > 0 ? "#fff5f5" : "#ffffff",
                          borderRadius: "10px",
                          padding: "0.65rem 0.95rem",
                          border: flaggedCount > 0 ? "1px solid #fecaca" : "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: flaggedCount > 0 ? "#dc2626" : "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                          }}
                        >
                          Quality Control
                        </div>
                        <div
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: 800,
                            color: flaggedCount > 0 ? "#dc2626" : "#059669",
                            marginTop: "2px",
                          }}
                        >
                          {flaggedCount > 0 ? `⚠ ${flaggedCount} Flagged` : "✓ 100% Clear"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: flaggedCount > 0 ? "#dc2626" : "#64748b", marginTop: "1px" }}>
                          {flaggedCount > 0 ? "Ambiguity needs review" : "Zero mark ambiguity"}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Student Examination Records Table (Review Compilation) */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "1.5rem 1.75rem",
                          borderTop: "1px solid #e2e8f0",
                          background: "#ffffff",
                        }}
                      >
                        {/* Header & Actions matching design principle */}
                        <div style={{ marginBottom: "1.25rem" }}>
                          <h3
                            style={{
                              fontSize: "1.3rem",
                              fontWeight: 800,
                              color: "#0f172a",
                              margin: "0 0 6px 0",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            Graded Student Answer Sheets
                          </h3>
                          <p
                            style={{
                              fontSize: "0.88rem",
                              color: "#64748b",
                              margin: "0 0 1.1rem 0",
                            }}
                          >
                            Complete list of student submissions recorded for {exam.name}
                          </p>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.75rem",
                              flexWrap: "wrap",
                            }}
                          >
                            {/* Download Excel Roster Button */}
                            <button
                              type="button"
                              onClick={() => handleExportBatch(exam, groupSubs)}
                              disabled={groupSubs.length === 0}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "0.55rem 1rem",
                                background: "#ffffff",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                color: "#0f172a",
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                cursor: groupSubs.length === 0 ? "not-allowed" : "pointer",
                                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
                                transition: "all 0.15s ease",
                              }}
                              title="Download complete class roster in Excel (.xlsx)"
                            >
                              <FileSpreadsheet size={16} style={{ color: "#10b981" }} />
                              <span>Download Excel Roster</span>
                            </button>

                            {/* Batch Deliver Grade Reports */}
                            <button
                              type="button"
                              onClick={() => handleSendAllInGroup(exam, groupSubs)}
                              disabled={groupSubs.length === 0 || isAllSent}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0.55rem 0.95rem",
                                background: isAllSent
                                  ? "#ecfdf5"
                                  : "var(--primary-light-surface, #f5f3ff)",
                                border: isAllSent
                                  ? "1px solid #a7f3d0"
                                  : "1px solid var(--primary-light-border, #ddd6fe)",
                                borderRadius: "8px",
                                color: isAllSent ? "#059669" : "var(--primary, #28166f)",
                                fontSize: "0.82rem",
                                fontWeight: 700,
                                cursor:
                                  groupSubs.length === 0 || isAllSent
                                    ? "not-allowed"
                                    : "pointer",
                                opacity: isAllSent ? 0.95 : 1,
                                transition: "all 0.15s ease",
                              }}
                              title={
                                isAllSent
                                  ? `Official grade reports have already been sent to all ${groupSubs.length} students.`
                                  : "Deliver official grade report cards to all students in this class"
                              }
                            >
                              {isAllSent ? (
                                <>
                                  <CheckCircle2 size={14} />
                                  <span>All Grades Sent ({groupSubs.length})</span>
                                </>
                              ) : (
                                <>
                                  <Send size={14} />
                                  <span>Send All ({groupSubs.length})</span>
                                </>
                              )}
                            </button>

                            {/* Copy Summary */}
                            <button
                              type="button"
                              onClick={() => handleCopyClassSummary(exam, groupSubs, totalItems)}
                              disabled={groupSubs.length === 0}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0.55rem 0.95rem",
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                color: "#475569",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: groupSubs.length === 0 ? "not-allowed" : "pointer",
                              }}
                              title="Copy text summary to clipboard"
                            >
                              <Copy size={14} />
                              <span>Copy Summary</span>
                            </button>

                            {/* CHED Grade Sheet */}
                            <button
                              type="button"
                              onClick={() => handleExportCHED(exam, groupSubs)}
                              disabled={groupSubs.length === 0}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0.55rem 0.95rem",
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                color: "#475569",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                cursor: groupSubs.length === 0 ? "not-allowed" : "pointer",
                              }}
                              title="Export CHED standard grade sheet"
                            >
                              <Download size={14} />
                              <span>CHED Sheet</span>
                            </button>
                          </div>
                        </div>

                        {groupSubs.length === 0 ? (
                          <div
                            style={{
                              textAlign: "center",
                              padding: "2.5rem 1.5rem",
                              background: "#ffffff",
                              borderRadius: "14px",
                              border: "1px solid #e2e8f0",
                              color: "#64748b",
                              fontSize: "0.9rem",
                            }}
                          >
                            No student answer sheets recorded for this examination session yet.
                          </div>
                        ) : (
                          <div
                            style={{
                              background: "#ffffff",
                              borderRadius: "14px",
                              border: "1px solid #e2e8f0",
                              overflow: "hidden",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                            }}
                          >
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                textAlign: "left",
                                fontSize: "0.85rem",
                              }}
                            >
                              <thead
                                style={{
                                  background: "#f8fafc",
                                  borderBottom: "1px solid #e2e8f0",
                                }}
                              >
                                <tr>
                                  <th
                                    style={{
                                      padding: "1rem 1.25rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Student ID & Name
                                  </th>
                                  <th
                                    style={{
                                      padding: "1rem 1.25rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Raw Score
                                  </th>
                                  <th
                                    style={{
                                      padding: "1rem 1.25rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Transmuted
                                  </th>
                                  <th
                                    style={{
                                      padding: "1rem 1.25rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Status
                                  </th>
                                  <th
                                    style={{
                                      padding: "1rem 1.25rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                    }}
                                  >
                                    Date
                                  </th>
                                  <th
                                    style={{
                                      padding: "1rem 1.25rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                      fontSize: "0.82rem",
                                      textAlign: "right",
                                    }}
                                  >
                                    Actions
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupSubs.map((sub) => {
                                  const matchedStudent = rosterMap.get(
                                    (sub.student_id || "").toLowerCase(),
                                  );
                                  const trans = calculateTransmutedGrade(
                                    sub.score,
                                    totalItems,
                                  );
                                  const hasAmbiguous =
                                    sub.answers &&
                                    Object.values(sub.answers).some(
                                      (a) => a?.is_ambiguous,
                                    );

                                  return (
                                    <tr
                                      key={sub.id}
                                      style={{
                                        borderBottom: "1px solid #f1f5f9",
                                        background: hasAmbiguous ? "#fffdfd" : "#ffffff",
                                        transition: "background 0.15s ease",
                                      }}
                                    >
                                      {/* Student ID & Name */}
                                      <td style={{ padding: "1.1rem 1.25rem", verticalAlign: "middle" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                          <span
                                            style={{
                                              fontSize: "0.95rem",
                                              fontWeight: 800,
                                              color: "#0f172a",
                                              lineHeight: 1.3,
                                            }}
                                          >
                                            {matchedStudent
                                              ? matchedStudent.name
                                              : sub.student_id
                                                ? `Student ${sub.student_id}`
                                                : "Student Submission"}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: "0.8rem",
                                              color: "#64748b",
                                              fontWeight: 500,
                                            }}
                                          >
                                            ID: {sub.student_id}
                                            {hasAmbiguous && (
                                              <span
                                                style={{
                                                  marginLeft: "6px",
                                                  color: "#dc2626",
                                                  fontWeight: 700,
                                                }}
                                              >
                                                • Needs Review
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Raw Score */}
                                      <td style={{ padding: "1.1rem 1.25rem", verticalAlign: "middle" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                          <div style={{ lineHeight: 1.2 }}>
                                            <span
                                              style={{
                                                fontSize: "1.15rem",
                                                fontWeight: 800,
                                                color: "#0f172a",
                                              }}
                                            >
                                              {sub.score}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: "0.88rem",
                                                fontWeight: 500,
                                                color: "#64748b",
                                              }}
                                            >
                                              {" "}/ {totalItems}
                                            </span>
                                          </div>
                                          <span
                                            style={{
                                              fontSize: "0.8rem",
                                              color: "#64748b",
                                              fontWeight: 500,
                                            }}
                                          >
                                            {trans.percentage}%
                                          </span>
                                        </div>
                                      </td>

                                      {/* Transmuted */}
                                      <td style={{ padding: "1.1rem 1.25rem", verticalAlign: "middle" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                          <span
                                            style={{
                                              fontSize: "1.15rem",
                                              fontWeight: 800,
                                              color: "var(--primary, #28166f)",
                                              lineHeight: 1.2,
                                            }}
                                          >
                                            {trans.grade}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: "0.8rem",
                                              color: "#64748b",
                                              fontWeight: 500,
                                            }}
                                          >
                                            {trans.remarks}
                                          </span>
                                        </div>
                                      </td>

                                      {/* Status */}
                                      <td style={{ padding: "1.1rem 1.25rem", verticalAlign: "middle" }}>
                                        <span
                                          style={{
                                            display: "inline-block",
                                            padding: "0.25rem 0.85rem",
                                            borderRadius: "9999px",
                                            fontSize: "0.78rem",
                                            fontWeight: 700,
                                            background:
                                              trans.status === "Passed" ? "#ecfdf5" : "#fef2f2",
                                            color:
                                              trans.status === "Passed" ? "#059669" : "#dc2626",
                                            border:
                                              trans.status === "Passed"
                                                ? "1px solid #a7f3d0"
                                                : "1px solid #fecaca",
                                          }}
                                        >
                                          {trans.status}
                                        </span>
                                      </td>

                                      {/* Scanned At */}
                                      <td
                                        style={{
                                          padding: "1.1rem 1.25rem",
                                          verticalAlign: "middle",
                                          fontSize: "0.82rem",
                                          color: "#64748b",
                                          fontWeight: 500,
                                        }}
                                      >
                                        {sub.created_at ? formatDate(sub.created_at) : "Oct 24, 2025, 07:45 PM"}
                                      </td>

                                      {/* Actions */}
                                      <td
                                        style={{
                                          padding: "1.1rem 1.25rem",
                                          verticalAlign: "middle",
                                          textAlign: "right",
                                        }}
                                      >
                                        <div
                                          style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            justifyContent: "flex-end",
                                          }}
                                        >
                                          {/* Inspect Student Answer Sheet */}
                                          {onSelectSubmission && (
                                            <button
                                              type="button"
                                              onClick={() => onSelectSubmission(sub)}
                                              style={{
                                                width: "36px",
                                                height: "36px",
                                                borderRadius: "8px",
                                                border: "1px solid #cbd5e1",
                                                background: "#ffffff",
                                                color: "#334155",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                              }}
                                              title="Inspect Student Bubble Sheet"
                                            >
                                              <Eye size={16} />
                                            </button>
                                          )}

                                          {/* Download Individual Result (.xlsx) */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              try {
                                                exportExamBatchExcel(exam, [sub], roster);
                                                if (addToast) {
                                                  addToast(
                                                    "success",
                                                    `Downloaded score report for ${matchedStudent ? matchedStudent.name : sub.student_id}`,
                                                  );
                                                }
                                              } catch {
                                                if (addToast) {
                                                  addToast("error", "Failed to export report");
                                                }
                                              }
                                            }}
                                            style={{
                                              width: "36px",
                                              height: "36px",
                                              borderRadius: "8px",
                                              border: "1px solid #cbd5e1",
                                              background: "#ffffff",
                                              color: "#334155",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              cursor: "pointer",
                                              transition: "all 0.15s ease",
                                            }}
                                            title="Download Student Report (.xlsx)"
                                          >
                                            <Download size={16} />
                                          </button>

                                          {/* Send Score to Student Portal */}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSendSingleGrade(sub, matchedStudent, exam)
                                            }
                                            style={{
                                              width: "36px",
                                              height: "36px",
                                              borderRadius: "8px",
                                              border: sentSubmissionIds.has(sub.id)
                                                ? "1px solid #a7f3d0"
                                                : "1px solid #cbd5e1",
                                              background: sentSubmissionIds.has(sub.id)
                                                ? "#ecfdf5"
                                                : "#ffffff",
                                              color: sentSubmissionIds.has(sub.id)
                                                ? "#059669"
                                                : "#334155",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              cursor: "pointer",
                                              transition: "all 0.15s ease",
                                            }}
                                            title={
                                              sentSubmissionIds.has(sub.id)
                                                ? "Official score report delivered to student"
                                                : "Deliver grade report to student portal"
                                            }
                                          >
                                            {sentSubmissionIds.has(sub.id) ? (
                                              <CheckCircle2 size={16} />
                                            ) : (
                                              <Send size={15} />
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
    </div>
  );
};

export { TeacherExamCompiler as ExaminationResultsManagement };
export default TeacherExamCompiler;
