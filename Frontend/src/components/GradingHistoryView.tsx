import React, { useState, useMemo } from "react";
import {
  History,
  Search,
  Filter,
  Eye,
  Trash2,
  BookOpen,
  GraduationCap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowUpDown,
  FileCheck,
} from "lucide-react";
import type { Exam, Submission, StudentRosterEntry, AuthUser } from "../types";
import { calculateTransmutedGrade } from "../utils/excelUtils";

export interface GradingHistoryViewProps {
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  currentUser?: AuthUser | null;
  onSelectSubmission: (submission: Submission) => void;
  onDeleteGradingRecord?: (examId: string) => void;
  formatDate: (iso: string) => string;
  addToast?: (type: any, message: string) => void;
}

export type HistorySortOption = "recent" | "oldest" | "date" | "title" | "students";
export type HistoryStatusFilter = "All" | "Completed" | "Processed" | "Reviewed" | "Incomplete";

export const GradingHistoryView: React.FC<GradingHistoryViewProps> = ({
  exams,
  submissions,
  roster,
  currentUser,
  onSelectSubmission,
  onDeleteGradingRecord,
  formatDate,
  addToast,
}) => {
  // Search, Filter, and Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamType, setSelectedExamType] = useState("All");
  const [selectedProgram, setSelectedProgram] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState<HistoryStatusFilter>("All");
  const [sortBy, setSortBy] = useState<HistorySortOption>("recent");

  // Inspection Modal State
  const [inspectingExamId, setInspectingExamId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [examToDelete, setExamToDelete] = useState<{ id: string; name: string } | null>(null);

  // Helper map for roster lookup
  const rosterMap = useMemo(() => {
    const map = new Map<string, StudentRosterEntry>();
    roster.forEach((r) => map.set(r.student_id.toLowerCase(), r));
    return map;
  }, [roster]);

  // Role-based examination filtering: Teachers only see their assigned courses
  const roleFilteredExams = useMemo(() => {
    if (!currentUser || currentUser.role === "admin" || currentUser.role === "dean") {
      return exams;
    }
    if (currentUser.role === "teacher") {
      const teacherExams = exams.filter(
        (e) =>
          !e.instructor_name ||
          e.instructor_name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
          currentUser.name.toLowerCase().includes((e.instructor_name || "").toLowerCase()),
      );
      return teacherExams.length > 0 ? teacherExams : exams;
    }
    if (currentUser.role === "programme-head") {
      const prog = currentUser.programme || "BSIT";
      return exams.filter((e) => !e.program || e.program.toLowerCase() === prog.toLowerCase());
    }
    return exams;
  }, [exams, currentUser]);

  // Unique Filter Options
  const examTypes = useMemo(() => {
    const set = new Set<string>();
    roleFilteredExams.forEach((e) => {
      if (e.exam_type) set.add(e.exam_type);
    });
    return ["All", ...Array.from(set).sort()];
  }, [roleFilteredExams]);

  const programs = useMemo(() => {
    const set = new Set<string>();
    roleFilteredExams.forEach((e) => {
      if (e.program) set.add(e.program);
      if (e.course_code) set.add(e.course_code);
    });
    return ["All", ...Array.from(set).sort()];
  }, [roleFilteredExams]);

  // Historical Records Data Aggregation
  const gradingHistoryRecords = useMemo(() => {
    return roleFilteredExams.map((exam) => {
      const examSubs = submissions.filter((s) => s.exam_id === exam.id);
      const totalItems = exam.num_items || Object.keys(exam.answer_key || {}).length || 50;
      const totalGraded = examSubs.length;

      // Find latest submission timestamp
      const latestSub = examSubs.reduce((latest, curr) => {
        if (!latest) return curr;
        return new Date(curr.created_at || 0) > new Date(latest.created_at || 0) ? curr : latest;
      }, null as Submission | null);

      const oldestSub = examSubs.reduce((oldest, curr) => {
        if (!oldest) return curr;
        return new Date(curr.created_at || 0) < new Date(oldest.created_at || 0) ? curr : oldest;
      }, null as Submission | null);

      const processedTimestamp = latestSub?.created_at || exam.exam_date || exam.created_at || new Date().toISOString();
      const oldestTimestamp = oldestSub?.created_at || processedTimestamp;

      // Score Metrics
      const totalScore = examSubs.reduce((sum, s) => sum + s.score, 0);
      const meanScore = totalGraded > 0 ? Number((totalScore / totalGraded).toFixed(1)) : 0;
      const avgPercentage = totalGraded > 0 && totalItems > 0 ? Math.round((meanScore / totalItems) * 100) : 0;

      const passedSubs = examSubs.filter((s) => {
        const trans = calculateTransmutedGrade(s.score, totalItems);
        return trans.status === "Passed";
      });
      const passRate = totalGraded > 0 ? Math.round((passedSubs.length / totalGraded) * 100) : 0;

      const minScore = totalGraded > 0 ? Math.min(...examSubs.map((s) => s.score)) : 0;
      const maxScore = totalGraded > 0 ? Math.max(...examSubs.map((s) => s.score)) : 0;

      const flaggedCount = examSubs.filter((s) => {
        if (!s.answers) return false;
        return Object.values(s.answers).some((ans) => ans?.is_ambiguous);
      }).length;

      // Determine Historical Grading Status
      let status: "Completed" | "Processed" | "Reviewed" | "Incomplete" = "Processed";
      if (totalGraded === 0) {
        status = "Incomplete";
      } else if (flaggedCount > 0) {
        status = "Reviewed";
      } else if (totalGraded >= 15 || passRate >= 75) {
        status = "Completed";
      }

      return {
        exam,
        submissions: examSubs,
        totalItems,
        totalGraded,
        processedTimestamp,
        oldestTimestamp,
        meanScore,
        avgPercentage,
        passRate,
        minScore,
        maxScore,
        flaggedCount,
        status,
      };
    });
  }, [roleFilteredExams, submissions]);

  // Filter and Search Logic
  const filteredRecords = useMemo(() => {
    return gradingHistoryRecords.filter((rec) => {
      const { exam, status } = rec;

      // Exam Type filter
      if (selectedExamType !== "All" && exam.exam_type !== selectedExamType) {
        return false;
      }

      // Program / Course filter
      if (selectedProgram !== "All") {
        const matchesProg = exam.program === selectedProgram;
        const matchesCode = exam.course_code === selectedProgram;
        if (!matchesProg && !matchesCode) return false;
      }

      // Status filter
      if (selectedStatus !== "All" && status !== selectedStatus) {
        return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = exam.name.toLowerCase().includes(q);
        const matchesSubject = (exam.subject || "").toLowerCase().includes(q);
        const matchesCode = (exam.course_code || "").toLowerCase().includes(q);
        const matchesSection = (exam.section || "").toLowerCase().includes(q);
        const matchesInstructor = (exam.instructor_name || "").toLowerCase().includes(q);
        const matchesType = (exam.exam_type || "").toLowerCase().includes(q);

        if (
          !matchesTitle &&
          !matchesSubject &&
          !matchesCode &&
          !matchesSection &&
          !matchesInstructor &&
          !matchesType
        ) {
          return false;
        }
      }

      return true;
    });
  }, [gradingHistoryRecords, selectedExamType, selectedProgram, selectedStatus, searchQuery]);

  // Sort Records
  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.processedTimestamp).getTime() - new Date(a.processedTimestamp).getTime();
        case "oldest":
          return new Date(a.oldestTimestamp).getTime() - new Date(b.oldestTimestamp).getTime();
        case "date": {
          const dateA = a.exam.exam_date ? new Date(a.exam.exam_date).getTime() : 0;
          const dateB = b.exam.exam_date ? new Date(b.exam.exam_date).getTime() : 0;
          return dateB - dateA;
        }
        case "title":
          return a.exam.name.localeCompare(b.exam.name);
        case "students":
          return b.totalGraded - a.totalGraded;
        default:
          return 0;
      }
    });
  }, [filteredRecords, sortBy]);

  // Overall Historical Summary Stats
  const overallStats = useMemo(() => {
    const totalExams = gradingHistoryRecords.length;
    const totalSheets = gradingHistoryRecords.reduce((acc, curr) => acc + curr.totalGraded, 0);
    const completedCount = gradingHistoryRecords.filter((r) => r.status === "Completed").length;
    const overallPassed = gradingHistoryRecords.reduce((acc, curr) => {
      return (
        acc +
        curr.submissions.filter((s) => {
          const trans = calculateTransmutedGrade(s.score, curr.totalItems);
          return trans.status === "Passed";
        }).length
      );
    }, 0);
    const overallPassRate = totalSheets > 0 ? Math.round((overallPassed / totalSheets) * 100) : 0;

    return {
      totalExams,
      totalSheets,
      completedCount,
      overallPassRate,
    };
  }, [gradingHistoryRecords]);

  // Active Inspection Record
  const inspectedRecord = useMemo(() => {
    if (!inspectingExamId) return null;
    return gradingHistoryRecords.find((r) => r.exam.id === inspectingExamId) || null;
  }, [inspectingExamId, gradingHistoryRecords]);

  // Handle Delete Confirmation Workflow
  const handleConfirmDelete = () => {
    if (!examToDelete) return;
    if (onDeleteGradingRecord) {
      onDeleteGradingRecord(examToDelete.id);
    }
    if (addToast) {
      addToast("success", `Grading history record for "${examToDelete.name}" has been removed.`);
    }
    setExamToDelete(null);
    if (inspectingExamId === examToDelete.id) {
      setInspectingExamId(null);
    }
  };

  const getStatusBadgeStyle = (status: "Completed" | "Processed" | "Reviewed" | "Incomplete") => {
    switch (status) {
      case "Completed":
        return {
          background: "#ecfdf5",
          color: "#059669",
          border: "1px solid #a7f3d0",
          icon: <CheckCircle2 size={13} />,
        };
      case "Reviewed":
        return {
          background: "#fef3c7",
          color: "#d97706",
          border: "1px solid #fde68a",
          icon: <AlertTriangle size={13} />,
        };
      case "Processed":
        return {
          background: "#eff6ff",
          color: "#0062ff",
          border: "1px solid #bfdbfe",
          icon: <FileCheck size={13} />,
        };
      case "Incomplete":
        return {
          background: "#f8fafc",
          color: "#64748b",
          border: "1px solid #cbd5e1",
          icon: <Clock size={13} />,
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. SECTION HEADER BANNER (NO EXPORT BUTTONS)                         */}
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
              background: "#f8fafc",
              color: "#0062ff",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <History size={26} />
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
                  fontSize: "0.72rem",
                }}
              >
                Historical Records Audit
              </span>
              {currentUser && (
                <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
                  Faculty: {currentUser.name}
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
              Grading History
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                color: "#64748b",
                margin: "0.2rem 0 0 0",
              }}
            >
              Historical log of previously processed and graded examination activities. Inspect details or manage past records.
            </p>
          </div>
        </div>

        {/* Global Statistics Badges */}
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
                fontSize: "0.68rem",
                color: "#64748b",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Graded Exams
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
              {overallStats.totalExams}
            </div>
          </div>
          <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "#64748b",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Processed Sheets
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0062ff" }}>
              {overallStats.totalSheets}
            </div>
          </div>
          <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
          <div>
            <div
              style={{
                fontSize: "0.68rem",
                color: "#64748b",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              Historical Pass Rate
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#059669" }}>
              {overallStats.overallPassRate}%
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. SEARCH, FILTER & SORT BAR (EXPORT-FREE)                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
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
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
              Search & Filter Past Grading Activities
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", flex: "1 1 300px" }}>
            <div style={{ position: "relative", flex: "1 1 260px" }}>
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
                placeholder="Search examination title, course code, subject, or section..."
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

            {/* Sorting Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <ArrowUpDown size={14} style={{ color: "#64748b" }} />
              <select
                className="form-input"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as HistorySortOption)}
                style={{
                  height: "38px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "#f8fafc",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#0f172a",
                }}
              >
                <option value="recent">Sort: Most Recent Grading</option>
                <option value="oldest">Sort: Oldest Grading</option>
                <option value="date">Sort: Examination Date</option>
                <option value="title">Sort: Examination Title (A-Z)</option>
                <option value="students">Sort: Total Students Graded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filter Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
          }}
        >
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
              Examination Type
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
                  {type === "All" ? "All Examination Types" : type}
                </option>
              ))}
            </select>
          </div>

          {/* Program / Course Code Filter */}
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
              Program / Course
            </label>
            <select
              className="form-input"
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
              style={{
                height: "36px",
                fontSize: "0.82rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
            >
              {programs.map((prog) => (
                <option key={prog} value={prog}>
                  {prog === "All" ? "All Programs & Courses" : prog}
                </option>
              ))}
            </select>
          </div>

          {/* Grading Status Filter */}
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
              Grading Status
            </label>
            <select
              className="form-input"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as HistoryStatusFilter)}
              style={{
                height: "36px",
                fontSize: "0.82rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                color: "#0f172a",
              }}
            >
              <option value="All">All Grading Statuses</option>
              <option value="Completed">Completed (Finalized)</option>
              <option value="Processed">Processed (Active)</option>
              <option value="Reviewed">Reviewed (Has Ambiguity)</option>
              <option value="Incomplete">Incomplete (No Submissions)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. GRADING HISTORY LIST TABLE                                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {sortedRecords.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3.5rem 1.5rem",
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
          }}
        >
          <History size={44} style={{ color: "#94a3b8", marginBottom: "0.75rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>
            No Historical Grading Records Found
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.85rem", maxWidth: "420px", margin: "0 auto" }}>
            No examinations match the selected search or filter criteria. Clear filters or process OMR answer sheets in Exams & Grading.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem", textAlign: "left" }}>
              <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Examination & Course</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Academic Session</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Configured Items</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Graded Submissions</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Mean Score & Pass Rate</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Grading Status</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700 }}>Processed Date & Time</th>
                  <th style={{ padding: "0.8rem 1rem", color: "#475569", fontWeight: 700, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedRecords.map((rec, idx) => {
                  const {
                    exam,
                    totalItems,
                    totalGraded,
                    processedTimestamp,
                    meanScore,
                    avgPercentage,
                    passRate,
                    status,
                  } = rec;
                  const statusStyle = getStatusBadgeStyle(status);

                  return (
                    <tr
                      key={exam.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#ffffff" : "#fbfcfe",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Examination & Course */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "8px",
                              background: "#eff6ff",
                              color: "#0062ff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              marginTop: "2px",
                            }}
                          >
                            <BookOpen size={18} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.9rem" }}>
                              {exam.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                              {exam.course_code ? `[${exam.course_code}] ` : ""}
                              {exam.subject || "College Subject"}
                              {exam.section ? ` • Sec ${exam.section}` : ""}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Academic Session */}
                      <td style={{ padding: "0.85rem 1rem", color: "#475569", fontSize: "0.8rem" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>
                          {exam.exam_type || "Examination"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          AY {exam.academic_year || "2025-2026"} ({exam.semester || "1st Sem"})
                        </div>
                      </td>

                      {/* Configured Items (Variable Item Counts) */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: "#0062ff",
                            background: "#eff6ff",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid #bfdbfe",
                            fontSize: "0.8rem",
                            display: "inline-block",
                          }}
                        >
                          {totalItems} Items
                        </span>
                      </td>

                      {/* Graded Submissions */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <GraduationCap size={15} style={{ color: "#0062ff" }} />
                          <span style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.88rem" }}>
                            {totalGraded}
                          </span>
                          <span style={{ color: "#64748b", fontSize: "0.75rem" }}>sheets</span>
                        </div>
                      </td>

                      {/* Mean Score & Pass Rate */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                          {meanScore} / {totalItems}{" "}
                          <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 500 }}>
                            ({avgPercentage}%)
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            color: passRate >= 75 ? "#059669" : "#dc2626",
                            marginTop: "2px",
                          }}
                        >
                          Pass Rate: {passRate}%
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "0.25rem 0.65rem",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            background: statusStyle.background,
                            color: statusStyle.color,
                            border: statusStyle.border,
                          }}
                        >
                          {statusStyle.icon}
                          {status}
                        </span>
                      </td>

                      {/* Processed Timestamp */}
                      <td style={{ padding: "0.85rem 1rem", color: "#475569", fontSize: "0.78rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={12} style={{ color: "#94a3b8" }} />
                          <span>{formatDate(processedTimestamp)}</span>
                        </div>
                        {exam.exam_date && (
                          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                            Exam Date: {exam.exam_date}
                          </div>
                        )}
                      </td>

                      {/* Action Buttons: Inspect and Delete (NO EXPORTS) */}
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setInspectingExamId(exam.id)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              padding: "0.35rem 0.75rem",
                            }}
                            title="Inspect detailed historical grading breakdown"
                          >
                            <Eye size={13} /> Inspect
                          </button>

                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setExamToDelete({ id: exam.id, name: exam.name })}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              borderRadius: "6px",
                              padding: "0.35rem 0.65rem",
                              color: "#dc2626",
                              border: "1px solid #fecaca",
                              background: "#ffffff",
                            }}
                            title="Delete this grading record from history"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. INSPECT GRADING RECORD MODAL (EXPORT-FREE)                       */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {inspectedRecord && (
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
          onClick={() => setInspectingExamId(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
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
                alignItems: "flex-start",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: "1rem",
                gap: "1rem",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    className="badge"
                    style={{
                      background: "#eff6ff",
                      color: "#0062ff",
                      border: "1px solid #bfdbfe",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                    }}
                  >
                    {inspectedRecord.exam.exam_type || "Examination"}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    AY {inspectedRecord.exam.academic_year || "2025-2026"} (
                    {inspectedRecord.exam.semester || "1st Sem"})
                  </span>
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  {inspectedRecord.exam.name}
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "4px" }}>
                  Course: <strong>{inspectedRecord.exam.course_code || "N/A"}</strong> —{" "}
                  {inspectedRecord.exam.subject || "Subject"} • Section:{" "}
                  <strong>{inspectedRecord.exam.section || "All"}</strong> • Instructor:{" "}
                  <strong>{inspectedRecord.exam.instructor_name || "Faculty Member"}</strong>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-icon-only btn-sm"
                onClick={() => setInspectingExamId(null)}
                style={{ borderRadius: "50%", padding: "4px" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Statistics Summary Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  background: "#f8fafc",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Test Items
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0062ff" }}>
                  {inspectedRecord.totalItems} Items
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Graded Sheets
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                  {inspectedRecord.totalGraded}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Mean Score
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                  {inspectedRecord.meanScore}/{inspectedRecord.totalItems}{" "}
                  <span style={{ fontSize: "0.75rem", color: "#64748b" }}>({inspectedRecord.avgPercentage}%)</span>
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Class Pass Rate
                </div>
                <div
                  style={{
                    fontSize: "1.15rem",
                    fontWeight: 800,
                    color: inspectedRecord.passRate >= 75 ? "#059669" : "#dc2626",
                  }}
                >
                  {inspectedRecord.passRate}%
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  padding: "0.75rem 1rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: "0.68rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                  Score Range
                </div>
                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                  {inspectedRecord.minScore} — {inspectedRecord.maxScore}
                </div>
              </div>
            </div>

            {/* Graded Student Answer Sheets Roster */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.75rem",
                }}
              >
                <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Graded Student Answer Sheets ({inspectedRecord.submissions.length})
                </h4>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                  Last Graded Activity: {formatDate(inspectedRecord.processedTimestamp)}
                </span>
              </div>

              {inspectedRecord.submissions.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    color: "#64748b",
                    fontSize: "0.85rem",
                  }}
                >
                  No student answer sheets recorded for this examination session.
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
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700 }}>Student</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700 }}>Score</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700 }}>Equiv %</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700 }}>PH CHED Grade</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700 }}>Status</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700 }}>Date Graded</th>
                        <th style={{ padding: "0.6rem 0.85rem", color: "#475569", fontWeight: 700, textAlign: "right" }}>Inspect Bubble</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectedRecord.submissions.map((sub, idx) => {
                        const matched = rosterMap.get((sub.student_id || "").toLowerCase());
                        const studentName = matched ? matched.name : `Student ${sub.student_id}`;
                        const trans = calculateTransmutedGrade(sub.score, inspectedRecord.totalItems);
                        const hasAmbiguous =
                          sub.answers &&
                          Object.values(sub.answers).some((a) => a?.is_ambiguous);

                        return (
                          <tr
                            key={sub.id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              background: hasAmbiguous ? "#fef2f2" : idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            }}
                          >
                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <div style={{ fontWeight: 700, color: "#0f172a" }}>{studentName}</div>
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                                ID: {sub.student_id}{" "}
                                {hasAmbiguous && (
                                  <span style={{ color: "#dc2626", fontWeight: 700, marginLeft: "4px" }}>
                                    • Ambiguous Mark
                                  </span>
                                )}
                              </div>
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem", fontWeight: 800, color: "#0f172a" }}>
                              {sub.score} / {inspectedRecord.totalItems}
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem", fontWeight: 700, color: "#0f172a" }}>
                              {trans.percentage}%
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  background: trans.status === "Passed" ? "#ecfdf5" : "#fef2f2",
                                  color: trans.status === "Passed" ? "#059669" : "#dc2626",
                                  border: trans.status === "Passed" ? "1px solid #a7f3d0" : "1px solid #fecaca",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: 800,
                                }}
                              >
                                {trans.grade} ({trans.remarks})
                              </span>
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontWeight: 700,
                                  fontSize: "0.78rem",
                                  color: trans.status === "Passed" ? "#059669" : "#dc2626",
                                }}
                              >
                                {trans.status === "Passed" ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                                {trans.status}
                              </span>
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem", fontSize: "0.75rem", color: "#64748b" }}>
                              {sub.created_at ? formatDate(sub.created_at) : "Recorded"}
                            </td>

                            <td style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  onSelectSubmission(sub);
                                  setInspectingExamId(null);
                                }}
                                style={{
                                  fontSize: "0.75rem",
                                  padding: "0.25rem 0.6rem",
                                  borderRadius: "6px",
                                }}
                                title="Inspect student bubble sheet markings"
                              >
                                <Eye size={12} style={{ marginRight: "3px" }} /> Sheet
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setInspectingExamId(null)}
                style={{ fontSize: "0.85rem" }}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. DELETE RECORD CONFIRMATION DIALOG                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {examToDelete && (
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
          onClick={() => setExamToDelete(null)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "500px",
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
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "#fef2f2",
                  color: "#dc2626",
                  border: "1px solid #fecaca",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 4px 0", color: "#0f172a" }}>
                  Delete this grading record?
                </h3>
                <p style={{ fontSize: "0.85rem", color: "#475569", margin: 0, lineHeight: 1.45 }}>
                  Are you sure you want to remove the grading history for <strong>{examToDelete.name}</strong>?
                </p>
              </div>
            </div>

            {/* Explanatory Callout */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "0.85rem 1rem",
                fontSize: "0.78rem",
                color: "#64748b",
                lineHeight: 1.45,
              }}
            >
              <strong>Data Relationship Notice:</strong> Removing this grading activity entry clears the historical record from your history view. Underlying course master definitions, student enrollment rosters, and exam templates remain safe and intact.
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setExamToDelete(null)}
                style={{ fontSize: "0.85rem", fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "1px solid #b91c1c",
                  padding: "0.5rem 1.15rem",
                  borderRadius: "8px",
                }}
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradingHistoryView;
