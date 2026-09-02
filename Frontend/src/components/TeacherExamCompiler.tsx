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
  const [publishedExamIds, setPublishedExamIds] = useState<Set<string>>(new Set());

  const togglePublishResults = (examId: string, examName: string) => {
    setPublishedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) {
        next.delete(examId);
        if (addToast) addToast("info", `Grading results retracted for "${examName}".`);
      } else {
        next.add(examId);
        if (addToast) addToast("success", `Grading results released for "${examName}". Enrolled students can now view their scores.`);
      }
      return next;
    });
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
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#0062ff",
              border: "1px solid #bfdbfe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
                  background: "#eff6ff",
                  color: "#0062ff",
                  border: "1px solid #bfdbfe",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                Teacher Academic Module
              </span>
              {currentUser && (
                <span
                  style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}
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
                color: "#0f172a",
              }}
            >
              Session & Class Examination Compiler
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
                margin: "0.2rem 0 0 0",
              }}
            >
              Automatically group student examination records by exact session (Academic Year, Term, Exam Type) and class details for review and export.
            </p>
          </div>
        </div>

        {/* Quick Compiler Stats */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.25rem",
            background: "#f8fafc",
            padding: "0.6rem 1.1rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#64748b",
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
                color: "#0f172a",
              }}
            >
              {overallCompilerStats.totalExamsCount}
            </div>
          </div>
          <div
            style={{ width: "1px", height: "30px", background: "#e2e8f0" }}
          />
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#64748b",
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
                color: "#0062ff",
              }}
            >
              {overallCompilerStats.totalSubmissionsCount}
            </div>
          </div>
          <div
            style={{ width: "1px", height: "30px", background: "#e2e8f0" }}
          />
          <div>
            <div
              style={{
                fontSize: "0.7rem",
                color: "#64748b",
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
                color: "#059669",
              }}
            >
              {overallCompilerStats.overallPassRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
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
            <Filter size={16} style={{ color: "#0062ff" }} />
            <span
              style={{
                fontSize: "0.9rem",
                fontWeight: 700,
                color: "#0f172a",
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
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by student, subject, code, section, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: "36px",
                height: "38px",
                fontSize: "0.85rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
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
                color: "#475569",
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
              style={{
                height: "36px",
                fontSize: "0.82rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
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
                color: "#475569",
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
              style={{
                height: "36px",
                fontSize: "0.82rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
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
                color: "#475569",
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
              style={{
                height: "36px",
                fontSize: "0.82rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
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
                color: "#475569",
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
              style={{
                height: "36px",
                fontSize: "0.82rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
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

            return (
              <div
                key={exam.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  border: isExpanded ? "2px solid #0062ff" : "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: isExpanded
                    ? "0 4px 14px rgba(0, 98, 255, 0.08)"
                    : "0 2px 6px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Group Summary Header Bar */}
                <div
                  style={{
                    padding: "1.25rem 1.5rem",
                    background: isExpanded ? "#f8fbff" : "#ffffff",
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
                        background: "#eff6ff",
                        color: "#0062ff",
                        border: "1px solid #bfdbfe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
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
                            background: "#eff6ff",
                            color: "#0062ff",
                            border: "1px solid #bfdbfe",
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
                              color: "#0062ff",
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
                          color: "#0f172a",
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
                          color: "#475569",
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
                          padding: "0.4rem 0.75rem",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                          }}
                        >
                          Scanned
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "#0f172a",
                          }}
                        >
                          {totalScanned}
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          padding: "0.4rem 0.75rem",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                          }}
                        >
                          Mean Score
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: "#0062ff",
                          }}
                        >
                          {meanScore}/{totalItems} ({avgPercentage}%)
                        </div>
                      </div>

                      <div
                        style={{
                          textAlign: "center",
                          padding: "0.4rem 0.75rem",
                          background: "#f8fafc",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.68rem",
                            color: "#64748b",
                            textTransform: "uppercase",
                            fontWeight: 700,
                          }}
                        >
                          Pass Rate
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 800,
                            color: passRate >= 75 ? "#059669" : "#ef4444",
                          }}
                        >
                          {passRate}%
                        </div>
                      </div>

                      {flaggedCount > 0 && (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "0.4rem 0.75rem",
                            background: "#fef2f2",
                            borderRadius: "8px",
                            border: "1px solid #fecaca",
                          }}
                          title="Flagged ambiguous bubble marks"
                        >
                          <div
                            style={{
                              fontSize: "0.68rem",
                              color: "#dc2626",
                              textTransform: "uppercase",
                              fontWeight: 700,
                            }}
                          >
                            Flagged
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 800,
                              color: "#dc2626",
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
                          style={{
                            fontSize: "0.8rem",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            color: "#0f172a",
                            borderRadius: "8px",
                            fontWeight: 600,
                          }}
                        >
                          <Eye size={14} style={{ marginRight: "4px" }} />{" "}
                          Inspect
                        </button>
                      )}

                      <button
                        type="button"
                        className={`btn btn-sm ${publishedExamIds.has(exam.id) ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => togglePublishResults(exam.id, exam.name)}
                        title={
                          publishedExamIds.has(exam.id)
                            ? "Results are published to students. Click to retract."
                            : "Release and publish grading results for students to view."
                        }
                        style={{
                          fontSize: "0.8rem",
                          borderRadius: "8px",
                          fontWeight: 700,
                          background: publishedExamIds.has(exam.id) ? "#0062ff" : "#ffffff",
                          color: publishedExamIds.has(exam.id) ? "#ffffff" : "#0062ff",
                          border: publishedExamIds.has(exam.id) ? "1px solid #0062ff" : "1px solid #bfdbfe",
                        }}
                      >
                        <CheckCircle2 size={13} style={{ marginRight: "4px" }} />
                        {publishedExamIds.has(exam.id) ? "Published" : "Release Results"}
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleExportBatch(exam, groupSubs)}
                        disabled={groupSubs.length === 0}
                        title="Export compiled batch report (.xlsx)"
                        style={{
                          fontSize: "0.8rem",
                          background: "#ecfdf5",
                          border: "1px solid #a7f3d0",
                          color: "#059669",
                          borderRadius: "8px",
                          fontWeight: 700,
                        }}
                      >
                        <FileSpreadsheet
                          size={14}
                          style={{ marginRight: "4px" }}
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
                        style={{
                          fontSize: "0.8rem",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          color: "#0f172a",
                          borderRadius: "8px",
                          fontWeight: 600,
                        }}
                      >
                        <Copy size={14} style={{ marginRight: "4px" }} /> Copy
                        Summary
                      </button>

                      <button
                        type="button"
                        className="btn btn-secondary btn-icon-only btn-sm"
                        onClick={() => toggleExpandGroup(exam.id)}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          color: "#0f172a",
                          borderRadius: "8px",
                        }}
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
                      borderTop: "1px solid #e2e8f0",
                      background: "#f8fafc",
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
                          fontWeight: 800,
                          color: "#0f172a",
                          margin: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                        }}
                      >
                        <UserCheck size={16} style={{ color: "#0062ff" }} /> Compiled Student Examination
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
                          className="btn btn-primary btn-sm"
                          onClick={() => handleExportCHED(exam, groupSubs)}
                          disabled={groupSubs.length === 0}
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            borderRadius: "8px",
                          }}
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
                          padding: "2rem",
                          background: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          color: "#64748b",
                          fontSize: "0.85rem",
                        }}
                      >
                        No scanned student answer sheets submitted for this
                        examination yet.
                      </div>
                    ) : (
                      <div
                        style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          border: "1px solid #e2e8f0",
                          overflow: "hidden",
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "0.82rem",
                            textAlign: "left",
                          }}
                        >
                          <thead style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0" }}>
                            <tr>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Student Roster Entry</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Course & Section</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Raw Score</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Equiv %</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>PH CHED Grade</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Academic Status</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Date & Time Graded</th>
                              <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700, textAlign: "right" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {groupSubs.map((sub, idx) => {
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
                                    backgroundColor: hasAmbiguous
                                      ? "#fef2f2"
                                      : idx % 2 === 0
                                        ? "#ffffff"
                                        : "#f8fbff",
                                  }}
                                >
                                  {/* Student Name & ID */}
                                  <td style={{ padding: "0.65rem 1rem", fontWeight: 600 }}>
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
                                          style={{ color: "#059669" }}
                                        />
                                      ) : (
                                        <GraduationCap
                                          size={16}
                                          style={{ color: "#0062ff" }}
                                        />
                                      )}
                                      <div>
                                        <div style={{ color: "#0f172a", fontWeight: 700 }}>
                                          {matchedStudent
                                            ? matchedStudent.name
                                            : sub.student_id}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: "0.75rem",
                                            color: "#64748b",
                                            fontWeight: 400,
                                          }}
                                        >
                                          ID: {sub.student_id}{" "}
                                          {hasAmbiguous && (
                                            <span
                                              style={{
                                                color: "#dc2626",
                                                fontWeight: 700,
                                                marginLeft: "4px",
                                              }}
                                            >
                                              • Ambiguous Mark
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Course & Section */}
                                  <td
                                    style={{
                                      padding: "0.65rem 1rem",
                                      fontSize: "0.85rem",
                                      color: "#475569",
                                    }}
                                  >
                                    {matchedStudent?.course_section ||
                                      exam.section ||
                                      "N/A"}
                                  </td>

                                  {/* Raw Score */}
                                  <td style={{ padding: "0.65rem 1rem", fontWeight: 800, color: "#0f172a" }}>
                                    {sub.score} / {totalItems}
                                  </td>

                                  {/* Equivalent Percentage */}
                                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                                    {trans.percentage}%
                                  </td>

                                  {/* Transmuted Grade */}
                                  <td style={{ padding: "0.65rem 1rem" }}>
                                    <span
                                      style={{
                                        background: trans.status === "Passed" ? "#ecfdf5" : "#fef2f2",
                                        color: trans.status === "Passed" ? "#059669" : "#dc2626",
                                        border: trans.status === "Passed" ? "1px solid #a7f3d0" : "1px solid #fecaca",
                                        padding: "0.2rem 0.55rem",
                                        borderRadius: "6px",
                                        fontSize: "0.78rem",
                                        fontWeight: 800,
                                      }}
                                    >
                                      {trans.grade} ({trans.remarks})
                                    </span>
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: "0.65rem 1rem" }}>
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        fontSize: "0.82rem",
                                        fontWeight: 700,
                                        color:
                                          trans.status === "Passed"
                                            ? "#059669"
                                            : "#dc2626",
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
                                  <td style={{ padding: "0.65rem 1rem" }}>
                                    <span
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        color: "#64748b",
                                        fontSize: "0.8rem",
                                      }}
                                    >
                                      <Calendar size={13} />
                                      {formatDate(sub.created_at)}
                                    </span>
                                  </td>

                                  {/* Inspect Button */}
                                  <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
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
                                          background: "#f8fafc",
                                          border: "1px solid #e2e8f0",
                                          color: "#0f172a",
                                          borderRadius: "6px",
                                          fontWeight: 600,
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
