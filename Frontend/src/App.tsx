import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart3,
  UploadCloud,
  History,
  Plus,
  BookOpen,
  GraduationCap,
  Search,
  Sparkles,
  FileUp,
  Trash2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  BarChart2,
  ShieldCheck,
  LogOut,
  Camera,
  FileText,
  Layers,
  Database,
  UserPlus,
  HelpCircle,
  Users,
  Bell,
  ChevronDown,
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
  updateExam,
  gradeSheet,
  extractSheet,
  fetchSubmissions,
  deleteExam,
  loginUser,
  fetchDashboardSummary,
} from "./api";
import { mockUsers } from "./data/mockData";
import {
  exportCHEDGradeSheet,
  exportItemAnalysisExcel,
  exportSingleSubmissionExcel,
  exportExamBatchExcel,
  exportCompleteDatabaseExcel,
} from "./utils/excelUtils";

// Imported Isolated UI Components
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
import UserGuideModal, { UserGuideCard } from "./components/UserGuideModal";
import { CameraScanner } from "./components/CameraScanner";
import ExamCreationModal from "./components/ExamCreationModal";
import ExamDetailsModal from "./components/ExamDetailsModal";
import AdminUserManagement from "./components/AdminUserManagement";
import DeanAcademicManagement from "./components/dean/DeanAcademicManagement";
import DeanExaminations from "./components/dean/DeanExaminations";
import DeanReportsAnalytics from "./components/dean/DeanReportsAnalytics";
import DeanSettings from "./components/dean/DeanSettings";

type AppTab =
  | "dashboard"
  | "academic-management"
  | "examinations"
  | "reports"
  | "settings"
  | "quick-scan"
  | "exams"
  | "history"
  | "item-analysis"
  | "user-guide"
  | "user-management"
  | "user-directory";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<AppTab>("dashboard");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedAuthUserId, setSelectedAuthUserId] = useState(mockUsers[0].id);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [, setAuthMessage] = useState("");

  // Core Data State
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [roster, setRoster] = useState<StudentRosterEntry[]>([]);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState({
    total_accounts: 0,
    total_students: 0,
    total_teachers: 0,
    total_exams: 0,
    average_score: 0,
    total_submissions: 0,
  });

  // Quick Scanner State
  const [quickScanMode, setQuickScanMode] = useState<"upload" | "camera">("upload");
  const [quickScanLoading, setQuickScanLoading] = useState(false);
  const [quickScanResult, setQuickScanResult] =
    useState<QuickScanResult | null>(null);

  // Exam Creation, Inspect & Filtering State
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [inspectExam, setInspectExam] = useState<Exam | null>(null);
  const [examListSearch, setExamListSearch] = useState("");
  const [examTypeFilter, setExamTypeFilter] = useState("All");
  const [examSemesterFilter, setExamSemesterFilter] = useState("All");

  // Active Exam Inspection & Grading State
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [studentScanMode, setStudentScanMode] = useState<"upload" | "camera">("upload");
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
  const [exportDbExamTypeFilter, setExportDbExamTypeFilter] =
    useState<string>("All");
  const [exportDbSemesterFilter, setExportDbSemesterFilter] =
    useState<string>("All");
  const [exportDbGroupBy, setExportDbGroupBy] = useState<"none" | "exam_type">(
    "none",
  );

  // Profile Menu State & Click-Outside Handling
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Refs for file uploads
  const quickScanInputRef = useRef<HTMLInputElement>(null);
  const studentScanInputRef = useRef<HTMLInputElement>(null);

  // Add a Toast Notification
  const addToast = (type: "success" | "error" | "info" | "warning", message: string) => {
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
      } else {
        setExams([]);
      }
    } catch (err) {
      console.error("Failed to load exams from API:", err);
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const data = await fetchSubmissions();
      setSubmissions(data && data.length > 0 ? data : []);
    } catch (err) {
      console.error("Failed to load submissions from API:", err);
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  const loadDashboardSummary = useCallback(async () => {
    try {
      const data = await fetchDashboardSummary();
      setDashboardSummary(data);
    } catch {
      setDashboardSummary({
        total_accounts: 12,
        total_students: 4,
        total_teachers: 4,
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

  // Handle Exam Submission Creation
  const handleSaveExamModal = async (
    examData: Omit<Exam, "id" | "created_at">,
    examId?: string,
  ) => {
    try {
      if (examId) {
        await updateExam(examId, {
          name: examData.name,
          answer_key: examData.answer_key,
          exam_type: examData.exam_type,
          academic_year: examData.academic_year,
          semester: examData.semester,
          subject: examData.subject,
          course_code: examData.course_code,
          section: examData.section,
          program: examData.program,
          instructor_name: examData.instructor_name,
          num_items: examData.num_items,
          passing_score: examData.passing_score,
          instructions: examData.instructions,
          exam_date: examData.exam_date,
        });

        setSelectedExamId(examId);
        setInspectExam(null);
        setEditingExam(null);
        await Promise.all([
          loadExams(),
          loadSubmissions(),
          loadDashboardSummary(),
        ]);
        return;
      }

      const created = await createExam({
        name: examData.name,
        answer_key: examData.answer_key,
        exam_type: examData.exam_type,
        academic_year: examData.academic_year,
        semester: examData.semester,
        subject: examData.subject,
        course_code: examData.course_code,
        section: examData.section,
        program: examData.program,
        instructor_name: examData.instructor_name,
        num_items: examData.num_items,
        passing_score: examData.passing_score,
        instructions: examData.instructions,
        exam_date: examData.exam_date,
      });

      setSelectedExamId(created.id);
      await Promise.all([
        loadExams(),
        loadSubmissions(),
        loadDashboardSummary(),
      ]);
    } catch (err: any) {
      // In mock / offline mode fallback
      const fallbackId = `ex-${Date.now()}`;
      const fallbackExam: Exam = {
        id: fallbackId,
        name: examData.name,
        answer_key: examData.answer_key,
        exam_type: examData.exam_type,
        academic_year: examData.academic_year,
        semester: examData.semester,
        subject: examData.subject,
        course_code: examData.course_code,
        section: examData.section,
        program: examData.program,
        instructor_name: examData.instructor_name,
        num_items: examData.num_items,
        passing_score: examData.passing_score,
        instructions: examData.instructions,
        exam_date: examData.exam_date,
        created_at: new Date().toISOString(),
      };
      setExams((prev) => [fallbackExam, ...prev]);
      setSelectedExamId(fallbackId);
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

    if (examSubs.length === 0) {
      addToast("warning", "No submissions available to export.");
      return;
    }

    exportCHEDGradeSheet(examName, examSubs, roster, targetExam);
    addToast(
      "success",
      `Exported CHED Transmuted Grade Sheet for "${examName}" (.xlsx)`,
    );
  };

  const handleExportItemAnalysis = () => {
    const targetExam = exams.find((e) => e.id === selectedExamId) || exams[0];
    if (!targetExam) {
      addToast("warning", "No examination available for item analysis.");
      return;
    }
    const examSubs = submissions.filter((s) => s.exam_id === targetExam.id);
    if (examSubs.length === 0) {
      addToast("warning", "No submissions available to analyze for this exam.");
      return;
    }
    exportItemAnalysisExcel(
      targetExam.name,
      targetExam.answer_key,
      examSubs,
      targetExam,
    );
    addToast(
      "success",
      `Exported OBE Item Analysis Report for "${targetExam.name}" (.xlsx)`,
    );
  };

  const handleExportSingleSubmission = (targetSub?: Submission | null) => {
    const subToExport =
      targetSub ||
      submissions.find((s) => s.id === exportSingleSubmissionId) ||
      selectedSubmission ||
      submissions[0];
    if (!subToExport) {
      addToast("error", "No submission selected for single file export.");
      return;
    }
    const targetExam = exams.find((e) => e.id === subToExport.exam_id);
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
    const targetExamId =
      exportBatchExamId || selectedExamId || exams[0]?.id || "";
    const targetExam = exams.find((e) => e.id === targetExamId) || exams[0];
    if (!targetExam) {
      addToast("error", "No examination selected for batch export.");
      return;
    }
    const examSubs = submissions.filter((s) => s.exam_id === targetExam.id);
    if (examSubs.length === 0) {
      addToast("warning", "No submissions found for this exam batch.");
      return;
    }

    exportExamBatchExcel(targetExam, examSubs, roster, exportExamType);
    addToast(
      "success",
      `Exam-Based Batch Export: Compiled ${examSubs.length} submissions for "${targetExam.name}" (${exportExamType}) with complete metadata into Excel (.xlsx)`,
    );
  };

  const handleExportCompleteDatabase = () => {
    if (exams.length === 0 && submissions.length === 0) {
      addToast("warning", "No database records available to export.");
      return;
    }
    exportCompleteDatabaseExcel(exams, submissions, roster, {
      examTypeFilter: exportDbExamTypeFilter,
      semesterFilter: exportDbSemesterFilter,
      groupBy: exportDbGroupBy,
    });
    addToast(
      "success",
      `Teacher Database Export: Exported filtered master database report (.xlsx)`,
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
    setActiveTab(selectedUser.role === "admin" ? "quick-scan" : "dashboard");
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
          backendUser.role === "admin"
            ? "Quick OMR Scanner & Account Provisioning"
            : backendUser.role === "dean"
              ? "Institution-wide access across all departments and programmes"
              : backendUser.role === "programme-head"
                ? `Restricted to ${backendUser.programme ?? "assigned programme"}`
                : backendUser.role === "teacher"
                  ? `Teaching access for ${backendUser.department ?? "assigned department"}`
                  : `Student access for ${backendUser.programme ?? "assigned programme"}`,
        permissions:
          backendUser.role === "admin"
            ? [
                "Quick OMR Sheet Scanner",
                "Create and Manage Teacher & Student Accounts",
                "Optical Mark Recognition Realtime Processing",
              ]
            : backendUser.role === "dean"
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
      setActiveTab(
        mappedUser.role === "admin"
          ? "quick-scan"
          : mappedUser.role === "dean"
            ? "academic-management"
            : "dashboard",
      );
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
        setActiveTab(
          foundMock.role === "admin"
            ? "quick-scan"
            : foundMock.role === "dean"
              ? "academic-management"
              : "dashboard",
        );
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

    if (currentUser.role === "admin") {
      return [
        { key: "quick-scan" as AppTab, label: "Quick Scanner", icon: Sparkles },
        {
          key: "user-management" as AppTab,
          label: "Create Account",
          icon: UserPlus,
        },
        {
          key: "user-directory" as AppTab,
          label: "User Accounts Directory",
          icon: Users,
        },
      ];
    }

    if (currentUser.role === "dean") {
      return [
        {
          key: "academic-management" as AppTab,
          label: "Academic Management",
          icon: BarChart3,
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
      setActiveTab(navigationItems[0]?.key || "dashboard");
    }
  };

  const getUserInitials = (name?: string) => {
    if (!name) return "AD";
    const cleaned = name.replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s+/i, "").trim();
    const parts = cleaned.split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (cleaned || name).slice(0, 2).toUpperCase();
  };

  const getDashboardDisplayName = (user: AuthUser | null) => {
    if (!user) return "Dashboard";
    if (user.role === "admin") return "System Administrator Dashboard";
    const name = user.name.trim();
    return name.endsWith("s") || name.endsWith("S")
      ? `${name}' Dashboard`
      : `${name}'s Dashboard`;
  };

  const getActiveTabTitle = (tab: AppTab) => {
    switch (tab) {
      case "dashboard":
        return getDashboardDisplayName(currentUser);
      case "examinations":
      case "exams":
        return "Examinations";
      case "quick-scan":
        return "Quick OMR Scanner";
      case "history":
        return "Grading History";
      case "academic-management":
        return currentUser?.role === "dean"
          ? "Academic Management"
          : "Programme Overview";
      case "reports":
        return "Institutional Reports";
      case "item-analysis":
        return "OBE Item Analysis";
      case "user-management":
        return "User Account Management";
      case "user-directory":
        return "Faculty & Student Directory";
      case "settings":
        return "System Settings";
      default:
        return "Dashboard";
    }
  };

  const getActiveTabSubtitle = (tab: AppTab) => {
    switch (tab) {
      case "dashboard":
        return `${submissions.length} submissions found • ${exams.length} active exams`;
      case "examinations":
      case "exams":
        return `${exams.length} active examination records found`;
      case "history":
        return `${submissions.length} graded test sheets recorded`;
      case "quick-scan":
        return "Instant zip-grade bubble sheet processing";
      case "item-analysis":
        return "Automated difficulty & discrimination indices";
      case "user-management":
        return "Manage roles, status, and permissions";
      default:
        return "St. Rita's College of Balingasag • Higher Education";
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
        onSelectMockUser={(userId: string) => {
          setSelectedAuthUserId(userId);
          const found = mockUsers.find((u) => u.id === userId);
          if (found) {
            let pass = "Admin@2025";
            if (found.role === "dean") pass = "Dean@2025";
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
    <div className="app-outer-wrapper">
      <div className="app-main-window">
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

        {/* Comprehensive Exam Creation Modal */}
        <ExamCreationModal
          isOpen={isExamModalOpen}
          onClose={() => {
            setIsExamModalOpen(false);
            setEditingExam(null);
            setInspectExam(null);
          }}
          onSave={handleSaveExamModal}
          currentUser={currentUser}
          addToast={addToast}
          editingExam={editingExam}
        />

        {/* Exam Details / Inspect Modal */}
        <ExamDetailsModal
          exam={inspectExam}
          isOpen={inspectExam !== null}
          onClose={() => setInspectExam(null)}
          onDelete={(id) => {
            handleDeleteExam(id);
            setInspectExam(null);
          }}
          onEdit={(exam) => {
            setInspectExam(null);
            setEditingExam(exam);
            setIsExamModalOpen(true);
          }}
          formatDate={formatDate}
        />

        <UserGuideModal
          isOpen={isUserGuideOpen}
          onClose={() => setIsUserGuideOpen(false)}
          initialRole={currentUser?.role ?? "teacher"}
          onNavigateTab={(tab) => {
            setIsUserGuideOpen(false);
            handleTabSelect(tab as AppTab);
          }}
        />

        {/* Reference Electric Blue Sidebar with Curved Cutout Active Tab */}
        <aside className="sidebar-curved">
          <div className="sidebar-brand-header">
            <div className="sidebar-brand-badge">
              <Sparkles size={18} />
            </div>
            <span>AeroOMR</span>
          </div>

          <ul className="sidebar-curved-menu">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <li
                  key={item.key}
                  className={`sidebar-curved-item ${isActive ? "active" : ""}`}
                  onClick={() => {
                    if (item.key === "user-guide") {
                      setIsUserGuideOpen(true);
                      return;
                    }
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
                  <Icon size={19} className="nav-icon" />
                  <span>{item.label}</span>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main Content Area */}
        <main className="main-content-reference">
          {/* Top Header matching reference */}
          <div className="reference-top-header">
            <div className="reference-header-left">
              <h1>{getActiveTabTitle(activeTab)}</h1>
              <p>{getActiveTabSubtitle(activeTab)}</p>
            </div>

            <div className="reference-header-right">
              <div className="header-search-box">
                <Search size={15} className="header-search-icon" />
                <input
                  type="text"
                  className="header-search-input"
                  placeholder="Search exams or students..."
                  value={examListSearch}
                  onChange={(e) => setExamListSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="header-icon-btn"
                title="Notifications"
                onClick={() =>
                  addToast("info", "All systems operational. No unread alerts.")
                }
              >
                <Bell size={18} />
                <span className="header-notif-dot" />
              </button>

              <div className="header-profile-container" ref={profileMenuRef}>
                <div
                  className={`header-user-profile ${isProfileMenuOpen ? "active" : ""}`}
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  title="Account Profile & Sign Out"
                >
                  <div className="header-user-avatar">
                    {getUserInitials(currentUser?.name)}
                  </div>
                  <div>
                    <div className="header-user-name">
                      {currentUser?.name ?? "Admin"}
                    </div>
                    <div className="header-user-role">
                      {currentUser?.role.replace("-", " ") ?? "Administrator"}
                    </div>
                  </div>
                  <ChevronDown
                    size={14}
                    style={{
                      color: "#94a3b8",
                      marginLeft: "2px",
                      transform: isProfileMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </div>

                {isProfileMenuOpen && (
                  <div className="header-profile-dropdown">
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {getUserInitials(currentUser?.name)}
                      </div>
                      <div className="profile-dropdown-info">
                        <div className="profile-dropdown-name">{currentUser?.name}</div>
                        <div className="profile-dropdown-email">{currentUser?.email}</div>
                        <span className="profile-dropdown-role-badge">
                          {currentUser?.role.replace("-", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="profile-dropdown-actions" style={{ padding: "0.5rem" }}>
                      <button
                        type="button"
                        className="profile-dropdown-btn logout"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsSignOutModalOpen(true);
                        }}
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DASHBOARD TAB - AUTHENTIC ACADEMIC ROLE DASHBOARD */}
          {activeTab === "dashboard" && currentUser && (
            <RoleDashboard
              user={currentUser}
              summary={dashboardSummary}
              exams={exams}
              submissions={submissions}
              roster={roster}
              onSelectSubmission={viewSubmissionDetails}
              onInspectExam={(exam) => setInspectExam(exam)}
              addToast={addToast}
              formatDate={formatDate}
            />
          )}

        {activeTab === "academic-management" && currentUser && (
          <DeanAcademicManagement
            currentUser={currentUser}
            summary={dashboardSummary}
            exams={exams}
            submissions={submissions}
            roster={roster}
            onInspectExam={(exam) => setInspectExam(exam)}
            addToast={addToast}
          />
        )}

        {activeTab === "examinations" && currentUser && (
          <DeanExaminations
            currentUser={currentUser}
            exams={exams}
            submissions={submissions}
            roster={roster}
            onInspectExam={(exam) => setInspectExam(exam)}
            addToast={addToast}
            formatDate={formatDate}
          />
        )}

        {activeTab === "reports" && currentUser && (
          <DeanReportsAnalytics
            currentUser={currentUser}
            exams={exams}
            submissions={submissions}
            roster={roster}
            summary={dashboardSummary}
            addToast={addToast}
          />
        )}

        {activeTab === "settings" && currentUser && (
          <DeanSettings
            currentUser={currentUser}
            addToast={addToast}
          />
        )}

        {/* CREATE ACCOUNT TAB (ADMIN) */}
        {activeTab === "user-management" && currentUser && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                Create Institutional Account
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Provision and authorize active Teacher and Student accounts.
              </p>
            </div>

            <AdminUserManagement
              currentUser={currentUser}
              addToast={addToast}
              formatDate={formatDate}
              viewMode="create"
            />
          </div>
        )}

        {/* USER ACCOUNTS DIRECTORY TAB (ADMIN) */}
        {activeTab === "user-directory" && currentUser && (
          <div>
            <div
              className="header-container"
              style={{ marginBottom: "1.5rem" }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                User Accounts Directory
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                  margin: "0.2rem 0 0 0",
                }}
              >
                Search, inspect, and manage all registered institutional accounts across faculty and students.
              </p>
            </div>

            <AdminUserManagement
              currentUser={currentUser}
              addToast={addToast}
              formatDate={formatDate}
              viewMode="directory"
            />
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

            <div className="scan-mode-tabs">
              <button
                type="button"
                className={`scan-mode-tab-btn ${quickScanMode === "upload" ? "active" : ""}`}
                onClick={() => setQuickScanMode("upload")}
              >
                <UploadCloud size={16} /> Upload File
              </button>
              <button
                type="button"
                className={`scan-mode-tab-btn ${quickScanMode === "camera" ? "active" : ""}`}
                onClick={() => setQuickScanMode("camera")}
              >
                <Camera size={16} /> Scan with Camera
              </button>
            </div>

            {quickScanMode === "camera" ? (
              <CameraScanner
                onCapture={handleQuickScanUpload}
                onSwitchToUpload={() => setQuickScanMode("upload")}
                title="Quick Bubble Camera Scanner"
                subtitle="Point camera at the ZipGrade answer sheet. Align corners and hold steady to auto-capture."
              />
            ) : (
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
            )}

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
                flexWrap: "wrap",
                gap: "1rem",
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
                  Manage complete examination details, answer keys, and grade
                  student sheets.
                </p>
              </div>
              <div
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}
              >
                <button
                  className="btn btn-secondary"
                  onClick={handleExportGradeSheet}
                >
                  <Download size={16} /> Export CHED Grade Sheet (.xlsx)
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsExamModalOpen(true)}
                  style={{ fontWeight: 700 }}
                >
                  <Plus size={18} /> Create Examination
                </button>
              </div>
            </div>

            {/* Exam List and Grading Section */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "2rem",
              }}
            >
              {/* Searchable & Filterable Exams Feed */}
              <div
                className="card"
                style={{ display: "flex", flexDirection: "column" }}
              >
                <div style={{ marginBottom: "1rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <h3 style={{ fontSize: "1.1rem", margin: 0 }}>
                      Examinations Directory
                    </h3>
                    <span
                      className="badge badge-info"
                      style={{ fontSize: "0.75rem" }}
                    >
                      {exams.length} Total
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div style={{ position: "relative", marginBottom: "0.6rem" }}>
                    <Search
                      size={15}
                      style={{
                        position: "absolute",
                        left: "0.6rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                      }}
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search title, subject, code, section..."
                      style={{ paddingLeft: "2rem", fontSize: "0.8rem" }}
                      value={examListSearch}
                      onChange={(e) => setExamListSearch(e.target.value)}
                    />
                  </div>

                  {/* Filter Selectors */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        Exam Type:
                      </label>
                      <select
                        className="form-input"
                        style={{
                          fontSize: "0.78rem",
                          padding: "0.3rem 0.5rem",
                        }}
                        value={examTypeFilter}
                        onChange={(e) => setExamTypeFilter(e.target.value)}
                      >
                        <option value="All">All Types</option>
                        <option value="Preliminary">Preliminary</option>
                        <option value="Midterm">Midterm</option>
                        <option value="Pre-Final">Pre-Final</option>
                        <option value="Final">Final</option>
                      </select>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                          display: "block",
                          marginBottom: "2px",
                        }}
                      >
                        Semester:
                      </label>
                      <select
                        className="form-input"
                        style={{
                          fontSize: "0.78rem",
                          padding: "0.3rem 0.5rem",
                        }}
                        value={examSemesterFilter}
                        onChange={(e) => setExamSemesterFilter(e.target.value)}
                      >
                        <option value="All">All Semesters</option>
                        <option value="1st Semester">1st Semester</option>
                        <option value="2nd Semester">2nd Semester</option>
                        <option value="Summer">Summer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loadingExams ? (
                  <div className="spinner-container">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  (() => {
                    const filtered = exams.filter((ex) => {
                      const q = examListSearch.toLowerCase().trim();
                      const matchesSearch =
                        !q ||
                        ex.name.toLowerCase().includes(q) ||
                        (ex.subject && ex.subject.toLowerCase().includes(q)) ||
                        (ex.course_code &&
                          ex.course_code.toLowerCase().includes(q)) ||
                        (ex.section && ex.section.toLowerCase().includes(q)) ||
                        (ex.instructor_name &&
                          ex.instructor_name.toLowerCase().includes(q));

                      const matchesType =
                        examTypeFilter === "All" ||
                        (ex.exam_type || "").toLowerCase() ===
                          examTypeFilter.toLowerCase();

                      const matchesSem =
                        examSemesterFilter === "All" ||
                        (ex.semester || "1st Semester").toLowerCase() ===
                          examSemesterFilter.toLowerCase();

                      return matchesSearch && matchesType && matchesSem;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.85rem",
                            padding: "1.5rem 0",
                            textAlign: "center",
                          }}
                        >
                          No matching examinations found. Try adjusting your
                          filters or click "Create Examination".
                        </div>
                      );
                    }

                    return (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.75rem",
                          maxHeight: "520px",
                          overflowY: "auto",
                        }}
                      >
                        {filtered.map((exam) => (
                          <ExamCard
                            key={exam.id}
                            exam={exam}
                            isSelected={selectedExamId === exam.id}
                            onSelect={(id) => {
                              setSelectedExamId(id);
                              setLatestGradeResult(null);
                            }}
                            onInspect={(e) => setInspectExam(e)}
                            onDelete={handleDeleteExam}
                            formatDate={formatDate}
                          />
                        ))}
                      </div>
                    );
                  })()
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

                    <div style={{ marginBottom: "1.5rem" }}>
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
                        <h4 style={{ margin: 0, fontSize: "0.95rem" }}>
                          Grade Student OMR Sheets
                        </h4>
                        <div className="scan-mode-tabs" style={{ margin: 0 }}>
                          <button
                            type="button"
                            className={`scan-mode-tab-btn ${studentScanMode === "upload" ? "active" : ""}`}
                            onClick={() => setStudentScanMode("upload")}
                          >
                            <UploadCloud size={15} /> Upload Files
                          </button>
                          <button
                            type="button"
                            className={`scan-mode-tab-btn ${studentScanMode === "camera" ? "active" : ""}`}
                            onClick={() => setStudentScanMode("camera")}
                          >
                            <Camera size={15} /> Scan with Camera
                          </button>
                        </div>
                      </div>

                      {studentScanMode === "camera" ? (
                        <div style={{ marginBottom: "1.5rem" }}>
                          <CameraScanner
                            onCapture={async (file) => {
                              await handleGradeSheetsSubmit([file]);
                            }}
                            onSwitchToUpload={() => setStudentScanMode("upload")}
                            onClose={() => setStudentScanMode("upload")}
                            title={`Grade Student Sheet — ${activeExam.name}`}
                            subtitle={`Point camera at the ZipGrade answer sheet. Live corner detection and automatic scoring against ${activeExam.name}.`}
                          />

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
                                <span>Grading captured student sheet...</span>
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

                          <details
                            style={{
                              marginTop: "1rem",
                              background: "rgba(15, 23, 42, 0.5)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)",
                              padding: "0.75rem 1rem",
                            }}
                          >
                            <summary
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                color: "var(--text-secondary)",
                              }}
                            >
                              View Configured Answer Key ({Object.keys(activeExam.answer_key || {}).length} Questions)
                            </summary>
                            <div
                              style={{
                                maxHeight: "160px",
                                overflowY: "auto",
                                marginTop: "0.75rem",
                                borderTop: "1px solid var(--border)",
                                paddingTop: "0.5rem",
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
                                  {Object.entries(activeExam.answer_key || {})
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
                          </details>
                        </div>
                      ) : (
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
                      )}
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
                          (submissions.length > 0 ? submissions[0].id : "")
                        }
                        onChange={(e) =>
                          setExportSingleSubmissionId(e.target.value)
                        }
                      >
                        {submissions.length === 0 ? (
                          <option value="">No submissions available</option>
                        ) : (
                          submissions.map((sub) => {
                            const matchedStudent = roster.find(
                              (r) =>
                                r.student_id.toLowerCase() ===
                                (sub.student_id || "").toLowerCase(),
                            );
                            const matchedExam = exams.find(
                              (e) => e.id === sub.exam_id,
                            );
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
                          })
                        )}
                      </select>
                    </div>
                  </div>

                  <div>
                    <button
                      className="btn btn-secondary"
                      disabled={submissions.length === 0}
                      style={{
                        width: "100%",
                        justifyContent: "center",
                        fontSize: "0.82rem",
                      }}
                      onClick={() => {
                        const targetId =
                          exportSingleSubmissionId || (submissions[0]?.id ?? "");
                        const targetSub =
                          submissions.find((s) => s.id === targetId) ||
                          submissions[0];
                        if (targetSub) {
                          handleExportSingleSubmission(targetSub);
                        } else {
                          addToast("warning", "No submission available to export.");
                        }
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
                            (exams.length > 0 ? exams[0].id : "")
                          }
                          onChange={(e) => setExportBatchExamId(e.target.value)}
                        >
                          {exams.length === 0 ? (
                            <option value="">No exams available</option>
                          ) : (
                            exams.map((ex) => (
                              <option key={ex.id} value={ex.id}>
                                {ex.name}
                              </option>
                            ))
                          )}
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
                        marginBottom: "0.75rem",
                        lineHeight: 1.4,
                      }}
                    >
                      Exports filtered or grouped master database reports with
                      full institutional headers and complete examination
                      details.
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gap: "0.5rem",
                        marginBottom: "1rem",
                        background: "rgba(8, 17, 32, 0.8)",
                        padding: "0.75rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "2px",
                          }}
                        >
                          Filter by Exam Type:
                        </label>
                        <select
                          className="form-input"
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.3rem 0.5rem",
                          }}
                          value={exportDbExamTypeFilter}
                          onChange={(e) =>
                            setExportDbExamTypeFilter(e.target.value)
                          }
                        >
                          <option value="All">All Exam Types</option>
                          <option value="Preliminary">Preliminary Only</option>
                          <option value="Midterm">Midterm Only</option>
                          <option value="Pre-Final">Pre-Final Only</option>
                          <option value="Final">Final Only</option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "2px",
                          }}
                        >
                          Filter by Semester:
                        </label>
                        <select
                          className="form-input"
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.3rem 0.5rem",
                          }}
                          value={exportDbSemesterFilter}
                          onChange={(e) =>
                            setExportDbSemesterFilter(e.target.value)
                          }
                        >
                          <option value="All">All Semesters</option>
                          <option value="1st Semester">1st Semester</option>
                          <option value="2nd Semester">2nd Semester</option>
                          <option value="Summer">Summer Term</option>
                        </select>
                      </div>

                      <div>
                        <label
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "2px",
                          }}
                        >
                          Multi-Sheet Grouping:
                        </label>
                        <select
                          className="form-input"
                          style={{
                            fontSize: "0.78rem",
                            padding: "0.3rem 0.5rem",
                          }}
                          value={exportDbGroupBy}
                          onChange={(e) =>
                            setExportDbGroupBy(
                              e.target.value as "none" | "exam_type",
                            )
                          }
                        >
                          <option value="none">Standard Master Sheets</option>
                          <option value="exam_type">
                            Group Sheets by Exam Type
                          </option>
                        </select>
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
                      <Database size={14} /> Export Master Database (.xlsx)
                    </button>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        marginTop: "6px",
                        textAlign: "center",
                      }}
                    >
                      🗄️ Filtered Workbook: Full Metadata, Metrics & Grouped
                      Sheets
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
                    submissions={submissions.filter(
                      (s) => s.exam_id === activeExam.id,
                    )}
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

        {/* USER GUIDE TAB (DEDICATED IN-PAGE CONTAINER CARD) */}
        {activeTab === "user-guide" && (
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
                  AeroOMR User Guide & System Manual
                </h2>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    margin: "0.2rem 0 0 0",
                  }}
                >
                  Role-specific instructions, OMR bubble sheet scanning standards, and OBE item analysis guidelines.
                </p>
              </div>
            </div>

            <UserGuideCard
              initialRole={currentUser?.role ?? "teacher"}
              onNavigateTab={(tab) => handleTabSelect(tab as AppTab)}
            />
          </div>
        )}

        {/* Submission Detail Inspection Modal - Global (works from any tab) */}
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
      </main>

      {/* Sign Out Confirmation Modal */}
      {isSignOutModalOpen && (
        <div
          className="modal-overlay"
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
          onClick={() => setIsSignOutModalOpen(false)}
        >
          <div
            className="card"
            style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
              border: "1px solid #e2e8f0",
              animation: "modalScaleIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.85rem",
                marginBottom: "1rem",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#fee2e2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <LogOut size={22} />
              </div>
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.2rem",
                    fontWeight: 800,
                    color: "#0f172a",
                  }}
                >
                  Confirm Sign Out
                </h3>
                <p
                  style={{
                    margin: "0.2rem 0 0 0",
                    fontSize: "0.85rem",
                    color: "#64748b",
                  }}
                >
                  End active institutional session
                </p>
              </div>
            </div>

            <p
              style={{
                fontSize: "0.92rem",
                color: "#475569",
                lineHeight: 1.5,
                margin: "0 0 1.5rem 0",
              }}
            >
              Are you sure you want to sign out of{" "}
              <strong style={{ color: "#0f172a" }}>
                {currentUser?.name || "your account"}
              </strong>
              ? You will need to sign in again to access your institutional workspace.
            </p>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "0.75rem",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsSignOutModalOpen(false)}
                style={{
                  padding: "0.6rem 1.1rem",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setIsSignOutModalOpen(false);
                  handleSignOut();
                }}
                style={{
                  padding: "0.6rem 1.25rem",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  borderRadius: "8px",
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
                }}
              >
                <LogOut size={16} />
                <span>Yes, Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating User Guide Question Mark Button (Bottom-Right) */}
      <button
        type="button"
        onClick={() => setIsUserGuideOpen(true)}
        className="floating-help-btn"
        title="Open User Guide & Documentation"
        aria-label="Open User Guide"
      >
        <HelpCircle size={24} />
        <span className="floating-help-tooltip">Open User Guide</span>
      </button>
    </div>
  </div>
  );
}
