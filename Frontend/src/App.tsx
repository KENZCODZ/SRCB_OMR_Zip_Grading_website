import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart3,
  UploadCloud,
  History,
  Plus,
  BookOpen,
  GraduationCap,
  Search,
  Info,
  Sparkles,
  FileUp,
  Trash2,
  AlertTriangle,
  Award,
  FileSpreadsheet,
  Download,
  BarChart2,
  UserCheck,
  ShieldCheck,
  LogOut,
  FileText,
  Layers,
  Database,
} from "lucide-react";
import confetti from "canvas-confetti";
import type {
  AuthUser,
  Exam,
  Submission,
  QuickScanResult,
  GradeResult,
  StudentRosterEntry,
} from "./types";
import {
  fetchExams,
  createExam,
  gradeSheet,
  extractSheet,
  fetchSubmissions,
  deleteExam,
  loginUser,
  fetchDashboardSummary,
} from "./api";
import {
  mockExams,
  mockSubmissions,
  mockSystemMetrics,
  mockClassRoster,
  mockUsers,
} from "./data/mockData";
import {
  exportCHEDGradeSheet,
  exportItemAnalysisExcel,
  exportSingleSubmissionExcel,
  exportExamBatchExcel,
  exportCompleteDatabaseExcel,
} from "./utils/excelUtils";

// Imported Isolated UI Components
import HeaderBanner from "./components/HeaderBanner";
import MetricTile from "./components/MetricTile";
import StatusBadge from "./components/StatusBadge";
import ExamCard from "./components/ExamCard";
import SubmissionTable from "./components/SubmissionTable";
import ToastNotification, {
  type ToastItem,
} from "./components/ToastNotification";
import RosterImportModal from "./components/RosterImportModal";
import ItemAnalysisTable from "./components/ItemAnalysisTable";
import RoleDashboard from "./components/RoleDashboard";
import LoginPage from "./components/LoginPage";
import UserGuideModal from "./components/UserGuideModal";

type AppTab =
  | "dashboard"
  | "academic-management"
  | "examinations"
  | "reports"
  | "settings"
  | "quick-scan"
  | "exams"
  | "history"
  | "item-analysis";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedAuthUserId, setSelectedAuthUserId] = useState(mockUsers[0].id);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [authMessage, setAuthMessage] = useState(
    "Sign in with your school Google Workspace account to unlock your role-based dashboard.",
  );

  // Core Data State
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [roster, setRoster] = useState<StudentRosterEntry[]>(mockClassRoster);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState({
    total_students: 0,
    total_exams: 0,
    average_score: 0,
    total_submissions: 0,
  });

  // Quick Scanner State
  const [quickScanLoading, setQuickScanLoading] = useState(false);
  const [quickScanResult, setQuickScanResult] =
    useState<QuickScanResult | null>(null);

  // Exam Creation State
  const [showCreateExam, setShowCreateExam] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamKey, setNewExamKey] = useState<Record<string, string>>({});
  const [keyUploadLoading, setKeyUploadLoading] = useState(false);

  // Active Exam Inspection & Grading State
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [gradingProgress, setGradingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [latestGradeResult, setLatestGradeResult] =
    useState<GradeResult | null>(null);

  // Submissions Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  // Flexible Export System State
  const [exportBatchExamId, setExportBatchExamId] = useState<string>("");
  const [exportExamType, setExportExamType] = useState<string>(
    "Midterm Examination",
  );
  const [exportSingleSubmissionId, setExportSingleSubmissionId] =
    useState<string>("");

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Refs for file uploads
  const quickScanInputRef = useRef<HTMLInputElement>(null);
  const keyScanInputRef = useRef<HTMLInputElement>(null);
  const studentScanInputRef = useRef<HTMLInputElement>(null);

  // Add a Toast Notification
  const addToast = (type: "success" | "error" | "info", message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadExams = useCallback(async () => {
    setLoadingExams(true);
    try {
      const data = await fetchExams();
      if (data && data.length > 0) {
        setExams(data);
        setSelectedExamId((prev) => {
          if (prev && data.some((exam) => exam.id === prev)) {
            return prev;
          }
          return data[0]?.id ?? "";
        });
        return;
      }

      try {
        const seededExam = await createExam({
          name: mockExams[0].name,
          answer_key: mockExams[0].answer_key,
        });
        setExams([seededExam]);
        setSelectedExamId(seededExam.id);
        addToast(
          "info",
          `A starter exam was created automatically so grading can begin.`,
        );
      } catch {
        setExams(mockExams);
        setSelectedExamId(mockExams[0]?.id ?? "");
        addToast(
          "info",
          "No exams were found in the backend. Using demo data until you create a real exam.",
        );
      }
    } catch {
      addToast("info", "Using fallback mock exams (Backend API offline)");
      setExams(mockExams);
      setSelectedExamId(mockExams[0]?.id ?? "");
    } finally {
      setLoadingExams(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const data = await fetchSubmissions();
      setSubmissions(data && data.length > 0 ? data : mockSubmissions);
    } catch {
      addToast("info", "Using fallback mock submissions (Backend API offline)");
      setSubmissions(mockSubmissions);
    } finally {
      setLoadingSubmissions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardSummary = useCallback(async () => {
    try {
      const data = await fetchDashboardSummary();
      setDashboardSummary(data);
    } catch {
      setDashboardSummary({
        total_students: 4,
        total_exams: 0,
        average_score: 0,
        total_submissions: 0,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    loadExams();
    loadSubmissions();
    loadDashboardSummary();
  }, [loadExams, loadSubmissions, loadDashboardSummary]);

  // Trigger Confetti Effect
  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  // Handle Quick Scan Upload
  const handleQuickScanUpload = async (file: File) => {
    if (!file) return;
    setQuickScanLoading(true);
    setQuickScanResult(null);

    try {
      const res = await extractSheet(file);
      setQuickScanResult(res);
      addToast("success", "OMR sheet processed successfully!");
      triggerConfetti();
    } catch (err: any) {
      addToast("error", err.message || "OMR processing failed.");
    } finally {
      setQuickScanLoading(false);
    }
  };

  // Handle Answer Key Image Upload
  const handleKeySheetUpload = async (file: File) => {
    if (!file) return;
    setKeyUploadLoading(true);
    try {
      const res = await extractSheet(file);
      const extractedKey: Record<string, string> = {};
      Object.entries(res.answers).forEach(([q, val]) => {
        if (val) extractedKey[q] = val;
      });
      setNewExamKey(extractedKey);
      addToast(
        "success",
        "Answer key extracted from sheet image successfully!",
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

  // Handle Exam Submission Creation
  const handleCreateExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName.trim()) {
      addToast("error", "Exam name is required.");
      return;
    }
    if (Object.keys(newExamKey).length === 0) {
      addToast("error", "Please configure at least one answer in the key.");
      return;
    }

    try {
      await createExam({
        name: newExamName,
        answer_key: newExamKey,
      });
      addToast("success", `Exam "${newExamName}" created successfully.`);
      setNewExamName("");
      setNewExamKey({});
      setShowCreateExam(false);
      await Promise.all([
        loadExams(),
        loadSubmissions(),
        loadDashboardSummary(),
      ]);
    } catch (err: any) {
      addToast("error", err.message || "Failed to create exam.");
    }
  };

  // Handle Grading Student Sheets
  const handleGradeSheetsSubmit = async (files: File[]) => {
    if (files.length === 0) return;

    const activeExamId =
      selectedExamId && exams.some((exam) => exam.id === selectedExamId)
        ? selectedExamId
        : exams[0]?.id || "";

    if (!activeExamId) {
      addToast(
        "error",
        "Create or select an exam before uploading student sheets.",
      );
      return;
    }

    setSelectedExamId(activeExamId);
    setGradingProgress({ current: 0, total: files.length });
    setLatestGradeResult(null);

    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      setGradingProgress({ current: i + 1, total: files.length });
      try {
        const res = await gradeSheet(activeExamId, files[i]);
        setLatestGradeResult(res);
        successCount++;
      } catch (err: any) {
        addToast("error", `Failed to grade ${files[i].name}: ${err.message}`);
      }
    }

    setGradingProgress(null);
    await Promise.all([loadSubmissions(), loadDashboardSummary()]);

    if (successCount > 0) {
      addToast("success", `Successfully graded ${successCount} sheet(s).`);
      triggerConfetti();
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this exam and all its grading submissions? This cannot be undone.",
      )
    ) {
      return;
    }
    try {
      await deleteExam(examId);
      addToast("success", "Exam and its submissions deleted successfully.");

      setSelectedExamId((prev) => {
        if (prev === examId) {
          const remaining = exams.filter((e) => e.id !== examId);
          return remaining.length > 0 ? remaining[0].id : "";
        }
        return prev;
      });

      await Promise.all([
        loadExams(),
        loadSubmissions(),
        loadDashboardSummary(),
      ]);
    } catch (err: any) {
      addToast("error", err.message || "Failed to delete exam.");
    }
  };

  const viewSubmissionDetails = (sub: Submission) => {
    setSelectedSubmission(sub);
  };

  const handleExportGradeSheet = () => {
    const targetExam = exams.find((e) => e.id === selectedExamId) || exams[0];
    const examName = targetExam ? targetExam.name : "OMR_Exam";
    const examSubs = selectedExamId
      ? submissions.filter((s) => s.exam_id === selectedExamId)
      : submissions;

    exportCHEDGradeSheet(
      examName,
      examSubs.length > 0 ? examSubs : mockSubmissions,
      roster,
    );
    addToast(
      "success",
      `Exported CHED Transmuted Grade Sheet for "${examName}" (.xlsx)`,
    );
  };

  const handleExportItemAnalysis = () => {
    const targetExam = exams.find((e) => e.id === selectedExamId) || exams[0];
    if (!targetExam) return;
    const examSubs = submissions.filter((s) => s.exam_id === targetExam.id);
    exportItemAnalysisExcel(
      targetExam.name,
      targetExam.answer_key,
      examSubs.length > 0 ? examSubs : mockSubmissions,
    );
    addToast(
      "success",
      `Exported OBE Item Analysis Report for "${targetExam.name}" (.xlsx)`,
    );
  };

  const handleExportSingleSubmission = (targetSub?: Submission | null) => {
    const activeSubmissions =
      submissions.length > 0 ? submissions : mockSubmissions;
    const subToExport =
      targetSub ||
      activeSubmissions.find((s) => s.id === exportSingleSubmissionId) ||
      selectedSubmission ||
      activeSubmissions[0];
    if (!subToExport) {
      addToast("error", "No submission selected for single file export.");
      return;
    }
    const targetExam =
      exams.find((e) => e.id === subToExport.exam_id) ||
      mockExams.find((e) => e.id === subToExport.exam_id);
    exportSingleSubmissionExcel(subToExport, targetExam, roster);
    const matchedStudent = roster.find(
      (r) =>
        r.student_id.toLowerCase() ===
        (subToExport.student_id || "").toLowerCase(),
    );
    const studentLabel = matchedStudent
      ? matchedStudent.name
      : subToExport.student_id || "Student";
    addToast(
      "success",
      `Single File Export: Exported result for ${studentLabel} (.xlsx)`,
    );
  };

  const handleExportExamBatch = () => {
    const activeExams = exams.length > 0 ? exams : mockExams;
    const activeSubmissions =
      submissions.length > 0 ? submissions : mockSubmissions;
    const targetExamId =
      exportBatchExamId || selectedExamId || activeExams[0]?.id || "";
    const targetExam =
      activeExams.find((e) => e.id === targetExamId) || activeExams[0];
    if (!targetExam) {
      addToast("error", "No examination selected for batch export.");
      return;
    }
    const examSubs = activeSubmissions.filter(
      (s) => s.exam_id === targetExam.id,
    );
    const finalSubs = examSubs.length > 0 ? examSubs : activeSubmissions;

    exportExamBatchExcel(targetExam, finalSubs, roster, exportExamType);
    addToast(
      "success",
      `Exam-Based Batch Export: Compiled ${finalSubs.length} submissions for "${targetExam.name}" (${exportExamType}) into Excel (.xlsx)`,
    );
  };

  const handleExportCompleteDatabase = () => {
    const activeSubmissions =
      submissions.length > 0 ? submissions : mockSubmissions;
    const activeExams = exams.length > 0 ? exams : mockExams;
    exportCompleteDatabaseExcel(activeExams, activeSubmissions, roster);
    addToast(
      "success",
      `Complete Database Export: Exported all ${activeSubmissions.length} submissions across ${activeExams.length} examinations into master Excel report (.xlsx)`,
    );
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSignIn = (userId: string) => {
    const selectedUser = mockUsers.find((user) => user.id === userId);
    if (!selectedUser) return;

    setCurrentUser(selectedUser);
    setIsUserGuideOpen(false);
    setActiveTab("dashboard");
    setAuthMessage(
      `Welcome back, ${selectedUser.name}. Your ${selectedUser.role.replace("-", " ")} workspace is ready.`,
    );
    setLoginError("");
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const normalizedEmail = loginEmail.trim().toLowerCase();
    if (!normalizedEmail || !loginPassword.trim()) {
      setLoginError("Please enter your school email and password to continue.");
      return;
    }

    try {
      const backendUser = await loginUser(
        normalizedEmail,
        loginPassword.trim(),
      );
      const mappedUser: AuthUser = {
        id: backendUser.id,
        role: (backendUser.role as AuthUser["role"]) ?? "student",
        name: backendUser.name,
        email: backendUser.email,
        programme: backendUser.programme ?? undefined,
        department: backendUser.department ?? undefined,
        scope:
          backendUser.role === "dean"
            ? "Institution-wide access across all departments and programmes"
            : backendUser.role === "programme-head"
              ? `Restricted to ${backendUser.programme ?? "assigned programme"}`
              : backendUser.role === "teacher"
                ? `Teaching access for ${backendUser.department ?? "assigned department"}`
                : `Student access for ${backendUser.programme ?? "assigned programme"}`,
        permissions:
          backendUser.role === "dean"
            ? [
                "Manage students",
                "Manage teachers",
                "Monitor examinations",
                "View reports",
              ]
            : backendUser.role === "programme-head"
              ? [
                  "View programme analytics",
                  "Monitor students",
                  "Review examinations",
                ]
              : backendUser.role === "teacher"
                ? [
                    "Create examinations",
                    "Upload answer keys",
                    "Grade sheets",
                    "Publish results",
                  ]
                : ["View exams", "Review results", "See feedback"],
      };

      setSelectedAuthUserId(mappedUser.id);
      setCurrentUser(mappedUser);
      setIsUserGuideOpen(false);
      setActiveTab("dashboard");
      setAuthMessage(
        `Welcome back, ${mappedUser.name}. Your ${mappedUser.role.replace("-", " ")} workspace is ready.`,
      );
      setLoginError("");
    } catch (err: any) {
      const foundMock = mockUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail,
      );
      if (
        foundMock &&
        (err.message?.includes("Failed to fetch") ||
          err.message?.includes("NetworkError") ||
          err.name === "TypeError")
      ) {
        setSelectedAuthUserId(foundMock.id);
        setCurrentUser(foundMock);
        setIsUserGuideOpen(false);
        setActiveTab("dashboard");
        setAuthMessage(
          `Welcome back, ${foundMock.name}. Your ${foundMock.role.replace("-", " ")} workspace is ready.`,
        );
        setLoginError("");
        return;
      }
      setLoginError(err.message || "Authentication failed.");
    }
  };

  const resetAuthView = (message: string) => {
    setCurrentUser(null);
    setIsUserGuideOpen(false);
    setLoginEmail("");
    setLoginPassword("");
    setLoginError("");
    setActiveTab("dashboard");
    setAuthMessage(message);
  };

  const handleSignOut = () => {
    resetAuthView(
      "Signed out. Choose a role to continue exploring the experience.",
    );
  };

  const activeExam = exams.find((e) => e.id === selectedExamId);

  const navigationItems = (() => {
    if (!currentUser) {
      return [
        { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
      ];
    }

    if (currentUser.role === "dean") {
      return [
        { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
        {
          key: "academic-management" as AppTab,
          label: "Academic Management",
          icon: GraduationCap,
        },
        {
          key: "examinations" as AppTab,
          label: "Examinations",
          icon: BookOpen,
        },
        {
          key: "reports" as AppTab,
          label: "Reports & Analytics",
          icon: BarChart3,
        },
        { key: "settings" as AppTab, label: "Settings", icon: ShieldCheck },
      ];
    }

    if (currentUser.role === "programme-head") {
      return [
        { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
        {
          key: "academic-management" as AppTab,
          label: "Programme Overview",
          icon: GraduationCap,
        },
        {
          key: "examinations" as AppTab,
          label: "Examinations",
          icon: BookOpen,
        },
        { key: "reports" as AppTab, label: "Reports", icon: BarChart3 },
      ];
    }

    if (currentUser.role === "teacher") {
      return [
        { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
        { key: "quick-scan" as AppTab, label: "Quick Scanner", icon: Sparkles },
        { key: "exams" as AppTab, label: "Exams & Grading", icon: BookOpen },
        { key: "history" as AppTab, label: "Grading History", icon: History },
        {
          key: "item-analysis" as AppTab,
          label: "OBE Analysis",
          icon: BarChart2,
        },
      ];
    }

    return [
      { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
      { key: "examinations" as AppTab, label: "My Exams", icon: BookOpen },
      { key: "reports" as AppTab, label: "Results", icon: BarChart3 },
    ];
  })();

  const handleTabSelect = (tab: AppTab) => {
    if (navigationItems.some((item) => item.key === tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab("dashboard");
    }
  };

  const studentResults = submissions.filter(
    (submission) => submission.student_id === currentUser?.studentId,
  );
  const studentName = currentUser?.name ?? "Student";

  const getMetricIcon = (color?: string) => {
    switch (color) {
      case "success":
        return Award;
      case "warning":
        return AlertTriangle;
      case "info":
        return BookOpen;
      default:
        return GraduationCap;
    }
  };

  if (!currentUser) {
    return (
      <LoginPage
        email={loginEmail}
        setEmail={setLoginEmail}
        password={loginPassword}
        setPassword={setLoginPassword}
        loginError={loginError}
        onSubmit={handleLoginSubmit}
        onSelectMockUser={(userId) => {
          setSelectedAuthUserId(userId);
          const found = mockUsers.find((u) => u.id === userId);
          if (found) {
            let pass = "Dean@2025";
            if (found.role === "programme-head") pass = "Ph@2025";
            if (found.role === "teacher") pass = "Teacher@2025";
            if (found.role === "student") pass = "Student@2025";

            setLoginEmail(found.email);
            setLoginPassword(pass);
            handleSignIn(found.id);
          }
        }}
        mockUsers={mockUsers}
        selectedAuthUserId={selectedAuthUserId}
      />
    );
  }

  return (
    <div className="app-container">
      {/* Toast Notification Container Component */}
      <ToastNotification toasts={toasts} onDismiss={removeToast} />

      {/* Roster Import Modal */}
      <RosterImportModal
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        onImportSuccess={(newRoster) => {
          setRoster(newRoster);
          addToast(
            "success",
            `Successfully imported class roster with ${newRoster.length} students.`,
          );
        }}
      />

      <UserGuideModal
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
        initialRole={currentUser?.role ?? "teacher"}
        onNavigateTab={(tab) => handleTabSelect(tab as AppTab)}
      />

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div
          className="sidebar-logo"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
        >
          <img
            src="/srcb-logo.png"
            alt="SRCB Logo"
            style={{
              height: "32px",
              width: "auto",
              background: "#ffffff",
              padding: "2px 6px",
              borderRadius: "6px",
              border: "1px solid var(--srcb-gold-accent)",
            }}
          />
          <span>AeroOMR</span>
        </div>

        <div
          className="card"
          style={{
            padding: "0.9rem",
            marginBottom: "1rem",
            background: "rgba(8, 17, 32, 0.9)",
          }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              marginBottom: "0.4rem",
            }}
          >
            Current access
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
            {currentUser ? currentUser.name : "Guest access"}
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              marginTop: "0.25rem",
            }}
          >
            {currentUser
              ? currentUser.role.replace("-", " ")
              : "Choose a role to preview the dashboard"}
          </div>
        </div>

        <ul className="sidebar-menu">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.key}
                className={`sidebar-item ${activeTab === item.key ? "active" : ""}`}
                onClick={() => {
                  handleTabSelect(item.key);
                  if (
                    item.key === "exams" &&
                    exams.length > 0 &&
                    !selectedExamId
                  ) {
                    setSelectedExamId(exams[0].id);
                  }
                }}
              >
                <Icon size={18} />
                {item.label}
              </li>
            );
          })}
        </ul>

        {currentUser && (
          <div style={{ display: "grid", gap: "0.6rem", marginTop: "1rem" }}>
            <button
              className="btn btn-outline"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => setIsUserGuideOpen(true)}
            >
              <BookOpen size={16} style={{ marginRight: "0.4rem" }} />
              Open User Guide
            </button>

            <button
              className="btn btn-danger"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handleSignOut}
            >
              <LogOut size={16} style={{ marginRight: "0.4rem" }} />
              Log Out
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          St. Rita's College of Balingasag
          <br />
          Higher Ed • IT Program
        </div>
      </aside>

      {/* Main Content View */}
      <main className="main-content">
        {/* SRCB Institutional Header Banner (Displayed across all pages) */}
        <HeaderBanner onOpenGuide={() => setIsUserGuideOpen(true)} />

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div>
            <div
              className="header-container"
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                  {currentUser
                    ? `${currentUser.name.split(" ")[0]}'s Role Workspace`
                    : "OMR Academic Grading Dashboard"}
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    margin: "0.2rem 0 0 0",
                  }}
                >
                  {currentUser
                    ? authMessage
                    : "Secure role-based dashboards, auth flow, and analytics for deans, programme heads, teachers, and students."}
                </p>
              </div>

              <div
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                {!currentUser ? (
                  <>
                    <select
                      className="form-input"
                      style={{ minWidth: "220px" }}
                      value={selectedAuthUserId}
                      onChange={(e) => setSelectedAuthUserId(e.target.value)}
                    >
                      {mockUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} · {user.role.replace("-", " ")}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleSignIn(selectedAuthUserId)}
                    >
                      <UserCheck size={16} /> Sign in as selected role
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsRosterModalOpen(true)}
                    >
                      <FileSpreadsheet size={16} /> Import Roster (
                      {roster.length})
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={handleExportGradeSheet}
                    >
                      <Download size={16} /> Export CHED Grade Sheet (.xlsx)
                    </button>
                  </>
                )}
              </div>
            </div>

            {!currentUser && (
              <div
                className="card"
                style={{
                  marginBottom: "1.5rem",
                  border: "1px solid var(--srcb-gold-accent)",
                }}
              >
                <h3 style={{ marginBottom: "0.5rem" }}>
                  Live Role-Based Authentication
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "1rem",
                  }}
                >
                  Sign in with the seeded university accounts to unlock the real
                  role-based dashboard and examination workflow.
                </p>
                <div className="stats-grid">
                  {mockUsers.map((user) => (
                    <div key={user.id} className="metric-card">
                      <div className="metric-header">
                        <span className="metric-title">
                          {user.role.replace("-", " ")}
                        </span>
                        <div className="metric-icon-wrapper">
                          <ShieldCheck
                            size={18}
                            color="var(--srcb-gold-accent)"
                          />
                        </div>
                      </div>
                      <div
                        className="metric-value"
                        style={{ fontSize: "1.1rem" }}
                      >
                        {user.name}
                      </div>
                      <div className="metric-subtitle">{user.scope}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentUser && (
              <div style={{ marginBottom: "2rem" }}>
                <RoleDashboard user={currentUser} summary={dashboardSummary} />
              </div>
            )}

            {/* Decomposed KPI Metric Cards Grid */}
            <div className="stats-grid" style={{ marginBottom: "2rem" }}>
              <MetricTile
                title="Live Students"
                value={dashboardSummary.total_students.toString()}
                subtitle="Registered in the system"
                color="info"
                trend="up"
                icon={getMetricIcon("info")}
              />
              <MetricTile
                title="Live Exams"
                value={dashboardSummary.total_exams.toString()}
                subtitle="Stored in the backend"
                color="success"
                trend="up"
                icon={getMetricIcon("success")}
              />
              <MetricTile
                title="Average Score"
                value={
                  dashboardSummary.average_score > 0
                    ? `${dashboardSummary.average_score}%`
                    : "—"
                }
                subtitle="Across graded submissions"
                color="warning"
                trend="up"
                icon={getMetricIcon("warning")}
              />
              <MetricTile
                title="Submissions"
                value={dashboardSummary.total_submissions.toString()}
                subtitle="Processed and stored"
                color="info"
                trend="up"
                icon={getMetricIcon("info")}
              />
              {mockSystemMetrics.slice(0, 1).map((metric) => (
                <MetricTile
                  key={metric.id}
                  title={metric.title}
                  value={metric.value}
                  subtitle={metric.subtitle}
                  color={metric.color}
                  trend={metric.trend}
                  icon={getMetricIcon(metric.color)}
                />
              ))}
            </div>

            {currentUser?.role === "student" && (
              <div className="card" style={{ marginBottom: "2rem" }}>
                <h2 style={{ fontSize: "1.2rem", marginBottom: "0.75rem" }}>
                  My Examination Record
                </h2>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    marginBottom: "1rem",
                  }}
                >
                  {studentName} can review personal results, feedback, and
                  progress through their own secure exam history.
                </p>
                {studentResults.length === 0 ? (
                  <div style={{ color: "var(--text-muted)" }}>
                    No personal examination results yet.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "0.7rem" }}>
                    {studentResults.slice(0, 3).map((result) => (
                      <div
                        key={result.id}
                        style={{
                          padding: "0.9rem",
                          borderRadius: "var(--radius-md)",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <strong>
                            {exams.find((exam) => exam.id === result.exam_id)
                              ?.name || "Exam"}
                          </strong>
                          <span className="badge badge-success">
                            {result.score}/{result.total_questions}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Dashboard Submissions and Quick Actions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr",
                gap: "2rem",
              }}
            >
              {/* Recent Submissions Component with Roster matching */}
              <div className="card">
                <h2
                  style={{
                    fontSize: "1.2rem",
                    marginBottom: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <History size={18} className="text-secondary" /> Recent Graded
                  Submissions
                </h2>
                {loadingSubmissions ? (
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <SubmissionTable
                    submissions={submissions.slice(0, 5)}
                    exams={exams}
                    roster={roster}
                    onSelectSubmission={viewSubmissionDetails}
                    formatDate={formatDate}
                  />
                )}
              </div>

              {/* Quick Action Panel */}
              <div
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <h2 style={{ fontSize: "1.2rem" }}>Academic Tools</h2>
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => setActiveTab("quick-scan")}
                >
                  <Sparkles size={18} /> Quick Bubble Reader
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => setIsRosterModalOpen(true)}
                >
                  <UserCheck size={18} /> Match Student Roster
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ width: "100%", justifyContent: "flex-start" }}
                  onClick={() => setActiveTab("item-analysis")}
                >
                  <BarChart2 size={18} /> Run OBE Item Analysis
                </button>

                <div
                  style={{
                    marginTop: "auto",
                    background: "rgba(255, 255, 255, 0.02)",
                    padding: "1rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border)",
                  }}
                >
                  <h4
                    style={{
                      fontSize: "0.85rem",
                      color: "var(--text-secondary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <Info size={14} /> Philippine HEI Grading Standard
                  </h4>
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      lineHeight: "1.4",
                    }}
                  >
                    Calculates 50-Base Transmutations automatically:{" "}
                    <code>Grade = 50 + (Raw / Total * 50)</code> mapped to
                    official 1.00 - 5.00 numeric scales.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "academic-management" && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                Academic Management
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Students, teachers, departments, and programmes are managed from
                this module.
              </p>
            </div>

            <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
              {[
                {
                  title: "Students",
                  subtitle: "Institution-wide enrolment records",
                  value: "2,184",
                },
                {
                  title: "Teachers",
                  subtitle: "Faculty activity and assignments",
                  value: "96",
                },
                {
                  title: "Departments",
                  subtitle: "Academic units under review",
                  value: "8",
                },
                {
                  title: "Programmes",
                  subtitle: "Curricula under monitoring",
                  value: "12",
                },
              ].map((item) => (
                <div key={item.title} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">{item.title}</span>
                  </div>
                  <div className="metric-value">{item.value}</div>
                  <div className="metric-subtitle">{item.subtitle}</div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: "1rem" }}>
              <h3 style={{ marginBottom: "0.75rem" }}>
                Current Academic Records
              </h3>
              <div style={{ display: "grid", gap: "0.7rem" }}>
                {[
                  {
                    name: "BSIT - First Year",
                    status: "Active",
                    owner: "Programme Head",
                  },
                  {
                    name: "BSBA - Second Year",
                    status: "Monitoring",
                    owner: "Department Chair",
                  },
                  {
                    name: "BSEd - Third Year",
                    status: "Review",
                    owner: "Dean Office",
                  },
                ].map((entry) => (
                  <div
                    key={entry.name}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.8rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{entry.name}</div>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {entry.owner}
                      </div>
                    </div>
                    <span className="badge badge-success">{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "examinations" && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                Examinations
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Overview of exams, scoring, item analysis, and published
                results.
              </p>
            </div>

            <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
              {[
                {
                  title: "Active Exams",
                  subtitle: "Published this term",
                  value: "128",
                },
                {
                  title: "Results Posted",
                  subtitle: "Ready for student review",
                  value: "74",
                },
                {
                  title: "Pending Review",
                  subtitle: "Awaiting publishing",
                  value: "12",
                },
              ].map((item) => (
                <div key={item.title} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">{item.title}</span>
                  </div>
                  <div className="metric-value">{item.value}</div>
                  <div className="metric-subtitle">{item.subtitle}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>Examination Queue</h3>
              <div style={{ display: "grid", gap: "0.7rem" }}>
                {[
                  {
                    name: "Midterm Examination",
                    status: "Published",
                    date: "Jul 24",
                  },
                  { name: "Final Quiz", status: "Review", date: "Aug 02" },
                  {
                    name: "Practical Assessment",
                    status: "Pending",
                    date: "Aug 09",
                  },
                ].map((entry) => (
                  <div
                    key={entry.name}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.8rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{entry.name}</div>
                      <div
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.82rem",
                        }}
                      >
                        {entry.date}
                      </div>
                    </div>
                    <span className="badge badge-success">{entry.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "reports" && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                Reports & Analytics
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Performance trends, department comparisons, and programme
                analytics.
              </p>
            </div>

            <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
              {[
                {
                  title: "Institution Performance",
                  subtitle: "Average score and pass rate",
                  value: "84.6%",
                },
                {
                  title: "Department Comparison",
                  subtitle: "Cross-unit benchmarking",
                  value: "8 Units",
                },
                {
                  title: "Programme Comparison",
                  subtitle: "Curricular outcomes",
                  value: "12 Programmes",
                },
              ].map((item) => (
                <div key={item.title} className="metric-card">
                  <div className="metric-header">
                    <span className="metric-title">{item.title}</span>
                  </div>
                  <div className="metric-value">{item.value}</div>
                  <div className="metric-subtitle">{item.subtitle}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>
                Recent Institutional Reports
              </h3>
              <div style={{ display: "grid", gap: "0.7rem" }}>
                {[
                  {
                    title: "Dean Review Summary",
                    detail: "Institution-wide performance overview",
                  },
                  {
                    title: "Programme Outcome Report",
                    detail: "Curriculum quality and pass rate trends",
                  },
                  {
                    title: "Department Benchmark Report",
                    detail: "Cross-department performance comparison",
                  },
                ].map((entry) => (
                  <div
                    key={entry.title}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.8rem",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{entry.title}</div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      {entry.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                Settings
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Institution preferences, access controls, and policy
                configuration.
              </p>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: "0.75rem" }}>Platform Controls</h3>
              <div style={{ display: "grid", gap: "0.7rem" }}>
                {[
                  {
                    title: "Role Access",
                    detail:
                      "Dean, Programme Head, Teacher, and Student permissions",
                  },
                  {
                    title: "Grading Policy",
                    detail: "HEI transmutation and mark conversion rules",
                  },
                  {
                    title: "Notification Preferences",
                    detail: "Alerts for reminders and result publication",
                  },
                ].map((entry) => (
                  <div
                    key={entry.title}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.8rem",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{entry.title}</div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "0.82rem",
                        marginTop: "0.2rem",
                      }}
                    >
                      {entry.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QUICK SCANNER TAB */}
        {activeTab === "quick-scan" && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                Quick Bubble Reader
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Upload any completed ZipGrade sheet to read raw student marks
                instantly.
              </p>
            </div>

            <div className="card" style={{ marginBottom: "2rem" }}>
              <input
                type="file"
                ref={quickScanInputRef}
                style={{ display: "none" }}
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleQuickScanUpload(e.target.files[0]);
                  }
                  e.target.value = "";
                }}
              />
              <div
                className="dropzone"
                onClick={() => quickScanInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleQuickScanUpload(e.dataTransfer.files[0]);
                  }
                }}
              >
                <UploadCloud size={48} className="dropzone-icon" />
                <h3>Drag & drop a ZipGrade sheet image here</h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.85rem",
                    marginTop: "0.5rem",
                  }}
                >
                  or click to browse from local computer files (Supports JPG,
                  PNG up to 10MB)
                </p>
              </div>
            </div>

            {quickScanLoading && (
              <div className="card spinner-container">
                <div className="spinner"></div>
                <p style={{ fontWeight: 600, color: "var(--primary)" }}>
                  OMR engine calibrating markers and extracting marks...
                </p>
              </div>
            )}

            {quickScanResult && (
              <div className="grade-layout">
                {/* Visual Image Overlay */}
                <div className="card">
                  <h3
                    style={{
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      justifyItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    Annotated Scan Image
                  </h3>
                  <div className="image-preview-container">
                    <img
                      src={`data:image/png;base64,${quickScanResult.overlay_image}`}
                      alt="OMR Scan Overlay"
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      marginTop: "1rem",
                      fontSize: "0.75rem",
                      justifyContent: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          backgroundColor: "#10b981",
                          borderRadius: "50%",
                        }}
                      ></span>{" "}
                      Green: Detected Mark
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          backgroundColor: "#f59e0b",
                          borderRadius: "50%",
                        }}
                      ></span>{" "}
                      Yellow: Ambiguity (Multi-filled)
                    </div>
                  </div>
                </div>

                {/* Parsed Sheet Data */}
                <div className="card">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <h3>Parsed Sheet Data</h3>
                    <StatusBadge
                      customText={`StudentID: ${quickScanResult.student_id || "Empty"}`}
                      variant="info"
                    />
                  </div>

                  <div className="results-scrollable bubble-sheet-card">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        {Array.from({ length: 25 }, (_, i) => i + 1).map(
                          (qNum) => {
                            const qStr = qNum.toString();
                            const detectedVal = quickScanResult.answers[qStr];
                            return (
                              <div
                                key={qStr}
                                className="bubble-row"
                                style={{ padding: "0.35rem 0.5rem" }}
                              >
                                <span className="bubble-num">{qNum}.</span>
                                <div className="bubble-options">
                                  {["A", "B", "C", "D", "E"].map((opt) => (
                                    <span
                                      key={opt}
                                      className={`bubble-btn ${
                                        detectedVal === null
                                          ? "empty"
                                          : detectedVal === opt
                                            ? "active"
                                            : ""
                                      }`}
                                      style={{ pointerEvents: "none" }}
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                      <div>
                        {Array.from({ length: 25 }, (_, i) => i + 26).map(
                          (qNum) => {
                            const qStr = qNum.toString();
                            const detectedVal = quickScanResult.answers[qStr];
                            return (
                              <div
                                key={qStr}
                                className="bubble-row"
                                style={{ padding: "0.35rem 0.5rem" }}
                              >
                                <span className="bubble-num">{qNum}.</span>
                                <div className="bubble-options">
                                  {["A", "B", "C", "D", "E"].map((opt) => (
                                    <span
                                      key={opt}
                                      className={`bubble-btn ${
                                        detectedVal === null
                                          ? "empty"
                                          : detectedVal === opt
                                            ? "active"
                                            : ""
                                      }`}
                                      style={{ pointerEvents: "none" }}
                                    >
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* EXAMS & GRADING TAB */}
        {activeTab === "exams" && (
          <div>
            <div
              className="header-container"
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                  Exams & Grading Management
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    margin: "0.2rem 0 0 0",
                  }}
                >
                  Manage exam answer keys and grade student sheets.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleExportGradeSheet}
                >
                  <Download size={16} /> Export CHED Grade Sheet (.xlsx)
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateExam(true)}
                >
                  <Plus size={18} /> Create Exam
                </button>
              </div>
            </div>

            {/* Create Exam Form Modal */}
            {showCreateExam && (
              <div
                className="card"
                style={{
                  marginBottom: "2rem",
                  border: "1px solid var(--primary)",
                }}
              >
                <h3
                  style={{
                    marginBottom: "1.25rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  Configure New Exam
                  <button
                    className="btn btn-danger"
                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                    onClick={() => setShowCreateExam(false)}
                  >
                    Cancel
                  </button>
                </h3>

                <form onSubmit={handleCreateExamSubmit}>
                  <div className="form-group">
                    <label className="form-label">Exam Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Midterm Physics, Quiz 1"
                      value={newExamName}
                      onChange={(e) => setNewExamName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="exam-layout">
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        Configure Official Answer Key
                      </h4>
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
                        style={{ width: "100%" }}
                      >
                        {keyUploadLoading
                          ? "Extracting..."
                          : "Scan Answer Key Sheet"}
                      </button>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          lineHeight: "1.4",
                        }}
                      >
                        💡 Tip: You can scan a pre-filled OMR sheet containing
                        the correct answers to auto-fill this form!
                      </p>
                    </div>

                    <div>
                      <h4
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-secondary)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Bubble Sheet Answer Key (Click to set)
                      </h4>
                      <div
                        className="bubble-sheet-card"
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          padding: "1rem",
                          maxHeight: "400px",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "1rem",
                          }}
                        >
                          <div>
                            {Array.from({ length: 25 }, (_, i) => i + 1).map(
                              (qNum) => {
                                const qStr = qNum.toString();
                                return (
                                  <div
                                    key={qStr}
                                    className="bubble-row"
                                    style={{ padding: "0.25rem 0.5rem" }}
                                  >
                                    <span className="bubble-num">{qNum}.</span>
                                    <div className="bubble-options">
                                      {["A", "B", "C", "D", "E"].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          className={`bubble-btn ${newExamKey[qStr] === opt ? "active" : ""}`}
                                          style={{
                                            width: "24px",
                                            height: "24px",
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            setNewExamKey((prev) => ({
                                              ...prev,
                                              [qStr]:
                                                prev[qStr] === opt ? "" : opt,
                                            }))
                                          }
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                          <div>
                            {Array.from({ length: 25 }, (_, i) => i + 26).map(
                              (qNum) => {
                                const qStr = qNum.toString();
                                return (
                                  <div
                                    key={qStr}
                                    className="bubble-row"
                                    style={{ padding: "0.25rem 0.5rem" }}
                                  >
                                    <span className="bubble-num">{qNum}.</span>
                                    <div className="bubble-options">
                                      {["A", "B", "C", "D", "E"].map((opt) => (
                                        <button
                                          key={opt}
                                          type="button"
                                          className={`bubble-btn ${newExamKey[qStr] === opt ? "active" : ""}`}
                                          style={{
                                            width: "24px",
                                            height: "24px",
                                            fontSize: "0.75rem",
                                          }}
                                          onClick={() =>
                                            setNewExamKey((prev) => ({
                                              ...prev,
                                              [qStr]:
                                                prev[qStr] === opt ? "" : opt,
                                            }))
                                          }
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "1rem",
                      marginTop: "1.5rem",
                    }}
                  >
                    <button type="submit" className="btn btn-primary">
                      Save Exam & Answer Key
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Exam List and Grading Section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "2rem",
              }}
            >
              {/* Decomposed ExamCard Component Feed */}
              <div className="card">
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                  Exams List
                </h3>
                {loadingExams ? (
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                ) : exams.length === 0 ? (
                  <div
                    style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}
                  >
                    No exams found. Click "Create Exam" to configure one.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    {exams.map((exam) => (
                      <ExamCard
                        key={exam.id}
                        exam={exam}
                        isSelected={selectedExamId === exam.id}
                        onSelect={(id) => {
                          setSelectedExamId(id);
                          setLatestGradeResult(null);
                        }}
                        onDelete={handleDeleteExam}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Active Exam Grading Controls */}
              <div className="card">
                {activeExam ? (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "1rem",
                        marginBottom: "1.5rem",
                      }}
                    >
                      <div>
                        <h2 style={{ margin: 0 }}>{activeExam.name}</h2>
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            marginTop: "0.25rem",
                            marginBottom: 0,
                          }}
                        >
                          Created at {formatDate(activeExam.created_at)}
                        </p>
                      </div>
                      <button
                        className="btn btn-danger"
                        style={{
                          padding: "0.5rem 1rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.85rem",
                        }}
                        onClick={() => handleDeleteExam(activeExam.id)}
                      >
                        <Trash2 size={16} /> Delete Exam
                      </button>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.2fr 1fr",
                        gap: "1.5rem",
                        marginBottom: "2rem",
                      }}
                    >
                      <div
                        style={{
                          borderRight: "1px solid var(--border)",
                          paddingRight: "1.5rem",
                        }}
                      >
                        <h4
                          style={{ marginBottom: "1rem", fontSize: "0.95rem" }}
                        >
                          Grade Student OMR Sheets
                        </h4>

                        <input
                          type="file"
                          ref={studentScanInputRef}
                          style={{ display: "none" }}
                          accept="image/*"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              const filesArr = Array.from(e.target.files);
                              handleGradeSheetsSubmit(filesArr);
                            }
                            e.target.value = "";
                          }}
                        />

                        <div
                          className="dropzone"
                          style={{ padding: "2rem 1rem" }}
                          onClick={() => studentScanInputRef.current?.click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files) {
                              const filesArr = Array.from(e.dataTransfer.files);
                              handleGradeSheetsSubmit(filesArr);
                            }
                          }}
                        >
                          <FileUp
                            size={36}
                            className="text-secondary"
                            style={{ marginBottom: "0.5rem" }}
                          />
                          <h4 style={{ fontSize: "0.85rem" }}>
                            Upload Student OMR Sheets
                          </h4>
                          <p
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              marginTop: "0.25rem",
                            }}
                          >
                            (Select one or multiple images at once)
                          </p>
                        </div>

                        {gradingProgress && (
                          <div style={{ marginTop: "1rem" }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.75rem",
                                marginBottom: "0.25rem",
                              }}
                            >
                              <span>Grading student sheets...</span>
                              <span>
                                {gradingProgress.current} /{" "}
                                {gradingProgress.total}
                              </span>
                            </div>
                            <div
                              style={{
                                width: "100%",
                                height: "6px",
                                background: "var(--bg-base)",
                                borderRadius: "3px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  height: "100%",
                                  background: "var(--primary)",
                                  width: `${(gradingProgress.current / gradingProgress.total) * 100}%`,
                                  transition: "width 0.2s",
                                }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4
                          style={{ marginBottom: "1rem", fontSize: "0.95rem" }}
                        >
                          Configured Answer Key
                        </h4>
                        <div
                          style={{
                            maxHeight: "180px",
                            overflowY: "auto",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.5rem",
                          }}
                        >
                          <table
                            style={{
                              width: "100%",
                              fontSize: "0.8rem",
                              borderCollapse: "collapse",
                            }}
                          >
                            <tbody>
                              {Object.entries(activeExam.answer_key)
                                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                .map(([q, ans]) => (
                                  <tr
                                    key={q}
                                    style={{
                                      borderBottom:
                                        "1px solid rgba(255,255,255,0.02)",
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: "0.25rem",
                                        color: "var(--text-muted)",
                                        fontWeight: 600,
                                      }}
                                    >
                                      Q{q}
                                    </td>
                                    <td
                                      style={{
                                        padding: "0.25rem",
                                        fontWeight: 800,
                                        color: "var(--primary)",
                                      }}
                                    >
                                      {ans}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {latestGradeResult && (
                      <div
                        className="card"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "1rem",
                            marginBottom: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <div>
                            <h4 style={{ marginBottom: "0.3rem" }}>
                              Latest Grade Result
                            </h4>
                            <div
                              style={{
                                fontSize: "0.82rem",
                                color: "var(--text-muted)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                              }}
                            >
                              <span>Student ID:</span>
                              <strong
                                style={{
                                  color: "var(--srcb-gold-light)",
                                  fontWeight: 700,
                                  letterSpacing: "0.03em",
                                }}
                              >
                                {latestGradeResult.student_id || "—"}
                              </strong>
                            </div>
                          </div>
                          <StatusBadge
                            score={latestGradeResult.score}
                            totalQuestions={latestGradeResult.total_questions}
                          />
                        </div>

                        <div className="grade-layout">
                          <div
                            className="image-preview-container"
                            style={{ maxHeight: "400px" }}
                          >
                            <img
                              src={`data:image/png;base64,${latestGradeResult.overlay_image}`}
                              alt="Graded OMR Sheet"
                            />
                          </div>

                          <div
                            className="bubble-sheet-card"
                            style={{ maxHeight: "400px" }}
                          >
                            <h4
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-secondary)",
                                marginBottom: "0.5rem",
                              }}
                            >
                              Answers Check
                            </h4>
                            {Object.entries(activeExam.answer_key)
                              .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                              .map(([qStr, correctAns]) => {
                                const studentAnsObj =
                                  latestGradeResult.answers[qStr];
                                const selected = studentAnsObj
                                  ? studentAnsObj.selected
                                  : null;
                                const isEmpty = studentAnsObj
                                  ? studentAnsObj.is_empty
                                  : true;
                                const isAmbiguous = studentAnsObj
                                  ? studentAnsObj.is_ambiguous
                                  : false;

                                return (
                                  <div
                                    key={qStr}
                                    className="bubble-row"
                                    style={{ padding: "0.25rem 0.5rem" }}
                                  >
                                    <span className="bubble-num">{qStr}.</span>
                                    <div className="bubble-options">
                                      {["A", "B", "C", "D", "E"].map((opt) => {
                                        let btnClass = "";
                                        if (isAmbiguous) {
                                          // Amber on the student's filled bubble
                                          if (selected === opt)
                                            btnClass = "ambiguous";
                                        } else if (isEmpty) {
                                          btnClass = "empty";
                                        } else if (opt === correctAns) {
                                          btnClass = "correct";
                                        } else if (selected === opt) {
                                          btnClass = "incorrect";
                                        }
                                        return (
                                          <span
                                            key={opt}
                                            className={`bubble-btn ${btnClass}`}
                                            style={{ pointerEvents: "none" }}
                                          >
                                            {opt}
                                          </span>
                                        );
                                      })}
                                      <span
                                        style={{
                                          fontSize: "0.75rem",
                                          color: isAmbiguous
                                            ? "var(--srcb-gold-light)"
                                            : isEmpty
                                              ? "var(--text-muted)"
                                              : selected === correctAns
                                                ? "var(--success)"
                                                : "var(--error)",
                                          marginLeft: "0.5rem",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {isEmpty
                                          ? "— No Mark"
                                          : isAmbiguous
                                            ? "⚠ Ambiguous"
                                            : selected === correctAns
                                              ? "✓ Correct"
                                              : `✗ Marked ${selected}`}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    No exam selected. Select an exam from the left or create
                    one.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUBMISSIONS HISTORY TAB / TEACHER DATABASE */}
        {activeTab === "history" && (
          <div>
            <div
              className="header-container"
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                  Teacher Database & Grading Records
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    margin: "0.2rem 0 0 0",
                  }}
                >
                  Review, audit, and export scanned student submissions using
                  multiple flexible export methods.
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsRosterModalOpen(true)}
                >
                  <FileSpreadsheet size={16} /> Import Roster
                </button>
              </div>
            </div>

            {/* Flexible Multi-Method Export Center */}
            <div
              className="card"
              style={{
                marginBottom: "1.5rem",
                background:
                  "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(8, 17, 32, 0.95) 100%)",
                border: "1px solid var(--srcb-gold-accent)",
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <FileSpreadsheet
                      size={20}
                      color="var(--srcb-gold-accent)"
                    />
                    <h3
                      style={{
                        fontSize: "1.15rem",
                        fontWeight: 800,
                        margin: 0,
                      }}
                    >
                      Teacher Database Export System
                    </h3>
                    <span
                      className="badge"
                      style={{
                        background: "rgba(245, 158, 11, 0.2)",
                        color: "var(--srcb-gold-light)",
                      }}
                    >
                      3 Export Methods
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                      margin: "0.25rem 0 0 0",
                    }}
                  >
                    Select an export option below to download formatted Excel
                    (.xlsx) reports with organized columns and examination
                    details.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
                  gap: "1.25rem",
                }}
              >
                {/* Method 1: Single File Export */}
                <div
                  style={{
                    background: "rgba(30, 41, 59, 0.7)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span
                        className="badge"
                        style={{
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#60a5fa",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <FileText size={12} /> Method 1
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Individual File
                      </span>
                    </div>
                    <h4
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 700,
                        marginBottom: "0.35rem",
                      }}
                    >
                      Single File Export
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        marginBottom: "1rem",
                        lineHeight: 1.4,
                      }}
                    >
                      Export an individual scanned submission directly with
                      score, CHED transmuted grade, and bubble breakdown.
                    </p>

                    <div style={{ marginBottom: "1rem" }}>
                      <label
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "block",
                          marginBottom: "4px",
                        }}
                      >
                        Select Submission:
                      </label>
                      <select
                        className="form-input"
                        style={{ fontSize: "0.8rem", padding: "0.4rem 0.6rem" }}
                        value={
                          exportSingleSubmissionId ||
                          (submissions.length > 0
                            ? submissions[0].id
                            : mockSubmissions[0].id)
                        }
                        onChange={(e) =>
                          setExportSingleSubmissionId(e.target.value)
                        }
                      >
                        {(submissions.length > 0
                          ? submissions
                          : mockSubmissions
                        ).map((sub) => {
                          const matchedStudent = roster.find(
                            (r) =>
                              r.student_id.toLowerCase() ===
                              (sub.student_id || "").toLowerCase(),
                          );
                          const matchedExam = (
                            exams.length > 0 ? exams : mockExams
                          ).find((e) => e.id === sub.exam_id);
                          const nameLabel = matchedStudent
                            ? matchedStudent.name
                            : sub.student_id;
                          const examLabel = matchedExam
                            ? matchedExam.name
                            : "Exam";
                          return (
                            <option key={sub.id} value={sub.id}>
                              {nameLabel} - {examLabel} ({sub.score}/50)
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div>
                    <button
                      className="btn btn-secondary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        fontSize: "0.82rem",
                      }}
                      onClick={() => {
                        const activeSubs =
                          submissions.length > 0
                            ? submissions
                            : mockSubmissions;
                        const targetId =
                          exportSingleSubmissionId || activeSubs[0].id;
                        const targetSub =
                          activeSubs.find((s) => s.id === targetId) ||
                          activeSubs[0];
                        if (targetSub) handleExportSingleSubmission(targetSub);
                      }}
                    >
                      <Download size={14} /> Export Single File (.xlsx)
                    </button>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "6px",
                        textAlign: "center",
                      }}
                    >
                      💡 Available on any submission inspect page
                    </div>
                  </div>
                </div>

                {/* Method 2: Exam-Based Batch Export */}
                <div
                  style={{
                    background: "rgba(30, 41, 59, 0.7)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span
                        className="badge"
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#34d399",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Layers size={12} /> Method 2
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Exam Title & Type
                      </span>
                    </div>
                    <h4
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 700,
                        marginBottom: "0.35rem",
                      }}
                    >
                      Exam-Based Batch Export
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        marginBottom: "1rem",
                        lineHeight: 1.4,
                      }}
                    >
                      Compiles all student submissions belonging to the same
                      examination (Title & Type) into a single report.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gap: "0.6rem",
                        marginBottom: "1rem",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Select Examination Title:
                        </label>
                        <select
                          className="form-input"
                          style={{
                            fontSize: "0.8rem",
                            padding: "0.4rem 0.6rem",
                          }}
                          value={
                            exportBatchExamId ||
                            selectedExamId ||
                            (exams.length > 0 ? exams[0].id : mockExams[0].id)
                          }
                          onChange={(e) => setExportBatchExamId(e.target.value)}
                        >
                          {(exams.length > 0 ? exams : mockExams).map((ex) => (
                            <option key={ex.id} value={ex.id}>
                              {ex.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Specify Exam Type / Category:
                        </label>
                        <select
                          className="form-input"
                          style={{
                            fontSize: "0.8rem",
                            padding: "0.4rem 0.6rem",
                          }}
                          value={exportExamType}
                          onChange={(e) => setExportExamType(e.target.value)}
                        >
                          <option value="Midterm Examination">
                            Midterm Examination
                          </option>
                          <option value="Final Examination">
                            Final Examination
                          </option>
                          <option value="Quiz">Quiz / Long Quiz</option>
                          <option value="Diagnostic Test">
                            Diagnostic Test
                          </option>
                          <option value="Unit Test">Unit / Chapter Test</option>
                          <option value="Major Examination">
                            Major Examination
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      className="btn btn-primary"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        fontSize: "0.82rem",
                      }}
                      onClick={handleExportExamBatch}
                    >
                      <Layers size={14} /> Export Exam Batch Report (.xlsx)
                    </button>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "6px",
                        textAlign: "center",
                      }}
                    >
                      📊 Multi-sheet: Batch Roster, Answer Matrix & OBE Analysis
                    </div>
                  </div>
                </div>

                {/* Method 3: Complete Database Export */}
                <div
                  style={{
                    background: "rgba(30, 41, 59, 0.7)",
                    borderRadius: "var(--radius-md)",
                    padding: "1.25rem",
                    border: "1px solid var(--srcb-gold-accent)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <span
                        className="badge"
                        style={{
                          background: "rgba(245, 158, 11, 0.2)",
                          color: "var(--srcb-gold-light)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Database size={12} /> Method 3
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        All Examinations
                      </span>
                    </div>
                    <h4
                      style={{
                        fontSize: "0.98rem",
                        fontWeight: 700,
                        marginBottom: "0.35rem",
                      }}
                    >
                      Complete Database Export
                    </h4>
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-secondary)",
                        marginBottom: "1rem",
                        lineHeight: 1.4,
                      }}
                    >
                      Exports every scanned submission across all examinations
                      regardless of title or type into one comprehensive Excel
                      file.
                    </p>

                    <div
                      style={{
                        background: "rgba(8, 17, 32, 0.8)",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: "1rem",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.8rem",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>
                          Scanned Submissions:
                        </span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {submissions.length || mockSubmissions.length}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.8rem",
                        }}
                      >
                        <span style={{ color: "var(--text-muted)" }}>
                          Active Examinations:
                        </span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {exams.length || mockExams.length}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <button
                      className="btn"
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        fontSize: "0.82rem",
                        background: "var(--srcb-gold-accent)",
                        color: "#000",
                        fontWeight: 700,
                      }}
                      onClick={handleExportCompleteDatabase}
                    >
                      <Database size={14} /> Export Complete Database (.xlsx)
                    </button>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "6px",
                        textAlign: "center",
                      }}
                    >
                      🗄️ Master Workbook: Submissions, Exam Metrics & Roster
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div
                style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}
              >
                <div style={{ position: "relative", flex: 1 }}>
                  <Search
                    size={16}
                    style={{
                      position: "absolute",
                      left: "0.75rem",
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search by Student ID, Student Name, or Exam..."
                    style={{ paddingLeft: "2.25rem" }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {loadingSubmissions ? (
                <div className="spinner-container">
                  <div className="spinner"></div>
                </div>
              ) : (
                <SubmissionTable
                  submissions={submissions}
                  exams={exams}
                  roster={roster}
                  searchQuery={searchQuery}
                  onSelectSubmission={viewSubmissionDetails}
                  formatDate={formatDate}
                />
              )}
            </div>

            {/* Submission Detail Inspection Modal */}
            {selectedSubmission && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "rgba(0,0,0,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 999,
                  padding: "2rem",
                }}
              >
                <div
                  className="card"
                  style={{
                    width: "100%",
                    maxWidth: "650px",
                    maxHeight: "90vh",
                    overflowY: "auto",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    <h3 style={{ fontSize: "1.2rem" }}>Grading Summary</h3>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <button
                        className="btn btn-success"
                        style={{
                          padding: "0.25rem 0.65rem",
                          fontSize: "0.8rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                        }}
                        onClick={() =>
                          handleExportSingleSubmission(selectedSubmission)
                        }
                      >
                        <Download size={14} /> Export Single File (.xlsx)
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{
                          padding: "0.25rem 0.5rem",
                          fontSize: "0.8rem",
                        }}
                        onClick={() => setSelectedSubmission(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1rem",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Student Roster
                      </span>
                      <p
                        style={{
                          fontSize: "1rem",
                          fontWeight: 800,
                          margin: "2px 0 0 0",
                        }}
                      >
                        {roster.find(
                          (r) =>
                            r.student_id.toLowerCase() ===
                            (selectedSubmission.student_id || "").toLowerCase(),
                        )?.name ||
                          selectedSubmission.student_id ||
                          "N/A"}
                      </p>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        ID: {selectedSubmission.student_id}
                      </span>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Graded On
                      </span>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          margin: "2px 0 0 0",
                        }}
                      >
                        {formatDate(selectedSubmission.created_at)}
                      </p>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Exam Title
                      </span>
                      <p
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          margin: "2px 0 0 0",
                        }}
                      >
                        {exams.find((e) => e.id === selectedSubmission.exam_id)
                          ?.name || "Unknown Exam"}
                      </p>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Score Status
                      </span>
                      <div style={{ marginTop: "4px" }}>
                        <StatusBadge
                          score={selectedSubmission.score}
                          totalQuestions={selectedSubmission.total_questions}
                        />
                      </div>
                    </div>
                  </div>

                  <h4
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-secondary)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Bubble Check
                  </h4>
                  <div
                    className="bubble-sheet-card"
                    style={{
                      maxHeight: "350px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                    >
                      <div>
                        {Object.entries(selectedSubmission.answers)
                          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                          .slice(0, 25)
                          .map(([qStr, ansObj]) => {
                            const exam = exams.find(
                              (e) => e.id === selectedSubmission.exam_id,
                            );
                            const correctAns = exam?.answer_key[qStr];
                            const selected = ansObj.selected;
                            const isCorrect = selected === correctAns;

                            return (
                              <div
                                key={qStr}
                                className="bubble-row"
                                style={{
                                  padding: "0.2rem 0.5rem",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  className="bubble-num"
                                  style={{ width: "20px" }}
                                >
                                  {qStr}.
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: isCorrect
                                      ? "var(--success)"
                                      : "var(--error)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {ansObj.is_empty
                                    ? "No Mark"
                                    : `Marked "${selected}"`}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  (Key: {correctAns})
                                </span>
                              </div>
                            );
                          })}
                      </div>
                      <div>
                        {Object.entries(selectedSubmission.answers)
                          .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                          .slice(25)
                          .map(([qStr, ansObj]) => {
                            const exam = exams.find(
                              (e) => e.id === selectedSubmission.exam_id,
                            );
                            const correctAns = exam?.answer_key[qStr];
                            const selected = ansObj.selected;
                            const isCorrect = selected === correctAns;

                            return (
                              <div
                                key={qStr}
                                className="bubble-row"
                                style={{
                                  padding: "0.2rem 0.5rem",
                                  justifyContent: "space-between",
                                }}
                              >
                                <span
                                  className="bubble-num"
                                  style={{ width: "20px" }}
                                >
                                  {qStr}.
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: isCorrect
                                      ? "var(--success)"
                                      : "var(--error)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {ansObj.is_empty
                                    ? "No Mark"
                                    : `Marked "${selected}"`}
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.8rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  (Key: {correctAns})
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* OBE ITEM ANALYSIS TAB */}
        {activeTab === "item-analysis" && (
          <div>
            <div
              className="header-container"
              style={{
                marginBottom: "1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                  Outcome-Based Education (OBE) Item Analysis
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    margin: "0.2rem 0 0 0",
                  }}
                >
                  Evaluate test validity, question difficulty index (P), and
                  discrimination power (D).
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleExportItemAnalysis}
                >
                  <Download size={16} /> Export Item Analysis (.xlsx)
                </button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: "1.5rem" }}>
              <div
                style={{ display: "flex", gap: "1rem", alignItems: "center" }}
              >
                <label style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                  Select Exam to Analyze:
                </label>
                <select
                  className="form-input"
                  style={{ width: "auto", minWidth: "250px" }}
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                >
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id}>
                      {exam.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card">
              {activeExam ? (
                <>
                  {submissions.filter((s) => s.exam_id === activeExam.id)
                    .length === 0 && (
                    <div
                      className="alert-banner warning"
                      style={{ marginBottom: "1.25rem" }}
                    >
                      <AlertTriangle
                        size={16}
                        style={{ flexShrink: 0, marginTop: "2px" }}
                      />
                      <span>
                        <strong>No real submissions found</strong> for this exam
                        — the table below uses <strong>sample demo data</strong>{" "}
                        for illustration purposes. Grade actual student OMR
                        sheets first to generate a real Item Analysis report.
                      </span>
                    </div>
                  )}
                  <ItemAnalysisTable
                    examName={activeExam.name}
                    answerKey={activeExam.answer_key}
                    submissions={
                      submissions.filter((s) => s.exam_id === activeExam.id)
                        .length > 0
                        ? submissions.filter((s) => s.exam_id === activeExam.id)
                        : mockSubmissions
                    }
                  />
                </>
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "2rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Please select an exam above to view Item Analysis metrics.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
