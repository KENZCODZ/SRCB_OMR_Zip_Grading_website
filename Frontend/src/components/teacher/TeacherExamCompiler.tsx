import React, { useState, useMemo } from "react";
import {
  BookOpen,
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
  Send,
  Mail,
  RefreshCw,
  Clock,
  CheckSquare,
  Square,
  Database,
  ShieldCheck,
  X,
  Award,
} from "lucide-react";
import type { Exam, Submission, StudentRosterEntry, AuthUser, EmailDeliveryStatus, StudentResultEmailRecord } from "../../types";
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
  initialSubTab?: "results-reports" | "send-results";
  preselectedExamId?: string;
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
  initialSubTab = "results-reports",
  preselectedExamId,
}) => {
  // Navigation Sub-tab: "results-reports" (A) or "send-results" (B)
  const [activeSubTab, setActiveSubTab] = useState<"results-reports" | "send-results">(initialSubTab);

  // Filters State (Results & Reports)
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>("All");
  const [selectedSemester, setSelectedSemester] = useState<string>("All");
  const [selectedExamType, setSelectedExamType] = useState<string>("All");
  const [selectedSection, setSelectedSection] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [publishedExamIds, setPublishedExamIds] = useState<Set<string>>(new Set());

  // Send Results State
  const [selectedSendExamId, setSelectedSendExamId] = useState<string>(preselectedExamId || (exams.length > 0 ? exams[0].id : ""));
  const [sendMode, setSendMode] = useState<"multiple" | "individual" | "compiled">("multiple");
  const [selectedIndividualStudentId, setSelectedIndividualStudentId] = useState<string>("");
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<string>>(new Set());
  const [emailLogs, setEmailLogs] = useState<Record<string, { status: EmailDeliveryStatus; timestamp?: string; error?: string }>>({});
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [previewModalRecord, setPreviewModalRecord] = useState<StudentResultEmailRecord | null>(null);

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

  // Helper to obtain student email address
  const getStudentEmail = (studentId: string, matchedStudent?: StudentRosterEntry): string => {
    if (matchedStudent?.email && matchedStudent.email.trim()) {
      return matchedStudent.email.trim();
    }
    const cleanId = (studentId || "").trim();
    return cleanId ? `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, "")}@srcb.edu.ph` : "student@srcb.edu.ph";
  };

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

  // ────────────────────────────────────────────────────────────────────────────
  // SEND RESULTS LOGIC
  // ────────────────────────────────────────────────────────────────────────────

  const currentSendExam = useMemo(() => {
    return exams.find((e) => e.id === selectedSendExamId) || exams[0] || null;
  }, [exams, selectedSendExamId]);

  const currentSendExamSubs = useMemo(() => {
    if (!currentSendExam) return [];
    return submissions.filter((s) => s.exam_id === currentSendExam.id);
  }, [currentSendExam, submissions]);

  const currentSendTotalItems = useMemo(() => {
    if (!currentSendExam) return 50;
    return currentSendExam.num_items || Object.keys(currentSendExam.answer_key || {}).length || 50;
  }, [currentSendExam]);

  // Set default selected student when exam changes
  useMemo(() => {
    if (currentSendExamSubs.length > 0 && !selectedIndividualStudentId) {
      setSelectedIndividualStudentId(currentSendExamSubs[0].student_id);
    }
  }, [currentSendExamSubs, selectedIndividualStudentId]);

  // Calculate email delivery statistics for current selected exam
  const currentExamDeliveryStats = useMemo(() => {
    let sent = 0;
    let failed = 0;
    let pending = 0;

    currentSendExamSubs.forEach((sub) => {
      const log = emailLogs[`${currentSendExam?.id}_${sub.student_id}`];
      if (log?.status === "sent") sent++;
      else if (log?.status === "failed") failed++;
      else if (log?.status === "pending") pending++;
    });

    return {
      total: currentSendExamSubs.length,
      sent,
      failed,
      pending,
      unsent: currentSendExamSubs.length - (sent + failed + pending),
    };
  }, [currentSendExamSubs, emailLogs, currentSendExam]);

  // Construct official student email record for preview / sending
  const buildStudentEmailRecord = (
    exam: Exam,
    sub: Submission,
    studentId: string,
  ): StudentResultEmailRecord => {
    const matched = rosterMap.get(studentId.toLowerCase());
    const studentName = matched ? matched.name : `Student ${studentId}`;
    const studentEmail = getStudentEmail(studentId, matched);
    const totalItems = exam.num_items || sub.total_questions || 50;
    const trans = calculateTransmutedGrade(sub.score, totalItems);
    const log = emailLogs[`${exam.id}_${studentId}`];

    return {
      id: `${exam.id}_${studentId}`,
      submissionId: sub.id,
      studentId,
      studentName,
      studentEmail,
      examId: exam.id,
      examTitle: exam.name,
      examType: exam.exam_type || "Examination",
      courseCode: exam.course_code,
      subject: exam.subject,
      section: exam.section || matched?.course_section,
      score: sub.score,
      totalQuestions: totalItems,
      percentage: trans.percentage,
      grade: trans.grade,
      status: trans.status,
      remarks: trans.remarks,
      deliveryStatus: log?.status || "pending",
      sentAt: log?.timestamp,
      errorMessage: log?.error,
    };
  };

  // Send single student email
  const handleSendSingleStudentEmail = (studentId: string, exam: Exam, sub?: Submission) => {
    const matched = rosterMap.get(studentId.toLowerCase());
    const email = getStudentEmail(studentId, matched);
    const logKey = `${exam.id}_${studentId}`;
    const targetSub = sub || submissions.find((s) => s.exam_id === exam.id && s.student_id === studentId);
    if (!targetSub && addToast) {
      addToast("warning", "No submission found for this student.");
    }

    setEmailLogs((prev) => ({
      ...prev,
      [logKey]: { status: "pending" },
    }));

    if (!email || !email.includes("@")) {
      setEmailLogs((prev) => ({
        ...prev,
        [logKey]: {
          status: "failed",
          timestamp: new Date().toLocaleTimeString(),
          error: "Missing or invalid institutional email address",
        },
      }));
      if (addToast) {
        addToast(
          "error",
          `Delivery failed for ${matched?.name || studentId}: Invalid student email address.`,
        );
      }
      return;
    }

    setTimeout(() => {
      setEmailLogs((prev) => ({
        ...prev,
        [logKey]: {
          status: "sent",
          timestamp: new Date().toLocaleTimeString(),
        },
      }));
      if (addToast) {
        addToast(
          "success",
          `Result successfully sent to ${matched?.name || studentId} (${email}).`,
        );
      }
    }, 450);
  };

  // Send batch multiple students email
  const handleSendBatchStudentsEmail = (targetIds: string[]) => {
    if (!currentSendExam || targetIds.length === 0) {
      if (addToast) addToast("warning", "Please select at least one student recipient.");
      return;
    }

    setIsSendingBatch(true);
    let sentCount = 0;
    let failedCount = 0;

    targetIds.forEach((studentId, idx) => {
      const logKey = `${currentSendExam.id}_${studentId}`;
      const sub = currentSendExamSubs.find((s) => s.student_id === studentId);
      const matched = rosterMap.get(studentId.toLowerCase());
      const email = getStudentEmail(studentId, matched);

      // Set pending immediately
      setEmailLogs((prev) => ({
        ...prev,
        [logKey]: { status: "pending" },
      }));

      // Simulate staggered realistic institutional dispatch
      setTimeout(() => {
        if (!email || !email.includes("@") || !sub) {
          failedCount++;
          setEmailLogs((prev) => ({
            ...prev,
            [logKey]: {
              status: "failed",
              timestamp: new Date().toLocaleTimeString(),
              error: "Missing or invalid institutional email address",
            },
          }));
        } else {
          sentCount++;
          setEmailLogs((prev) => ({
            ...prev,
            [logKey]: {
              status: "sent",
              timestamp: new Date().toLocaleTimeString(),
            },
          }));
        }

        if (idx === targetIds.length - 1) {
          setIsSendingBatch(false);
          if (addToast) {
            if (failedCount === 0) {
              addToast(
                "success",
                `Batch distribution complete: ${sentCount} individual examination results delivered.`,
              );
            } else {
              addToast(
                "info",
                `Batch distribution finished: ${sentCount} sent, ${failedCount} failed. Check status column for details.`,
              );
            }
          }
        }
      }, 300 + idx * 150);
    });
  };

  // Select all or deselect all recipients
  const handleToggleSelectAllRecipients = () => {
    if (selectedRecipientIds.size === currentSendExamSubs.length) {
      setSelectedRecipientIds(new Set());
    } else {
      setSelectedRecipientIds(new Set(currentSendExamSubs.map((s) => s.student_id)));
    }
  };

  const handleToggleRecipient = (studentId: string) => {
    setSelectedRecipientIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Jump from exam card in Results & Reports directly to Send Results
  const handleJumpToSendResults = (examId: string) => {
    setSelectedSendExamId(examId);
    setActiveSubTab("send-results");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODULE HEADER BANNER WITH SUB-SECTION NAVIGATION                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
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
              background: "var(--primary-light-surface, #f5f3ff)",
              color: "var(--primary, #28166f)",
              border: "1px solid var(--primary-light-border, #ddd6fe)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Award size={26} />
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
                  background: "var(--primary-light-surface, #f5f3ff)",
                  color: "var(--primary, #28166f)",
                  border: "1px solid var(--primary-light-border, #ddd6fe)",
                  fontWeight: 700,
                  fontSize: "0.75rem",
                }}
              >
                Teacher Assessment Module
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
              Examination Results Management
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
                margin: "0.2rem 0 0 0",
              }}
            >
              Centralized hub for reviewing, compiling, exporting, and distributing official student examination results.
            </p>
          </div>
        </div>

        {/* Global Summary Metric Badges */}
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
                color: "var(--primary, #28166f)",
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SECTION TABS: A. Results & Reports  |  B. Send Results              */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          background: "#ffffff",
          padding: "0.5rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab("results-reports")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            fontSize: "0.88rem",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: activeSubTab === "results-reports" ? "var(--primary, #28166f)" : "transparent",
            color: activeSubTab === "results-reports" ? "#ffffff" : "#475569",
          }}
        >
          <FileSpreadsheet size={16} />
          <span>Results & Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("send-results")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "0.6rem 1.25rem",
            borderRadius: "8px",
            fontSize: "0.88rem",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
            background: activeSubTab === "send-results" ? "var(--primary, #28166f)" : "transparent",
            color: activeSubTab === "send-results" ? "#ffffff" : "#475569",
          }}
        >
          <Send size={16} />
          <span>Send Results</span>
          {currentExamDeliveryStats.sent > 0 && (
            <span
              style={{
                fontSize: "0.72rem",
                padding: "2px 7px",
                borderRadius: "10px",
                background: activeSubTab === "send-results" ? "rgba(255, 255, 255, 0.25)" : "#ecfdf5",
                color: activeSubTab === "send-results" ? "#ffffff" : "#059669",
                fontWeight: 800,
              }}
            >
              {currentExamDeliveryStats.sent} Sent
            </span>
          )}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SUB-SECTION A: RESULTS & REPORTS                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "results-reports" && (
        <>
          {/* Filter & Global Export Actions Bar */}
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
                <Filter size={16} style={{ color: "var(--primary, #28166f)" }} />
                <span
                  style={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#0f172a",
                  }}
                >
                  Compile & Group: Academic Session & Class Filters
                </span>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                  flex: "1 1 340px",
                  justifyContent: "flex-end",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    minWidth: "240px",
                    flex: "1 1 240px",
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
                    placeholder="Search student, subject, code, section, or exam..."
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
                      width: "100%",
                    }}
                  />
                </div>

                {/* Export All Examination Files Option */}
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
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.82rem",
                    height: "38px",
                    flexShrink: 0,
                  }}
                  title="Export all examination result records to a single multi-sheet Excel file"
                >
                  <Database size={15} /> Export All Examination Files
                </button>
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
                      border: isExpanded ? "2px solid var(--primary, #28166f)" : "1px solid #e2e8f0",
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
                            <span style={{ fontWeight: 700, color: "var(--primary, #28166f)" }}>
                              • {totalItems} Test Items
                            </span>
                            {exam.exam_date && (
                              <span>• Date: {exam.exam_date}</span>
                            )}
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
                                color: "var(--primary, #28166f)",
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
                              background: publishedExamIds.has(exam.id) ? "var(--primary, #28166f)" : "#ffffff",
                              color: publishedExamIds.has(exam.id) ? "#ffffff" : "var(--primary, #28166f)",
                              border: publishedExamIds.has(exam.id) ? "1px solid var(--primary, #28166f)" : "1px solid var(--primary-light-border, #ddd6fe)",
                            }}
                          >
                            <CheckCircle2 size={13} style={{ marginRight: "4px" }} />
                            {publishedExamIds.has(exam.id) ? "Published" : "Release Results"}
                          </button>

                          {/* Specific Exam Export (Batch Excel) */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleExportBatch(exam, groupSubs)}
                            disabled={groupSubs.length === 0}
                            title="Export specific compiled examination report (.xlsx)"
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

                          {/* Send Results Shortcut */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleJumpToSendResults(exam.id)}
                            style={{
                              fontSize: "0.8rem",
                              background: "var(--primary-light-surface, #f5f3ff)",
                              border: "1px solid var(--primary-light-border, #ddd6fe)",
                              color: "var(--primary, #28166f)",
                              borderRadius: "8px",
                              fontWeight: 700,
                            }}
                            title="Send processed examination results to students via registered email"
                          >
                            <Send size={13} style={{ marginRight: "4px" }} /> Send Results
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

                    {/* Expanded Student Examination Records Table (Review Compilation) */}
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
                            <UserCheck size={16} style={{ color: "var(--primary, #28166f)" }} /> Compiled Student Examination
                            Roster ({groupSubs.length} Scanned • {totalItems} Test Items)
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
                              onClick={() => handleCopyClassSummary(exam, groupSubs, totalItems)}
                              disabled={groupSubs.length === 0}
                              style={{
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                borderRadius: "8px",
                              }}
                            >
                              <Copy size={13} style={{ marginRight: "4px" }} /> Copy Summary
                            </button>

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
                                  <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Email Address</th>
                                  <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700, textAlign: "right" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {groupSubs.map((sub, idx) => {
                                  const matchedStudent = rosterMap.get(
                                    (sub.student_id || "").toLowerCase(),
                                  );
                                  const studentEmail = getStudentEmail(sub.student_id, matchedStudent);
                                  const trans = calculateTransmutedGrade(
                                    sub.score,
                                    totalItems,
                                  );
                                  const hasAmbiguous =
                                    sub.answers &&
                                    Object.values(sub.answers).some(
                                      (a) => a?.is_ambiguous,
                                    );
                                  const emailLog = emailLogs[`${exam.id}_${sub.student_id}`];

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
                                              style={{ color: "var(--primary, #28166f)" }}
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

                                      {/* Registered Email & Date */}
                                      <td style={{ padding: "0.65rem 1rem", fontSize: "0.8rem", color: "#475569" }}>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                            <Mail size={12} style={{ color: "#94a3b8" }} />
                                            <span>{studentEmail}</span>
                                            {emailLog?.status === "sent" && (
                                              <span style={{ color: "#059669", fontWeight: 700, fontSize: "0.7rem", marginLeft: "4px" }}>
                                                ✓ Sent
                                              </span>
                                            )}
                                          </div>
                                          {sub.created_at && (
                                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                                              Graded: {formatDate(sub.created_at)}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* Action Buttons */}
                                      <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
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
                                              title="Inspect individual student bubble sheet"
                                            >
                                              <Eye size={13} /> Inspect
                                            </button>
                                          )}

                                          <button
                                            type="button"
                                            className="btn btn-secondary btn-sm"
                                            onClick={() => handleSendSingleStudentEmail(sub.student_id, exam, sub)}
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                              fontSize: "0.78rem",
                                              background: emailLog?.status === "sent" ? "#ecfdf5" : "var(--primary-light-surface, #f5f3ff)",
                                              border: emailLog?.status === "sent" ? "1px solid #a7f3d0" : "1px solid var(--primary-light-border, #ddd6fe)",
                                              color: emailLog?.status === "sent" ? "#059669" : "var(--primary, #28166f)",
                                              borderRadius: "6px",
                                              fontWeight: 700,
                                            }}
                                            title="Send result to this student's registered email"
                                          >
                                            <Send size={12} />
                                            {emailLog?.status === "sent" ? "Resend" : "Send Result"}
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
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SUB-SECTION B: SEND RESULTS (STUDENT RESULT EMAIL DISTRIBUTION)    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {activeSubTab === "send-results" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Examination Selection & Overview Card */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "1.5rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.3rem",
                  }}
                >
                  <Send size={18} style={{ color: "var(--primary, #28166f)" }} />
                  <h3
                    style={{
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      margin: 0,
                      color: "#0f172a",
                    }}
                  >
                    Direct Student Grade Distribution
                  </h3>
                </div>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "#64748b",
                    margin: 0,
                  }}
                >
                  Send confidential processed examination results directly to students using their registered institutional Gmail/email.
                </p>
              </div>

              {/* Examination Selector */}
              <div style={{ minWidth: "300px", flex: "1 1 300px", maxWidth: "480px" }}>
                <label
                  style={{
                    fontSize: "0.75rem",
                    color: "#475569",
                    fontWeight: 700,
                    display: "block",
                    marginBottom: "4px",
                    textTransform: "uppercase",
                  }}
                >
                  Select Examination to Distribute:
                </label>
                <select
                  className="form-input"
                  value={selectedSendExamId}
                  onChange={(e) => {
                    setSelectedSendExamId(e.target.value);
                    setSelectedRecipientIds(new Set());
                  }}
                  style={{
                    width: "100%",
                    height: "40px",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    color: "#0f172a",
                  }}
                >
                  {exams.map((ex) => {
                    const count = submissions.filter((s) => s.exam_id === ex.id).length;
                    const items = ex.num_items || 50;
                    return (
                      <option key={ex.id} value={ex.id}>
                        {ex.name} ({ex.exam_type || "Exam"} • {items} items • {count} students)
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Active Examination Metadata Badge Bar */}
            {currentSendExam && (
              <div
                style={{
                  background: "#f8fbff",
                  border: "1px solid var(--primary-light-border, #ddd6fe)",
                  borderRadius: "12px",
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <span
                      className="badge"
                      style={{
                        background: "var(--primary, #28166f)",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.75rem",
                      }}
                    >
                      {currentSendExam.exam_type || "Major Examination"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.88rem", color: "#1e293b", fontWeight: 700 }}>
                    {currentSendExam.subject || currentSendExam.name}
                    {currentSendExam.course_code && ` (${currentSendExam.course_code})`}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    • Section: <strong>{currentSendExam.section || "All Sections"}</strong>
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--primary, #28166f)", fontWeight: 700 }}>
                    • {currentSendTotalItems} Test Items (Variable Length)
                  </div>
                  {currentSendExam.exam_date && (
                    <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                      • Exam Date: <strong>{currentSendExam.exam_date}</strong>
                    </div>
                  )}
                </div>

                {/* Delivery Counters */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Enrolled</div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{currentExamDeliveryStats.total}</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.68rem", color: "#059669", textTransform: "uppercase", fontWeight: 700 }}>Delivered</div>
                    <div style={{ fontSize: "1rem", fontWeight: 800, color: "#059669" }}>{currentExamDeliveryStats.sent}</div>
                  </div>
                  {currentExamDeliveryStats.failed > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.68rem", color: "#dc2626", textTransform: "uppercase", fontWeight: 700 }}>Failed</div>
                      <div style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>{currentExamDeliveryStats.failed}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mode Selector: 1. Multiple Students Batch  |  2. Individual Student  |  3. Compiled Exam */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              padding: "1.25rem",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Mail size={16} style={{ color: "var(--primary, #28166f)" }} />
                <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>
                  Select Distribution Method:
                </span>
              </div>

              {/* Mode Toggle Pills */}
              <div
                style={{
                  display: "inline-flex",
                  background: "#f1f5f9",
                  padding: "4px",
                  borderRadius: "10px",
                  gap: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => setSendMode("multiple")}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "7px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: sendMode === "multiple" ? "#ffffff" : "transparent",
                    color: sendMode === "multiple" ? "var(--primary, #28166f)" : "#64748b",
                    boxShadow: sendMode === "multiple" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Multiple Students (Batch)
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode("individual")}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "7px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: sendMode === "individual" ? "#ffffff" : "transparent",
                    color: sendMode === "individual" ? "var(--primary, #28166f)" : "#64748b",
                    boxShadow: sendMode === "individual" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Individual Student
                </button>

                <button
                  type="button"
                  onClick={() => setSendMode("compiled")}
                  style={{
                    padding: "0.45rem 0.9rem",
                    borderRadius: "7px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: sendMode === "compiled" ? "#ffffff" : "transparent",
                    color: sendMode === "compiled" ? "var(--primary, #28166f)" : "#64748b",
                    boxShadow: sendMode === "compiled" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  Compiled Exam Session
                </button>
              </div>
            </div>

            {/* ── MODE 1: MULTIPLE STUDENTS BATCH ─────────────────────────── */}
            {sendMode === "multiple" && (
              <div>
                {/* Batch Action Bar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "#f8fafc",
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    marginBottom: "1rem",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleToggleSelectAllRecipients}
                      style={{ fontSize: "0.8rem", fontWeight: 700 }}
                    >
                      {selectedRecipientIds.size === currentSendExamSubs.length ? (
                        <>
                          <Square size={14} style={{ marginRight: "4px" }} /> Deselect All
                        </>
                      ) : (
                        <>
                          <CheckSquare size={14} style={{ marginRight: "4px" }} /> Select All (
                          {currentSendExamSubs.length})
                        </>
                      )}
                    </button>

                    <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                      <strong>{selectedRecipientIds.size}</strong> of {currentSendExamSubs.length} recipients selected
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSendBatchStudentsEmail(Array.from(selectedRecipientIds))}
                      disabled={selectedRecipientIds.size === 0 || isSendingBatch}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        padding: "0.45rem 1rem",
                      }}
                    >
                      {isSendingBatch ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" /> Distributing...
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Send Results to Selected ({selectedRecipientIds.size})
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Recipients Table */}
                {currentSendExamSubs.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "#64748b",
                      fontSize: "0.85rem",
                    }}
                  >
                    No student submissions recorded for this examination.
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
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
                          <th style={{ width: "40px", padding: "0.65rem 0.75rem", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={
                                currentSendExamSubs.length > 0 &&
                                selectedRecipientIds.size === currentSendExamSubs.length
                              }
                              onChange={handleToggleSelectAllRecipients}
                            />
                          </th>
                          <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Student Recipient</th>
                          <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Registered Institutional Email</th>
                          <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Raw Score</th>
                          <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>PH Grade</th>
                          <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700 }}>Sending Status</th>
                          <th style={{ padding: "0.65rem 1rem", color: "#475569", fontWeight: 700, textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentSendExamSubs.map((sub, idx) => {
                          const matched = rosterMap.get(sub.student_id.toLowerCase());
                          const studentName = matched ? matched.name : `Student ${sub.student_id}`;
                          const email = getStudentEmail(sub.student_id, matched);
                          const trans = calculateTransmutedGrade(sub.score, currentSendTotalItems);
                          const isSelected = selectedRecipientIds.has(sub.student_id);
                          const logKey = `${currentSendExam?.id}_${sub.student_id}`;
                          const log = emailLogs[logKey];

                          return (
                            <tr
                              key={sub.id}
                              style={{
                                borderBottom: "1px solid #f1f5f9",
                                backgroundColor: isSelected
                                  ? "var(--primary-light-surface, #f5f3ff)"
                                  : idx % 2 === 0
                                    ? "#ffffff"
                                    : "#f8fafc",
                              }}
                            >
                              <td style={{ padding: "0.65rem 0.75rem", textAlign: "center" }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleRecipient(sub.student_id)}
                                />
                              </td>

                              <td style={{ padding: "0.65rem 1rem" }}>
                                <div style={{ fontWeight: 700, color: "#0f172a" }}>{studentName}</div>
                                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>ID: {sub.student_id}</div>
                              </td>

                              <td style={{ padding: "0.65rem 1rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <Mail size={13} style={{ color: "var(--primary, #28166f)" }} />
                                  <span style={{ fontWeight: 600, color: "#1e293b" }}>{email}</span>
                                </div>
                              </td>

                              <td style={{ padding: "0.65rem 1rem", fontWeight: 700, color: "#0f172a" }}>
                                {sub.score} / {currentSendTotalItems}
                              </td>

                              <td style={{ padding: "0.65rem 1rem" }}>
                                <span
                                  style={{
                                    background: trans.status === "Passed" ? "#ecfdf5" : "#fef2f2",
                                    color: trans.status === "Passed" ? "#059669" : "#dc2626",
                                    border: trans.status === "Passed" ? "1px solid #a7f3d0" : "1px solid #fecaca",
                                    padding: "0.2rem 0.5rem",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: 800,
                                  }}
                                >
                                  {trans.grade} ({trans.percentage}%)
                                </span>
                              </td>

                              <td style={{ padding: "0.65rem 1rem" }}>
                                {log?.status === "sent" ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#059669",
                                      fontWeight: 700,
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    <CheckCircle2 size={13} /> Sent ({log.timestamp || "Delivered"})
                                  </span>
                                ) : log?.status === "failed" ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#dc2626",
                                      fontWeight: 700,
                                      fontSize: "0.78rem",
                                    }}
                                    title={log.error}
                                  >
                                    <AlertTriangle size={13} /> Failed: {log.error || "Delivery Error"}
                                  </span>
                                ) : log?.status === "pending" ? (
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "4px",
                                      color: "#d97706",
                                      fontWeight: 700,
                                      fontSize: "0.78rem",
                                    }}
                                  >
                                    <Clock size={13} className="animate-spin" /> Sending...
                                  </span>
                                ) : (
                                  <span style={{ color: "#94a3b8", fontSize: "0.78rem", fontWeight: 500 }}>
                                    Not Sent
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      if (currentSendExam) {
                                        setPreviewModalRecord(buildStudentEmailRecord(currentSendExam, sub, sub.student_id));
                                      }
                                    }}
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.25rem 0.55rem",
                                      borderRadius: "6px",
                                    }}
                                    title="Preview exact student email notification"
                                  >
                                    <Eye size={12} style={{ marginRight: "3px" }} /> Preview
                                  </button>

                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => {
                                      if (currentSendExam) {
                                        handleSendSingleStudentEmail(sub.student_id, currentSendExam, sub);
                                      }
                                    }}
                                    style={{
                                      fontSize: "0.75rem",
                                      padding: "0.25rem 0.55rem",
                                      borderRadius: "6px",
                                      background: log?.status === "sent" ? "#ecfdf5" : "var(--primary-light-surface, #f5f3ff)",
                                      border: log?.status === "sent" ? "1px solid #a7f3d0" : "1px solid var(--primary-light-border, #ddd6fe)",
                                      color: log?.status === "sent" ? "#059669" : "var(--primary, #28166f)",
                                      fontWeight: 700,
                                    }}
                                  >
                                    <Send size={11} style={{ marginRight: "3px" }} />
                                    {log?.status === "sent" ? "Resend" : log?.status === "failed" ? "Retry" : "Send"}
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

            {/* ── MODE 2: INDIVIDUAL STUDENT RESULT EMAIL ─────────────────── */}
            {sendMode === "individual" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: "#475569",
                      display: "block",
                      marginBottom: "6px",
                    }}
                  >
                    Select Student to Send Result:
                  </label>
                  <select
                    className="form-input"
                    value={selectedIndividualStudentId}
                    onChange={(e) => setSelectedIndividualStudentId(e.target.value)}
                    style={{
                      width: "100%",
                      maxWidth: "460px",
                      height: "40px",
                      fontSize: "0.85rem",
                      background: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      color: "#0f172a",
                    }}
                  >
                    {currentSendExamSubs.map((sub) => {
                      const matched = rosterMap.get(sub.student_id.toLowerCase());
                      const name = matched ? matched.name : `Student ${sub.student_id}`;
                      const trans = calculateTransmutedGrade(sub.score, currentSendTotalItems);
                      return (
                        <option key={sub.student_id} value={sub.student_id}>
                          {name} (ID: {sub.student_id}) — Score: {sub.score}/{currentSendTotalItems} ({trans.grade})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Individual Student Result Review Card */}
                {(() => {
                  const targetSub = currentSendExamSubs.find((s) => s.student_id === selectedIndividualStudentId);
                  if (!targetSub || !currentSendExam) {
                    return (
                      <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                        Please select a student from the dropdown above.
                      </div>
                    );
                  }

                  const matched = rosterMap.get(targetSub.student_id.toLowerCase());
                  const studentName = matched ? matched.name : `Student ${targetSub.student_id}`;
                  const studentEmail = getStudentEmail(targetSub.student_id, matched);
                  const trans = calculateTransmutedGrade(targetSub.score, currentSendTotalItems);
                  const logKey = `${currentSendExam.id}_${targetSub.student_id}`;
                  const log = emailLogs[logKey];

                  return (
                    <div
                      style={{
                        background: "#f8fbff",
                        border: "1px solid var(--primary-light-border, #ddd6fe)",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      {/* Verification Banner */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: "0.75rem",
                          borderBottom: "1px solid var(--primary-light-border, #ddd6fe)",
                          paddingBottom: "1rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <ShieldCheck size={20} style={{ color: "#059669" }} />
                          <div>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                              Verified 1-to-1 Result Association
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                              Student, examination, answers, score, and recipient email are validated.
                            </div>
                          </div>
                        </div>

                        <div>
                          {log?.status === "sent" ? (
                            <span className="badge" style={{ background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", fontWeight: 700 }}>
                              <CheckCircle2 size={13} style={{ marginRight: "4px" }} /> Result Sent ({log.timestamp})
                            </span>
                          ) : log?.status === "failed" ? (
                            <span className="badge" style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", fontWeight: 700 }}>
                              <AlertTriangle size={13} style={{ marginRight: "4px" }} /> Delivery Failed
                            </span>
                          ) : (
                            <span className="badge" style={{ background: "var(--primary-light-surface, #f5f3ff)", color: "var(--primary, #28166f)", border: "1px solid var(--primary-light-border, #ddd6fe)", fontWeight: 700 }}>
                              Ready to Send
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Student Details Grid */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                          gap: "1rem",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Student Full Name</div>
                          <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{studentName}</div>
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>ID: {targetSub.student_id}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Registered Gmail / Email</div>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--primary, #28166f)", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Mail size={14} /> {studentEmail}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#059669" }}>✓ Auto-Resolved from System Roster</div>
                        </div>

                        <div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Examination Score</div>
                          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                            {targetSub.score} / {currentSendTotalItems}{" "}
                            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>({trans.percentage}%)</span>
                          </div>
                          <div style={{ fontSize: "0.78rem", color: trans.status === "Passed" ? "#059669" : "#dc2626", fontWeight: 700 }}>
                            {trans.grade} ({trans.remarks})
                          </div>
                        </div>
                      </div>

                      {/* Send Actions */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "0.75rem",
                          borderTop: "1px solid var(--primary-light-border, #ddd6fe)",
                          paddingTop: "1rem",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setPreviewModalRecord(buildStudentEmailRecord(currentSendExam, targetSub, targetSub.student_id))}
                          style={{ fontSize: "0.82rem", fontWeight: 700 }}
                        >
                          <Eye size={14} style={{ marginRight: "4px" }} /> Preview Email Notification
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleSendSingleStudentEmail(targetSub.student_id, currentSendExam, targetSub)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            padding: "0.5rem 1.25rem",
                          }}
                        >
                          <Send size={14} /> Send Result to {studentName.split(" ")[0]}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ── MODE 3: COMPILED EXAMINATION RESULTS EMAIL ───────────────── */}
            {sendMode === "compiled" && (
              <div
                style={{
                  background: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 4px 0" }}>
                    Compiled Examination Results Distribution
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                    Distribute verified examination results to ALL {currentSendExamSubs.length} matching students belonging to this examination session simultaneously.
                  </p>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "1rem",
                    background: "#ffffff",
                    padding: "1rem",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Examination Title</div>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{currentSendExam?.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Test Length</div>
                    <div style={{ fontWeight: 800, color: "var(--primary, #28166f)", fontSize: "0.95rem" }}>{currentSendTotalItems} Test Items</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Compiled Candidates</div>
                    <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>{currentSendExamSubs.length} Scanned Students</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>Current Status</div>
                    <div style={{ fontWeight: 800, color: currentExamDeliveryStats.sent > 0 ? "#059669" : "#64748b", fontSize: "0.95rem" }}>
                      {currentExamDeliveryStats.sent} of {currentSendExamSubs.length} Sent
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleSendBatchStudentsEmail(currentSendExamSubs.map((s) => s.student_id))}
                    disabled={currentSendExamSubs.length === 0 || isSendingBatch}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.9rem",
                      fontWeight: 800,
                      padding: "0.6rem 1.5rem",
                    }}
                  >
                    {isSendingBatch ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" /> Distributing Results...
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Send Compiled Results to All {currentSendExamSubs.length} Students
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* INTERACTIVE EMAIL PREVIEW MODAL                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {previewModalRecord && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "1rem",
          }}
          onClick={() => setPreviewModalRecord(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "580px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              border: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Mail size={20} style={{ color: "var(--primary, #28166f)" }} />
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  Student Email Notification Preview
                </h3>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-icon-only btn-sm"
                onClick={() => setPreviewModalRecord(null)}
                style={{ borderRadius: "50%", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Email Envelope Header */}
            <div
              style={{
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
                padding: "0.85rem 1rem",
                fontSize: "0.82rem",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div>
                <strong style={{ color: "#64748b" }}>From: </strong>
                <span>SRCB Examination & Grading Portal &lt;grading-noreply@srcb.edu.ph&gt;</span>
              </div>
              <div>
                <strong style={{ color: "#64748b" }}>To: </strong>
                <span style={{ fontWeight: 700, color: "var(--primary, #28166f)" }}>
                  {previewModalRecord.studentName} &lt;{previewModalRecord.studentEmail}&gt;
                </span>
              </div>
              <div>
                <strong style={{ color: "#64748b" }}>Subject: </strong>
                <span style={{ fontWeight: 700 }}>
                  Official Examination Result: {previewModalRecord.examTitle} ({previewModalRecord.examType})
                </span>
              </div>
            </div>

            {/* Email Body Preview Card */}
            <div
              style={{
                border: "1px solid var(--primary-light-border, #ddd6fe)",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ textAlign: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.75rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", color: "var(--primary, #28166f)", fontWeight: 800 }}>
                  ST. RITA'S COLLEGE OF BALINGASAG
                </h4>
                <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Higher Education Department • Official Grade Release</div>
              </div>

              <p style={{ fontSize: "0.85rem", color: "#334155", margin: 0, lineHeight: 1.5 }}>
                Dear <strong>{previewModalRecord.studentName}</strong> (Student ID: {previewModalRecord.studentId}),
                <br />
                Your optical mark recognition (OMR) examination results for <strong>{previewModalRecord.examTitle}</strong> have been officially graded and verified.
              </p>

              {/* Score Highlight Box */}
              <div
                style={{
                  background: "#f0f9ff",
                  border: "1px solid #bae6fd",
                  borderRadius: "10px",
                  padding: "1rem",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                  textAlign: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.7rem", color: "#0369a1", textTransform: "uppercase", fontWeight: 700 }}>Raw Score Obtained</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#0c4a6e" }}>
                    {previewModalRecord.score} / {previewModalRecord.totalQuestions}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.7rem", color: "#0369a1", textTransform: "uppercase", fontWeight: 700 }}>Transmuted Grade</div>
                  <div style={{ fontSize: "1.35rem", fontWeight: 900, color: previewModalRecord.status === "Passed" ? "#059669" : "#dc2626" }}>
                    {previewModalRecord.grade} ({previewModalRecord.percentage}%)
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.4 }}>
                Academic Evaluation: <strong>{previewModalRecord.status} ({previewModalRecord.remarks})</strong>
                <br />
                Test Items Configured: <strong>{previewModalRecord.totalQuestions} items</strong>
              </div>

              <div
                style={{
                  fontSize: "0.72rem",
                  color: "#94a3b8",
                  borderTop: "1px solid #f1f5f9",
                  paddingTop: "0.6rem",
                  textAlign: "center",
                }}
              >
                This is an automated notification from the SRCB Examination Results Management System. Confidential student record.
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPreviewModalRecord(null)}
                style={{ fontSize: "0.85rem" }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { TeacherExamCompiler as ExaminationResultsManagement };
export default TeacherExamCompiler;
