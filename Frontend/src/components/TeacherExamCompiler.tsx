import React, { useState, useMemo } from "react";
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Eye,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Exam, Submission, StudentRosterEntry, AuthUser } from "../types";
import {
  calculateTransmutedGrade,
  exportExamBatchExcel,
  exportCHEDGradeSheet,
} from "../utils/excelUtils";

interface TeacherExamCompilerProps {
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  currentUser?: AuthUser | null;
  onSelectSubmission?: (submission: Submission) => void;
  onInspectExam?: (exam: Exam) => void;
  addToast?: (type: "success" | "error" | "info", message: string) => void;
  formatDate: (iso: string) => string;
}

export const TeacherExamCompiler: React.FC<TeacherExamCompilerProps> = ({
  exams,
  submissions,
  roster,
  currentUser,
  onSelectSubmission,
  onInspectExam,
  addToast,
  formatDate,
}) => {
  // Filters State
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("All");
  const [selectedSemester, setSelectedSemester] = useState<string>("All");
  const [selectedExamType, setSelectedExamType] = useState<string>("All");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

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

  // Group submissions by exam_id
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

  // Overall compiler stats
  const overallCompilerStats = useMemo(() => {
    const totalExamsCount = compiledExamGroups.length;
    const totalSubmissionsCount = compiledExamGroups.reduce(
      (acc, curr) => acc + curr.totalScanned,
      0,
    );
    const overallPassedCount = compiledExamGroups.reduce(
      (acc, curr) => acc + curr.passedCount,
      0,
    );
    const overallPassRate =
      totalSubmissionsCount > 0
        ? Math.round((overallPassedCount / totalSubmissionsCount) * 100)
        : 0;

    return {
      totalExamsCount,
      totalSubmissionsCount,
      overallPassRate,
    };
  }, [compiledExamGroups]);

  // Export Batch Excel Handler
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
      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "var(--warning-bg)",
              border: "1px solid var(--warning-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--warning-text)",
              flexShrink: 0,
            }}
          >
            <GraduationCap size={26} />
          </div>
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.2rem",
              }}
            >
              <span
                className="badge"
                style={{
                  background: "var(--warning-bg)",
                  color: "var(--warning-text)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                Teacher Academic Module
              </span>
              {currentUser && (
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                >
                  Instructor: {currentUser.name}
                </span>
              )}
            </div>
            <h2
              style={{
                fontSize: "1.35rem",
                fontWeight: 800,
                margin: 0,
                color: "var(--text-heading)",
              }}
            >
              Session & Class Examination Compiler
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                margin: "0.2rem 0 0 0",
              }}
            >
              Automatically group student examination records by exact session
              (Academic Year, Term, Exam Type) and class details (Subject,
              Section, Program) for inspection, review, and export.
            </p>
          </div>
        </div>

        {/* Quick Compiler Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            background: "var(--bg-surface-2)",
            padding: "0.6rem 1.1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Compiled Exams
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--gold-primary)",
              }}
            >
              {overallCompilerStats.totalExamsCount}
            </div>
          </div>
          <div
            style={{ width: "1px", height: "30px", background: "var(--border)" }}
          />
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Scanned Records
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "var(--info)",
              }}
            >
              {overallCompilerStats.totalSubmissionsCount}
            </div>
          </div>
          <div
            style={{ width: "1px", height: "30px", background: "var(--border)" }}
          />
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Avg Pass Rate
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: 800,
                color: "#34d399",
              }}
            >
              {overallCompilerStats.overallPassRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          background: "var(--bg-surface)",
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Filter size={16} color="var(--gold-accent)" />
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              Group Filters: Exact Examination Session & Class
            </span>
          </div>

          <div
            style={{
              position: "relative",
              minWidth: "260px",
              flex: "1 1 300px",
            }}
          >
            <Search
              size={16}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by student, subject, code, section, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: "36px", height: "38px", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}
        >
          {/* Academic Year Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Academic Year
            </label>
            <select
              className="form-input"
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              style={{ height: "36px", fontSize: "0.82rem" }}
            >
              {academicYears.map((ay) => (
                <option key={ay} value={ay}>
                  {ay === "All" ? "All Academic Years" : ay}
                </option>
              ))}
            </select>
          </div>

          {/* Semester Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Semester / Term
            </label>
            <select
              className="form-input"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{ height: "36px", fontSize: "0.82rem" }}
            >
              {semesters.map((sem) => (
                <option key={sem} value={sem}>
                  {sem === "All" ? "All Semesters" : sem}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Exam Period / Type
            </label>
            <select
              className="form-input"
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value)}
              style={{ height: "36px", fontSize: "0.82rem" }}
            >
              {examTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All Exam Types" : type}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                fontWeight: 600,
                display: "block",
                marginBottom: "4px",
              }}
            >
              Class Section
            </label>
            <select
              className="form-input"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={{ height: "36px", fontSize: "0.82rem" }}
            >
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === "All" ? "All Sections" : sec}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Compiled Examination Groups List */}
      {compiledExamGroups.length === 0 ? (
        <div className="empty-state card" style={{ padding: "3rem 1.5rem" }}>
          <BookOpen
            size={42}
            className="text-muted"
            style={{ marginBottom: "1rem" }}
          />
          <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>
            No Examination Sessions Match Filter
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
              maxWidth: "480px",
              margin: 0,
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

            return (
              <div
                key={exam.id}
                className="card"
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: isExpanded
                    ? "1px solid var(--gold-accent)"
                    : "1px solid var(--border)",
                  background: isExpanded
                    ? "var(--gold-pale)"
                    : "var(--bg-surface)",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    background: "var(--bg-surface-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                    cursor: "pointer",
                  }}
                  onClick={() => toggleExpandGroup(exam.id)}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1rem",
                      flex: "1 1 360px",
                    }}
                  >
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: "var(--warning-bg)",
                        border: "1px solid var(--warning-border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--warning-text)",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      <BookOpen size={22} />
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
                            background: "var(--info-bg)",
                            color: "var(--info-text)",
                            border: "1px solid var(--info-border)",
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
                              color: "var(--info)",
                            }}
                          >
                            [{exam.course_code}]
                          </span>
                        )}

                        {exam.section && (
                          <span
                            className="badge"
                            style={{
                              background: "var(--success-bg)",
                              color: "var(--success-text)",
                              border: "1px solid var(--success-border)",
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
                              color: "var(--text-muted)",
                            }}
                          >
                            AY {exam.academic_year} (
                            {exam.semester || "1st Sem"})
                          </span>
                        )}
                      </div>

                      {/* Examination Title */}
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          margin: "0 0 4px 0",
                          color: "var(--text-primary)",
                        }}
                      >
                        {exam.name}
                      </h3>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          fontSize: "0.8rem",
                          color: "var(--text-secondary)",
                          flexWrap: "wrap",
                        }}
                      >
                        <span>Subject: {exam.subject || "N/A"}</span>
                        <span>• Program: {exam.program || "BSIT"}</span>
                        <span>
                          • Instructor:{" "}
                          {exam.instructor_name || "Faculty Member"}
                        </span>
                        <span>• {totalItems} items</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side Stats & Actions */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {/* Stat Badges */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          textAlign: "center",
                          padding: "0.3rem 0.6rem",
                          background: "var(--bg-base)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Scanned
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "var(--text-heading)",
                          }}
                        >
                          {totalScanned}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          padding: "0.3rem 0.6rem",
                          background: "var(--bg-base)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Mean Score
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "var(--gold-primary)",
                          }}
                        >
                          {meanScore}/{totalItems} ({avgPercentage}%)
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          padding: "0.3rem 0.6rem",
                          background: "var(--bg-base)",
                          borderRadius: "6px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                          }}
                        >
                          Pass Rate
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: passRate >= 75 ? "#34d399" : "#f87171",
                          }}
                        >
                          {passRate}%
                        </div>
                      </div>

                      {flaggedCount > 0 && (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "0.3rem 0.6rem",
                            background: "var(--error-bg)",
                            borderRadius: "6px",
                            border: "1px solid var(--error-border)",
                          }}
                          title="Flagged ambiguous bubble marks"
                        >
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "var(--error-text)",
                              textTransform: "uppercase",
                            }}
                          >
                            Flagged
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: "var(--error-text)",
                            }}
                          >
                            {flaggedCount}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onInspectExam && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onInspectExam(exam)}
                          title="Inspect Answer Key & Exam Details"
                          style={{ fontSize: "0.8rem" }}
                        >
                          <Eye size={14} style={{ marginRight: "4px" }} />{" "}
                          Inspect
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleExportBatch(exam, groupSubs)}
                        disabled={groupSubs.length === 0}
                        title="Export compiled batch report (.xlsx)"
                        style={{ fontSize: "0.8rem" }}
                      >
                        <FileSpreadsheet
                          size={14}
                          style={{ marginRight: "4px", color: "#34d399" }}
                        />
                        Batch Excel
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() =>
                          handleCopyClassSummary(exam, groupSubs, totalItems)
                        }
                        disabled={groupSubs.length === 0}
                        title="Copy formatted summary to clipboard"
                        style={{ fontSize: "0.8rem" }}
                      >
                        <Copy size={14} style={{ marginRight: "4px" }} /> Copy
                        Summary
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-icon-only btn-sm"
                        onClick={() => toggleExpandGroup(exam.id)}
                        title={
                          isExpanded
                            ? "Collapse Student Roster"
                            : "Expand Student Roster"
                        }
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Student Examination Records Table */}
                {isExpanded && (
                  <div
                    style={{
                      padding: "1.25rem 1.5rem",
                      borderTop: "1px solid var(--border)",
                      background: "var(--bg-surface-2)",
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
                      <h4
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          color: "var(--gold-primary)",
                          margin: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <UserCheck size={16} /> Compiled Student Examination
                        Roster ({groupSubs.length} Scanned)
                      </h4>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleExportCHED(exam, groupSubs)}
                          disabled={groupSubs.length === 0}
                          style={{ fontSize: "0.78rem" }}
                        >
                          <Download size={13} style={{ marginRight: "4px" }} />{" "}
                          CHED Grade Sheet
                        </button>
                      </div>
                    </div>

                    {groupSubs.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "1.5rem",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        No scanned student answer sheets submitted for this
                        examination yet.
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="data-table">
                          <thead>
                            <tr>
                              <th>Student Roster Entry</th>
                              <th>Course & Section</th>
                              <th>Raw Score</th>
                              <th>Equiv %</th>
                              <th>PH CHED Grade</th>
                              <th>Academic Status</th>
                              <th>Date & Time Graded</th>
                              <th style={{ textAlign: "right" }}>Actions</th>
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
                                  className="table-row-hover"
                                  style={{
                                    background: hasAmbiguous
                                      ? "var(--error-bg)"
                                      : undefined,
                                  }}
                                >
                                  {/* Student Name & ID */}
                                  <td style={{ fontWeight: 600 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                      }}
                                    >
                                      {matchedStudent ? (
                                        <UserCheck
                                          size={16}
                                          className="text-success"
                                        />
                                      ) : (
                                        <GraduationCap
                                          size={16}
                                          className="text-primary"
                                        />
                                      )}
                                      <div>
                                        <div>
                                          {matchedStudent
                                            ? matchedStudent.name
                                            : sub.student_id}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "var(--text-muted)",
                                            fontWeight: 400,
                                          }}
                                        >
                                          ID: {sub.student_id}{" "}
                                          {hasAmbiguous && (
                                            <span
                                              style={{
                                                color: "#f87171",
                                                fontWeight: 600,
                                                marginLeft: "4px",
                                              }}
                                            >
                                              • Ambiguous Mark Flagged
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Course & Section */}
                                  <td
                                    style={{
                                      fontSize: "0.85rem",
                                      color: "var(--text-secondary)",
                                    }}
                                  >
                                    {matchedStudent?.course_section ||
                                      exam.section ||
                                      "N/A"}
                                  </td>

                                  {/* Raw Score */}
                                  <td style={{ fontWeight: 700 }}>
                                    {sub.score} / {totalItems}
                                  </td>

                                  {/* Equivalent Percentage */}
                                  <td style={{ fontWeight: 600 }}>
                                    {trans.percentage}%
                                  </td>

                                  {/* Transmuted Grade */}
                                  <td>
                                    <span
                                      className={`badge ${trans.status === "Passed" ? "badge-success" : "badge-danger"}`}
                                      style={{
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {trans.grade} ({trans.remarks})
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "0.82rem",
                                        fontWeight: 600,
                                        color:
                                          trans.status === "Passed"
                                            ? "#34d399"
                                            : "#f87171",
                                      }}
                                    >
                                      {trans.status === "Passed" ? (
                                        <CheckCircle2 size={14} />
                                      ) : (
                                        <AlertTriangle size={14} />
                                      )}
                                      {trans.status}
                                    </span>
                                  </td>

                                  {/* Date Graded */}
                                  <td>
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        color: "var(--text-muted)",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      <Calendar size={13} />
                                      {formatDate(sub.created_at)}
                                    </span>
                                  </td>

                                  {/* Inspect Button */}
                                  <td style={{ textAlign: "right" }}>
                                    {onSelectSubmission && (
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => onSelectSubmission(sub)}
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "4px",
                                          fontSize: "0.78rem",
                                        }}
                                      >
                                        <Eye size={13} /> Inspect
                                      </button>
                                    )}
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

export default TeacherExamCompiler;
