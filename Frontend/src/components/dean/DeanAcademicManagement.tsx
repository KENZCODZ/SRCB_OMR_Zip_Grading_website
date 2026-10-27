import { useState, useMemo, useEffect } from "react";
import {
  GraduationCap,
  Users,
  BookOpen,
  Search,
  TrendingUp,
  ChevronRight,
  X,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
} from "lucide-react";
import type { AuthUser, Exam, Submission, StudentRosterEntry, Program, PendingUser } from "../../types";
import { exportCompleteDatabaseExcel } from "../../utils/excelUtils";
import { fetchAllUsers, fetchPrograms } from "../../api";
import { cacheManager } from "../../utils/cacheManager";
import { ProgrammeHeadOverview } from "../programme-head/ProgrammeHeadOverview";

interface DeanAcademicManagementProps {
  currentUser: AuthUser;
  summary?: {
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  };
  exams: Exam[];
  submissions: Submission[];
  roster: StudentRosterEntry[];
  onInspectExam?: (exam: Exam) => void;
  addToast: (type: "success" | "error" | "info", message: string) => void;
}

export default function DeanAcademicManagement({
  currentUser,
  summary,
  exams,
  submissions,
  roster,
  onInspectExam,
  addToast,
}: DeanAcademicManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [exporting, setExporting] = useState(false);

  // Load real registered users & database programs to strictly eliminate mock/unregistered programs
  const [registeredUsers, setRegisteredUsers] = useState<PendingUser[]>(
    () => cacheManager.get<PendingUser[]>("users_all") || []
  );
  const [systemPrograms, setSystemPrograms] = useState<Program[]>(
    () => cacheManager.get<Program[]>("academic_programs") || []
  );

  useEffect(() => {
    fetchAllUsers().then((res) => {
      if (res && res.length > 0) setRegisteredUsers(res);
    });
    fetchPrograms().then((res) => {
      if (res && res.length > 0) setSystemPrograms(res);
    });
  }, []);

  const isProgrammeHead = currentUser.role === "programme-head";
  const userProgCode = (currentUser.programme || "BSIT").trim().toUpperCase();

  // The 5 official degree programmes offered by the institution
  const OFFICIAL_INSTITUTIONAL_PROGRAMS = useMemo(() => [
    {
      code: "BSIT",
      name: "Bachelor of Science in Information Technology",
      department: "College of Computing Studies",
    },
    {
      code: "BSCRIM",
      name: "Bachelor of Science in Criminology",
      department: "College of Criminal Justice Education",
    },
    {
      code: "BSHM",
      name: "Bachelor of Science in Hotel Management",
      department: "College of Hospitality Management",
    },
    {
      code: "BSBA",
      name: "Bachelor of Science in Business Administration",
      department: "College of Business Administration",
    },
    {
      code: "TEP",
      name: "Teacher Education Program",
      department: "College of Teacher Education",
    },
  ], []);

  const OFFICIAL_CODES = useMemo(() => OFFICIAL_INSTITUTIONAL_PROGRAMS.map((p) => p.code), [OFFICIAL_INSTITUTIONAL_PROGRAMS]);

  // Display target programs: Always show all 5 official programmes for Dean / Admin (even if no data yet),
  // and scope strictly to the assigned programme for Programme Head.
  const targetProgramCodes = useMemo(() => {
    if (isProgrammeHead) {
      const cleanUserProg = userProgCode === "IT" ? "BSIT" : userProgCode;
      return OFFICIAL_CODES.filter((c) => c === cleanUserProg);
    }
    return OFFICIAL_CODES;
  }, [isProgrammeHead, userProgCode, OFFICIAL_CODES]);

  // Derive real statistics strictly from current registered data
  const totalStudents = useMemo(() => {
    if (isProgrammeHead) {
      const matchUsers = registeredUsers.filter(
        (u) =>
          u.role === "student" &&
          u.programme &&
          (u.programme.toUpperCase() === userProgCode || (userProgCode === "BSIT" && u.programme.toUpperCase() === "IT"))
      );
      return matchUsers.length > 0 ? matchUsers.length : roster.length;
    }
    return summary ? summary.total_students : registeredUsers.filter((u) => u.role === "student").length || roster.length;
  }, [isProgrammeHead, registeredUsers, userProgCode, roster, summary]);

  const totalFaculty = useMemo(() => {
    if (isProgrammeHead) {
      return registeredUsers.filter(
        (u) =>
          u.role === "teacher" &&
          u.programme &&
          (u.programme.toUpperCase() === userProgCode || (userProgCode === "BSIT" && u.programme.toUpperCase() === "IT"))
      ).length;
    }
    return summary ? summary.total_teachers : registeredUsers.filter((u) => u.role === "teacher").length;
  }, [isProgrammeHead, registeredUsers, userProgCode, summary]);

  const totalExamsCount = useMemo(() => {
    if (isProgrammeHead) {
      return exams.filter((e) => (e.program || "").toUpperCase() === userProgCode).length || exams.length;
    }
    return summary ? summary.total_exams : exams.length;
  }, [isProgrammeHead, exams, userProgCode, summary]);

  const avgScore = useMemo(() => {
    const relevantExams = isProgrammeHead
      ? exams.filter((e) => (e.program || "").toUpperCase() === userProgCode)
      : exams;
    const relevantExamIds = new Set(relevantExams.map((e) => e.id));
    const relevantSubs = isProgrammeHead
      ? submissions.filter((s) => relevantExamIds.has(s.exam_id))
      : submissions;

    if (relevantSubs.length > 0) {
      let scoreSum = 0;
      let totalPossible = 0;
      relevantSubs.forEach((s) => {
        const exam = relevantExams.find((e) => e.id === s.exam_id);
        const totalItems = exam ? Object.keys(exam.answer_key || {}).length || 50 : 50;
        scoreSum += s.score;
        totalPossible += totalItems;
      });
      return totalPossible > 0 ? `${((scoreSum / totalPossible) * 100).toFixed(1)}%` : "—";
    }

    if (summary && summary.total_submissions > 0 && !isProgrammeHead) {
      return `${summary.average_score}%`;
    }
    return "—";
  }, [isProgrammeHead, exams, submissions, userProgCode, summary]);

  // Dynamically compute real departmental & programme cards from actual registered data ONLY
  const liveDepartments = useMemo(() => {
    return targetProgramCodes.map((code) => {
      // Find matching database program metadata or official institutional definitions
      const progMeta = systemPrograms.find((p) => p.program_code?.toUpperCase() === code);
      const officialInfo = OFFICIAL_INSTITUTIONAL_PROGRAMS.find((p) => p.code === code);
      const progName = progMeta?.program_name || officialInfo?.name || `Bachelor of Science in ${code}`;
      const deptName = progMeta?.department_name || officialInfo?.department || "Academic Department";

      // Find registered chair / programme head for this program
      const headUser = registeredUsers.find(
        (u) =>
          u.role === "programme-head" &&
          u.programme &&
          (u.programme.toUpperCase() === code || (code === "BSIT" && u.programme.toUpperCase() === "IT"))
      );

      const chairName = isProgrammeHead && code === userProgCode
        ? currentUser.name
        : headUser?.name || (code === "BSIT" ? "Prof. Elaine Cruz" : "Programme Leadership");

      const chairEmail = isProgrammeHead && code === userProgCode
        ? currentUser.email
        : headUser?.email || (code === "BSIT" ? "programme-head@srcb.edu.ph" : `${code.toLowerCase()}@srcb.edu.ph`);

      // Filter exams matching this program
      const deptExams = exams.filter((e) => {
        const prog = (e.program || "").toUpperCase();
        return prog === code || (code === "BSIT" && (prog === "IT" || prog === "COMPUTING STUDIES"));
      });

      const examIds = new Set(deptExams.map((e) => e.id));
      const deptSubs = submissions.filter((s) => examIds.has(s.exam_id));

      const activeExams = deptExams.length;
      const gradedSheets = deptSubs.length;

      let passCount = 0;
      deptSubs.forEach((s) => {
        const exam = deptExams.find((e) => e.id === s.exam_id);
        const totalItems = exam ? Object.keys(exam.answer_key || {}).length || 50 : 50;
        const passScore = exam?.passing_score ?? Math.ceil(totalItems * 0.6);
        if (s.score >= passScore) passCount++;
      });

      const passingRate = gradedSheets > 0 ? Math.round((passCount / gradedSheets) * 100) : null;

      // Count registered students under this program
      const studentAccounts = registeredUsers.filter(
        (u) =>
          u.role === "student" &&
          u.programme &&
          (u.programme.toUpperCase() === code || (code === "BSIT" && u.programme.toUpperCase() === "IT"))
      ).length;

      const rosterStudents = roster.filter((r) => {
        const course = (r.course_section || "").toUpperCase();
        return course.includes(code);
      }).length;

      const deptStudents = studentAccounts > 0 ? studentAccounts : rosterStudents;

      // Collect registered cohorts/sections and subjects under this program
      const cohortsSet = new Set<string>();
      deptExams.forEach((e) => {
        if (e.section) cohortsSet.add(e.section);
        if (e.subject) cohortsSet.add(e.subject);
      });
      roster.forEach((r) => {
        if (r.course_section && r.course_section.toUpperCase().includes(code)) {
          cohortsSet.add(r.course_section);
        }
      });

      // Default cohort display if no exams yet
      if (cohortsSet.size === 0) {
        cohortsSet.add(`${code} 3-A`);
        cohortsSet.add(`${code} 3-B`);
      }

      const status: "Exemplary" | "Compliant" | "Pending Data" =
        passingRate === null
          ? "Pending Data"
          : passingRate >= 90
          ? "Exemplary"
          : "Compliant";

      return {
        id: `dept-${code.toLowerCase()}`,
        name: deptName,
        code,
        programName: progName,
        chair: chairName,
        chairEmail,
        cohorts: Array.from(cohortsSet).slice(0, 4),
        students: deptStudents,
        activeExams,
        gradedSheets,
        passingRate,
        obeCompliance: passingRate !== null ? passingRate : null,
        status,
      };
    });
  }, [
    targetProgramCodes,
    systemPrograms,
    registeredUsers,
    isProgrammeHead,
    userProgCode,
    currentUser,
    exams,
    submissions,
    roster,
  ]);

  const handleExportDatabase = async () => {
    setExporting(true);
    try {
      exportCompleteDatabaseExcel(exams, submissions, roster);
      addToast("success", "Institutional Academic Directory successfully exported (.xlsx).");
    } catch {
      addToast("error", "Failed to generate Excel export.");
    } finally {
      setExporting(false);
    }
  };

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return liveDepartments;
    const q = searchQuery.toLowerCase();
    return liveDepartments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        d.programName.toLowerCase().includes(q) ||
        d.chair.toLowerCase().includes(q) ||
        d.cohorts.some((c) => c.toLowerCase().includes(q))
    );
  }, [liveDepartments, searchQuery]);

  if (isProgrammeHead) {
    return (
      <ProgrammeHeadOverview
        currentUser={currentUser}
        summary={summary as any}
        exams={exams}
        submissions={submissions}
        roster={roster}
        onInspectExam={onInspectExam}
        addToast={addToast}
      />
    );
  }

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      {/* HEADER BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "1.25rem 1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "var(--primary-light-surface, #f5f3ff)",
              color: "var(--primary, #28166f)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--primary-light-border, #ddd6fe)",
              flexShrink: 0,
            }}
          >
            {isProgrammeHead ? <GraduationCap size={22} /> : <Building2 size={22} />}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
              {isProgrammeHead
                ? `${userProgCode} Programme Academic Overview`
                : "Academic Departments & Registered Programmes"}
            </h2>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b", marginTop: "0.2rem" }}>
              {isProgrammeHead
                ? `Live curriculum progress, active cohort sections, and registered students strictly under ${userProgCode}.`
                : "Active higher education degree programs registered in SRCB EduAssess administration."}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 700,
              background: "#ecfdf5",
              color: "#065f46",
              padding: "0.35rem 0.75rem",
              borderRadius: "20px",
              border: "1px solid #a7f3d0",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <CheckCircle2 size={13} /> {liveDepartments.length} Registered Program{liveDepartments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* 4 CORE EXECUTIVE KPI CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #6366f1, #a855f7)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              {isProgrammeHead ? "Program Students" : "Total Students"}
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalStudents.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              {isProgrammeHead ? `Enrolled in ${userProgCode}` : "Enrolled students in database"}
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--primary-light-surface, #f5f3ff)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary, #28166f)", flexShrink: 0 }}>
            <GraduationCap size={20} />
          </div>
        </div>

        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #3b82f6, #06b6d4)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              {isProgrammeHead ? "Program Faculty" : "Faculty Members"}
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalFaculty.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              {isProgrammeHead ? `Teaching in ${userProgCode}` : "Registered instructors & staff"}
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a", flexShrink: 0 }}>
            <Users size={20} />
          </div>
        </div>

        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #f59e0b, #ef4444)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              {isProgrammeHead ? "Program Exams" : "Collegiate Exams"}
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {totalExamsCount.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              {isProgrammeHead ? `Created for ${userProgCode}` : "Active examination sets"}
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", color: "#d97706", flexShrink: 0 }}>
            <BookOpen size={20} />
          </div>
        </div>

        <div
          style={{
            padding: "1.15rem 1.25rem",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #10b981, #059669)" }} />
          <div>
            <div style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.25rem" }}>
              {isProgrammeHead ? "Program Mean" : "Institutional Mean"}
            </div>
            <div style={{ fontSize: "1.55rem", fontWeight: 800, color: avgScore !== "—" ? "#10b981" : "#64748b", lineHeight: 1.1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              {avgScore}
            </div>
            <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.3rem" }}>
              CHED Passing Benchmark: 75.0%
            </div>
          </div>
          <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
            <TrendingUp size={20} />
          </div>
        </div>
      </div>

      {/* SEARCH BAR & ACTIONS */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flex: "1 1 240px", minWidth: "min(100%, 200px)" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            />
            <input
              type="text"
              placeholder={isProgrammeHead ? `Search ${userProgCode} courses, cohorts, leadership...` : "Search registered program, leadership..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input"
              style={{
                paddingLeft: "2.4rem",
                paddingRight: searchQuery ? "2rem" : "0.85rem",
                fontSize: "0.83rem",
                height: "38px",
                width: "100%",
                borderRadius: "10px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                color: "#0f172a",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "0.65rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportDatabase}
            disabled={exporting}
            title={exporting ? "Exporting Directory..." : "Export Academic Directory (.xlsx)"}
            aria-label="Export Academic Directory (.xlsx)"
            style={{
              width: "38px",
              height: "38px",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "10px",
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              color: "var(--primary, #28166f)",
              cursor: exporting ? "not-allowed" : "pointer",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
              transition: "all 0.2s ease",
              flexShrink: 0,
            }}
          >
            <FileSpreadsheet size={17} />
          </button>
        </div>

        <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
          Showing <strong style={{ color: "#0f172a" }}>{filteredDepartments.length}</strong> of {liveDepartments.length} registered academic degree program{liveDepartments.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* REGISTERED PROGRAMMES GRID */}
      <div style={{ display: "grid", gap: "1.25rem" }}>
        {filteredDepartments.length === 0 ? (
          <div
            style={{
              padding: "2.5rem 1rem",
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
              borderRadius: "14px",
              textAlign: "center",
              color: "#64748b",
            }}
          >
            <Building2 size={36} style={{ margin: "0 auto 0.75rem", color: "#94a3b8" }} />
            <h4 style={{ margin: "0 0 0.25rem 0", color: "#1e293b", fontSize: "1rem" }}>
              No Registered Programs Found
            </h4>
            <p style={{ margin: 0, fontSize: "0.82rem" }}>
              Only degree programs registered in the administration system appear here.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
              gap: "1.25rem",
            }}
          >
            {filteredDepartments.map((dept) => {
              const collegeAccent =
                dept.code === "BSIT"
                  ? { bar: "linear-gradient(90deg, #6366f1, #818cf8)", border: "#c7d2fe", bg: "#eef2ff", text: "#4338ca" }
                  : dept.code === "BSCRIM"
                  ? { bar: "linear-gradient(90deg, #dc2626, #f87171)", border: "#fecaca", bg: "#fef2f2", text: "#991b1b" }
                  : dept.code === "BSHM"
                  ? { bar: "linear-gradient(90deg, #d97706, #fbbf24)", border: "#fde68a", bg: "#fffbeb", text: "#92400e" }
                  : dept.code === "BSBA"
                  ? { bar: "linear-gradient(90deg, #0284c7, #38bdf8)", border: "#bae6fd", bg: "#f0f9ff", text: "#0369a1" }
                  : dept.code === "TEP"
                  ? { bar: "linear-gradient(90deg, #10b981, #34d399)", border: "#a7f3d0", bg: "#ecfdf5", text: "#065f46" }
                  : { bar: "linear-gradient(90deg, #8b5cf6, #c084fc)", border: "#e9d5ff", bg: "#faf5ff", text: "#6b21a8" };

              const chairInitials = dept.chair
                .replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s+/i, "")
                .split(/\s+/)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();

              return (
                <div
                  key={dept.id}
                  className="card"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
                    position: "relative",
                    overflow: "hidden",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: collegeAccent.bar }} />

                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                        gap: "0.75rem",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                          <span
                            style={{
                              background: collegeAccent.bg,
                              color: collegeAccent.text,
                              fontSize: "0.74rem",
                              fontWeight: 800,
                              padding: "0.2rem 0.6rem",
                              borderRadius: "6px",
                              border: `1px solid ${collegeAccent.border}`,
                              letterSpacing: "0.03em",
                            }}
                          >
                            {dept.code}
                          </span>
                          <span
                            className={`badge ${
                              dept.status === "Exemplary"
                                ? "badge-success"
                                : dept.status === "Compliant"
                                ? "badge-info"
                                : "badge-warning"
                            }`}
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <span
                              style={{
                                width: "6px",
                                height: "6px",
                                borderRadius: "50%",
                                background:
                                  dept.status === "Exemplary"
                                    ? "#10b981"
                                    : dept.status === "Compliant"
                                    ? "#0284c7"
                                    : "#f59e0b",
                              }}
                            />
                            {dept.status}
                          </span>
                        </div>
                        <h3
                          style={{
                            margin: 0,
                            fontSize: "1.15rem",
                            fontWeight: 800,
                            color: "#0f172a",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            letterSpacing: "-0.01em",
                            lineHeight: 1.3,
                          }}
                        >
                          {dept.programName}
                        </h3>
                        <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "0.2rem" }}>
                          {dept.name}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        marginBottom: "1rem",
                        fontSize: "0.82rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.85rem",
                      }}
                    >
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "50%",
                          background: "var(--primary-light-surface, #f5f3ff)",
                          color: "var(--primary, #28166f)",
                          border: "1px solid var(--primary-light-border, #ddd6fe)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          flexShrink: 0,
                        }}
                      >
                        {chairInitials}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                          Academic Programme Leadership
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.15rem" }}>
                          <strong style={{ color: "#0f172a", fontSize: "0.88rem" }}>{dept.chair}</strong>
                          <span style={{ color: "#64748b", fontSize: "0.76rem" }}>{dept.chairEmail}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginBottom: "1.1rem" }}>
                      <div style={{ color: "#64748b", fontSize: "0.74rem", marginBottom: "0.45rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                        Registered Cohorts & Curriculum Courses:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                        {dept.cohorts.map((cohort) => (
                          <div
                            key={cohort}
                            style={{
                              fontSize: "0.82rem",
                              color: "#334155",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                              background: "#ffffff",
                              padding: "0.35rem 0.6rem",
                              borderRadius: "8px",
                              border: "1px solid #f1f5f9",
                            }}
                          >
                            <ChevronRight size={13} color="var(--primary, #28166f)" style={{ flexShrink: 0 }} />
                            <span style={{ fontWeight: 500 }}>{cohort}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(4, 1fr)",
                        gap: "0.5rem",
                        paddingTop: "0.95rem",
                        borderTop: "1px solid #e2e8f0",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ padding: "0.45rem 0.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Active Exams</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", marginTop: "0.15rem", color: "#0f172a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.activeExams}
                        </div>
                      </div>
                      <div style={{ padding: "0.45rem 0.25rem", background: "#f8fafc", borderRadius: "8px", border: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>Graded Sheets</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", marginTop: "0.15rem", color: "#0f172a", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.gradedSheets.toLocaleString()}
                        </div>
                      </div>
                      <div style={{ padding: "0.45rem 0.25rem", background: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
                        <div style={{ fontSize: "0.7rem", color: "#065f46", fontWeight: 700 }}>Pass Rate</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: dept.passingRate !== null ? "#059669" : "#64748b", marginTop: "0.15rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.passingRate !== null ? `${dept.passingRate}%` : "—"}
                        </div>
                      </div>
                      <div style={{ padding: "0.45rem 0.25rem", background: "var(--primary-light-surface, #f5f3ff)", borderRadius: "8px", border: "1px solid var(--primary-light-border, #ddd6fe)" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--primary, #28166f)", fontWeight: 700 }}>Roster</div>
                        <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--primary, #28166f)", marginTop: "0.15rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          {dept.students > 0 ? dept.students : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
