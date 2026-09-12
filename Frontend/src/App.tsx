import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  BarChart3,
  UploadCloud,
  History,
  ArrowLeft,
  Plus,
  BookOpen,
  GraduationCap,
  Search,
  Sparkles,
  Trash2,
  AlertTriangle,
  Download,
  BarChart2,
  Award,
  LogOut,
  Camera,
  UserPlus,
  HelpCircle,
  Users,
  Bell,
  ChevronDown,
  ChevronRight,
  Sliders,
  Activity,
  Menu,
  X,
  Home,
  Eye,
  CheckCircle2,
  Key,
  Maximize2,
  Check,
} from "lucide-react";
import confetti from "canvas-confetti";
import type {
  AuthUser,
  Exam,
  Submission,
  QuickScanResult,
  GradeResult,
  StudentRosterEntry,
  AppNotification,
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
import { mockUsers, mockClassRoster, mockExams, mockSubmissions } from "./data/mockData";
import {
  exportCHEDGradeSheet,
  exportItemAnalysisExcel,
  exportSingleSubmissionExcel,
  calculateTransmutedGrade,
} from "./utils/excelUtils";
import { cacheManager } from "./utils/cacheManager";

// Shared Cross-Cutting UI Components
import {
  StatusBadge,
  ToastNotification,
  type ToastItem,
  SkeletonExamList,
  SmoothContentTransition,
  UserGuideModal,
  UserGuideCard,
  NotificationDropdown,
} from "./components/shared";

// Feature Domain Modules
import {
  ExamCard,
  RosterImportModal,
  ItemAnalysisTable,
  ExamCreationModal,
  ExamDetailsModal,
} from "./components/exam";
import { RoleDashboard } from "./components/dashboard";
import {
  LoginPage,
  getStoredAuthUser,
  storeAuthUser,
  getStoredActiveTab,
  storeActiveTab,
  clearAuthSession,
} from "./components/auth";
import { CameraScanner } from "./components/camera";
import { AdminUserManagement } from "./components/admin";
import { TeacherExamCompiler } from "./components/teacher";
import GradingHistoryView from "./components/GradingHistoryView";
import {
  DeanAcademicManagement,
  DeanExaminations,
  DeanReportsAnalytics,
  DeanSettings,
  DeanProgressRecords,
} from "./components/dean";
import { StudentPortalView } from "./components/student";

type AppTab =
  | "dashboard"
  | "academic-management"
  | "examinations"
  | "reports"
  | "progress-records"
  | "settings"
  | "quick-scan"
  | "exams"
  | "compiler"
  | "results-management"
  | "history"
  | "item-analysis"
  | "user-guide"
  | "user-management"
  | "user-directory";

const getDefaultNotifications = (role?: string): AppNotification[] => {
  if (role === "admin") {
    return [
      {
        id: "notif-adm-1",
        title: "New Student Account Created",
        message: "Mark Kevin Alcantara (ID: 2023-00155) was successfully activated under BSIT.",
        timestamp: "5m ago",
        type: "user",
        read: false,
        targetTab: "user-directory",
      },
      {
        id: "notif-adm-2",
        title: "Automated System Backup",
        message: "Institutional examination database & OMR records backup completed securely.",
        timestamp: "1h ago",
        type: "success",
        read: false,
        targetTab: "dashboard",
      },
      {
        id: "notif-adm-3",
        title: "Quick Scanner WASM Initialized",
        message: "OpenCV 4.8.0 Computer Vision worker ready for rapid 50-item bubble sheet grading.",
        timestamp: "3h ago",
        type: "info",
        read: true,
        targetTab: "quick-scan",
      },
    ];
  }

  if (role === "dean") {
    return [
      {
        id: "notif-dean-1",
        title: "Midterm Examination Milestone",
        message: "95.2% of Higher Education midterm examinations are encoded and graded.",
        timestamp: "10m ago",
        type: "exam",
        read: false,
        targetTab: "dashboard",
      },
      {
        id: "notif-dean-2",
        title: "New Course Examination Published",
        message: "Ms. Jenny Garcia compiled IT 311: Advanced Web Systems.",
        timestamp: "45m ago",
        type: "success",
        read: false,
        targetTab: "examinations",
      },
      {
        id: "notif-dean-3",
        title: "OBE Item Analysis Alert",
        message: "CS 201 Item #14 flagged with high difficulty index (P = 0.28).",
        timestamp: "2h ago",
        type: "warning",
        read: true,
        targetTab: "reports",
      },
    ];
  }

  if (role === "programme-head") {
    return [
      {
        id: "notif-ph-1",
        title: "BSIT Program Exam Submissions",
        message: "BSIT 3A and 3B answer sheets submitted for outcomes-based OBE evaluation.",
        timestamp: "15m ago",
        type: "exam",
        read: false,
        targetTab: "academic-management",
      },
      {
        id: "notif-ph-2",
        title: "Enrolled Student Directory Sync",
        message: "Active student roster updated for 1st Semester academic term.",
        timestamp: "1h ago",
        type: "user",
        read: false,
        targetTab: "user-directory",
      },
    ];
  }

  if (role === "teacher") {
    return [
      {
        id: "notif-tch-1",
        title: "ZipGrade 50-Item Batch Graded",
        message: "Batch answer sheets processed with 100% accuracy in Examination Compiler.",
        timestamp: "8m ago",
        type: "grade",
        read: false,
        targetTab: "compiler",
      },
      {
        id: "notif-tch-2",
        title: "Student Transmuted Scores Computed",
        message: "Philippine 1.00 - 5.00 transmutation curve generated for midterm exam.",
        timestamp: "1h ago",
        type: "success",
        read: false,
        targetTab: "history",
      },
      {
        id: "notif-tch-3",
        title: "Bubble Sheet Calibration Note",
        message: "Remember to ensure 4 corner black alignment squares are visible when scanning.",
        timestamp: "1d ago",
        type: "info",
        read: true,
        targetTab: "quick-scan",
      },
    ];
  }

  // Student
  return [
    {
      id: "notif-stu-1",
      title: "New Examination Result Published",
      message: "Your score for IT 311: Advanced Web Systems is now available to view.",
      timestamp: "12m ago",
      type: "grade",
      read: false,
      targetTab: "examinations",
    },
    {
      id: "notif-stu-2",
      title: "Question-by-Question Item Breakdown",
      message: "Inspect your bubble sheet scan & answer key feedback in Student Portal.",
      timestamp: "1h ago",
      type: "info",
      read: true,
      targetTab: "reports",
    },
  ];
};

export default function App() {
  // Navigation & Persistent Auth State (Restores user & tab on refresh)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(
    () => getStoredAuthUser()
  );
  const [activeTab, setActiveTab] = useState<AppTab>(() => {
    const saved = getStoredActiveTab();
    if (saved) return saved as AppTab;
    const user = getStoredAuthUser();
    if (user?.role === "admin") return "dashboard";
    if (user?.role === "programme-head") return "academic-management";
    return "dashboard";
  });


  // Mobile Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [selectedAuthUserId, setSelectedAuthUserId] = useState(mockUsers[0].id);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [, setAuthMessage] = useState("");

  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const user = getStoredAuthUser();
    const cached = user ? cacheManager.get<AppNotification[]>(`notifications_${user.id}`) : null;
    return cached || getDefaultNotifications(user?.role);
  });
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement>(null);

  // Sync notifications when user changes
  useEffect(() => {
    if (currentUser) {
      const cached = cacheManager.get<AppNotification[]>(`notifications_${currentUser.id}`);
      setNotifications(cached || getDefaultNotifications(currentUser.role));
    }
  }, [currentUser?.id, currentUser?.role]);

  const saveNotifications = (newNotifs: AppNotification[]) => {
    setNotifications(newNotifs);
    if (currentUser) {
      cacheManager.set(`notifications_${currentUser.id}`, newNotifs);
    }
  };

  const handleMarkAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleClearAll = () => {
    saveNotifications([]);
  };

  const handleDeleteNotification = (id: string) => {
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const handleSelectNotification = (notif: AppNotification) => {
    handleMarkAsRead(notif.id);
    setIsNotificationMenuOpen(false);
    if (notif.targetTab) {
      handleTabSelect(notif.targetTab as AppTab);
    }
  };

  // Core Data State (Instant hydration from cache with mock fallback)
  const [exams, setExams] = useState<Exam[]>(
    () => cacheManager.get<Exam[]>("exams") || mockExams
  );
  const [submissions, setSubmissions] = useState<Submission[]>(
    () => cacheManager.get<Submission[]>("submissions") || mockSubmissions
  );
  const [roster, setRoster] = useState<StudentRosterEntry[]>(
    () => cacheManager.get<StudentRosterEntry[]>("roster") || mockClassRoster
  );
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  const [loadingExams, setLoadingExams] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [dashboardSummary, setDashboardSummary] = useState<{
    total_accounts: number;
    total_students: number;
    total_teachers: number;
    total_exams: number;
    average_score: number;
    total_submissions: number;
  }>(
    () =>
      cacheManager.get<{
        total_accounts: number;
        total_students: number;
        total_teachers: number;
        total_exams: number;
        average_score: number;
        total_submissions: number;
      }>("dashboard_summary") || {
        total_accounts: 0,
        total_students: 0,
        total_teachers: 0,
        total_exams: 0,
        average_score: 0,
        total_submissions: 0,
      }
  );

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
  const [examAcademicYearFilter, setExamAcademicYearFilter] = useState("All");
  const [examProgramFilter, setExamProgramFilter] = useState("All");

  const examAcademicYears = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.academic_year) set.add(e.academic_year);
    });
    return ["All", ...Array.from(set).sort().reverse()];
  }, [exams]);

  const examPrograms = useMemo(() => {
    const set = new Set<string>();
    exams.forEach((e) => {
      if (e.program) set.add(e.program);
      else if (e.course_code) set.add(e.course_code);
    });
    return ["All", ...Array.from(set).sort()];
  }, [exams]);

  // Active Exam Inspection & Grading State
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  const [gradingProgress, setGradingProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [latestGradeResult, setLatestGradeResult] =
    useState<GradeResult | null>(null);

  // Submissions State
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);


  const [activeExamStudioTab, setActiveExamStudioTab] = useState<
    "grading" | "answer-key"
  >("grading");
  const [gradeResultFilter, setGradeResultFilter] = useState<
    "all" | "correct" | "incorrect" | "ambiguous"
  >("all");
  const [isOverlayZoomOpen, setIsOverlayZoomOpen] = useState(false);

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
      if (
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(event.target as Node)
      ) {
        setIsNotificationMenuOpen(false);
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

  const loadExams = useCallback(async (forceRefresh = false) => {
    const hasCached = cacheManager.has("exams");
    if (!hasCached || forceRefresh) {
      setLoadingExams(true);
    }
    try {
      const data = await fetchExams({ forceRefresh });
      if (data && data.length > 0) {
        setExams(data);
        setSelectedExamId((prev) => {
          if (prev && data.some((exam) => exam.id === prev)) {
            return prev;
          }
          return data[0]?.id ?? "";
        });
      } else {
        setExams(mockExams);
        if (mockExams.length > 0) {
          setSelectedExamId((prev) => (prev ? prev : mockExams[0].id));
        }
      }
    } catch (err) {
      console.error("Failed to load exams from API:", err);
      if (!hasCached) {
        setExams(mockExams);
        if (mockExams.length > 0) {
          setSelectedExamId((prev) => (prev ? prev : mockExams[0].id));
        }
      }
    } finally {
      setLoadingExams(false);
    }
  }, []);

  const loadSubmissions = useCallback(async (forceRefresh = false) => {
    const hasCached = cacheManager.has("submissions");
    if (!hasCached || forceRefresh) {
      setLoadingSubmissions(true);
    }
    try {
      const data = await fetchSubmissions(undefined, { forceRefresh });
      setSubmissions(data && data.length > 0 ? data : (hasCached ? [] : mockSubmissions));
    } catch (err) {
      console.error("Failed to load submissions from API:", err);
      if (!hasCached) setSubmissions(mockSubmissions);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  const loadDashboardSummary = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchDashboardSummary({ forceRefresh });
      if (data) {
        setDashboardSummary(data);
      }
    } catch {
      if (!cacheManager.has("dashboard_summary")) {
        setDashboardSummary({
          total_accounts: 12,
          total_students: 4,
          total_teachers: 4,
          total_exams: 0,
          average_score: 0,
          total_submissions: 0,
        });
      }
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
          loadExams(true),
          loadSubmissions(true),
          loadDashboardSummary(true),
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
        loadExams(true),
        loadSubmissions(true),
        loadDashboardSummary(true),
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
    await Promise.all([loadSubmissions(true), loadDashboardSummary(true)]);

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
        loadExams(true),
        loadSubmissions(true),
        loadDashboardSummary(true),
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

  const handleDeleteGradingRecord = (examId: string) => {
    setSubmissions((prev) => prev.filter((s) => s.exam_id !== examId));
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

    const initialTab: AppTab =
      selectedUser.role === "admin"
        ? "quick-scan"
        : selectedUser.role === "programme-head"
          ? "academic-management"
          : "dashboard";

    storeAuthUser(selectedUser);
    storeActiveTab(initialTab);
    setCurrentUser(selectedUser);
    setActiveTab(initialTab);
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
        studentId: backendUser.student_id || backendUser.studentId || undefined,
        student_id: backendUser.student_id || backendUser.studentId || undefined,
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
                "Monitor examination results across all Higher Education programs",
                "View student examination scores and academic performance",
                "Monitor examinations handled by teachers",
                "View overall examination progress and records",
                "Manage and oversee user access within the system",
              ]
              : backendUser.role === "programme-head"
                ? [
                  "Monitor examination results within their assigned academic program only",
                  "View student scores and examination records for their program",
                  "Monitor examinations handled by teachers under their program",
                  "Access examination records and reports within their assigned program",
                ]
                : backendUser.role === "teacher"
                  ? [
                    "Manage courses and subjects",
                    "Create and manage examinations",
                    "Create and maintain answer keys",
                    "Upload and automatically process student test papers",
                    "Automatically check and grade student test papers",
                    "Record student submissions and examination scores",
                    "Release and publish grading results for students to view",
                    "Review processed test papers and grading results",
                    "Manage examination records",
                  ]
                  : [
                    "View their own examination scores",
                    "View which exam questions were answered correctly or incorrectly",
                    "Access only their personal examination records",
                  ],
      };

      const initialTab: AppTab =
        mappedUser.role === "admin"
          ? "dashboard"
          : mappedUser.role === "programme-head"
            ? "academic-management"
            : "dashboard";

      storeAuthUser(mappedUser);
      storeActiveTab(initialTab);
      setSelectedAuthUserId(mappedUser.id);
      setCurrentUser(mappedUser);
      setActiveTab(initialTab);
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
        const initialTab: AppTab =
          foundMock.role === "admin"
            ? "dashboard"
            : foundMock.role === "programme-head"
              ? "academic-management"
              : "dashboard";

        storeAuthUser(foundMock);
        storeActiveTab(initialTab);
        setSelectedAuthUserId(foundMock.id);
        setCurrentUser(foundMock);
        setActiveTab(initialTab);
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
    clearAuthSession();
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

  const activeExam =
    selectedExamId ? (exams.find((e) => e.id === selectedExamId) || null) : null;

  const navigationItems = (() => {
    if (!currentUser) {
      return [
        { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
      ];
    }

    if (currentUser.role === "admin") {
      return [
        { key: "dashboard" as AppTab, label: "Overview & Progress", icon: BarChart3 },
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
        { key: "dashboard" as AppTab, label: "Overview & Progress", icon: BarChart3 },
        {
          key: "examinations" as AppTab,
          label: "Teacher Examinations",
          icon: BookOpen,
        },
        {
          key: "academic-management" as AppTab,
          label: "Higher Ed Programs",
          icon: GraduationCap,
        },
        {
          key: "user-directory" as AppTab,
          label: "User Access",
          icon: Users,
        },
        {
          key: "progress-records" as AppTab,
          label: "Progress & Records",
          icon: Activity,
        },
        {
          key: "reports" as AppTab,
          label: "Program Results & OBE",
          icon: Award,
        },
        { key: "settings" as AppTab, label: "Settings", icon: Sliders },
      ];
    }

    if (currentUser.role === "programme-head") {
      return [
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
        {
          key: "user-directory" as AppTab,
          label: "Student Access",
          icon: Users,
        },
      ];
    }

    if (currentUser.role === "teacher") {
      return [
        { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
        { key: "exams" as AppTab, label: "Examinations", icon: BookOpen },
        {
          key: "results-management" as AppTab,
          label: "Gradebook",
          icon: Award,
        },
        { key: "history" as AppTab, label: "Exam Records", icon: History },
        {
          key: "item-analysis" as AppTab,
          label: "Item Analysis",
          icon: BarChart2,
        },
      ];
    }

    if (currentUser.role === "student") {
      return [
        { key: "dashboard" as AppTab, label: "My Progress", icon: BarChart3 },
        { key: "examinations" as AppTab, label: "My Exam Records", icon: BookOpen },
      ];
    }

    return [
      { key: "dashboard" as AppTab, label: "Dashboard", icon: BarChart3 },
      { key: "examinations" as AppTab, label: "Examinations", icon: BookOpen },
    ];
  })();

  const handleTabSelect = (tab: AppTab) => {
    const target = navigationItems.some((item) => item.key === tab)
      ? tab
      : (navigationItems[0]?.key || "dashboard");
    setActiveTab(target);
    storeActiveTab(target);
    setIsMobileSidebarOpen(false);
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
        return currentUser?.role === "teacher"
          ? "Examinations & Grading Studio"
          : "Examinations";
      case "results-management":
      case "compiler":
        return currentUser?.role === "teacher"
          ? "Official Gradebook & Results"
          : "Examination Results Management";
      case "quick-scan":
        return "Quick OMR Scanner";
      case "history":
        return currentUser?.role === "teacher"
          ? "Exam Records & Grading History"
          : "Grading History";
      case "academic-management":
        return currentUser?.role === "dean"
          ? "Academic Management"
          : "Programme Overview";
      case "reports":
        return "Institutional Reports";
      case "item-analysis":
        return "Item Analysis";
      case "user-management":
        return "User Account Management";
      case "user-directory":
        return currentUser?.role === "programme-head"
          ? `${currentUser.programme || "BSIT"} Student Access`
          : currentUser?.role === "dean"
            ? "User Access"
            : "User Directory";
      case "settings":
        return "System Settings";
      default:
        return "Dashboard";
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
            cacheManager.set("roster", newRoster);
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

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setIsMobileSidebarOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu size={24} />
        </button>

        {/* Mobile Sidebar Backdrop */}
        {isMobileSidebarOpen && (
          <div
            className="sidebar-mobile-backdrop"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}

        {/* Reference Electric Blue Sidebar with Curved Cutout Active Tab */}
        <aside className={`sidebar-curved ${isMobileSidebarOpen ? "sidebar-mobile-open" : ""}`}>
          <div className="sidebar-brand-header">
            <div className="sidebar-brand-logo-frame">
              <img
                src="/srcb-logo.png"
                alt="SRCB Logo"
                className="sidebar-brand-logo-img"
              />
            </div>
            <span className="sidebar-brand-title">SRCB EduAssess</span>
            <button
              type="button"
              className="mobile-sidebar-close-btn"
              onClick={() => setIsMobileSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X size={20} />
            </button>
          </div>

          <ul className="sidebar-curved-menu">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <li key={item.key} style={{ display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box" }}>
                  <div
                    className={`sidebar-curved-item ${isActive ? "active" : ""}`}
                    onClick={() => {
                      if (item.key === "user-guide") {
                        setIsUserGuideOpen(true);
                        return;
                      }
                      if (item.key === "exams") {
                        setSelectedExamId("");
                        setLatestGradeResult(null);
                      }
                      handleTabSelect(item.key);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0, flex: 1, overflow: "hidden" }}>
                      <Icon size={19} className="nav-icon" style={{ flexShrink: 0 }} />
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Main Content Area */}
        <main className="main-content-reference" style={{ position: "relative" }}>
          {/* Ambient Background Revalidation Shimmer Bar (Zero-Flash SWR) */}
          {(loadingExams || loadingSubmissions) && (
            <div
              className="swr-top-indicator"
              title="Updating records in background..."
              style={{ top: "0" }}
            >
              <div className="swr-top-indicator-bar" />
            </div>
          )}

          {/* Top Header matching reference */}
          <div className="reference-top-header">
            <div className="reference-header-left">
              <nav
                className="header-breadcrumbs"
                aria-label="Breadcrumb"
              >
                <button
                  type="button"
                  className="breadcrumb-btn"
                  onClick={() => {
                    if (inspectExam) setInspectExam(null);
                    const homeTab: AppTab =
                      currentUser.role === "programme-head"
                        ? "academic-management"
                        : "dashboard";
                    handleTabSelect(homeTab);
                    const container = document.querySelector(".main-content-reference");
                    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  title="Go to Home Dashboard"
                >
                  <Home size={14} style={{ color: "var(--primary, #28166f)", flexShrink: 0 }} />
                  <span>SRCB EduAssess</span>
                </button>

                <ChevronRight size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />

                <button
                  type="button"
                  className="breadcrumb-role-btn"
                  onClick={() => {
                    if (inspectExam) setInspectExam(null);
                    const homeTab: AppTab =
                      currentUser.role === "programme-head"
                        ? "academic-management"
                        : "dashboard";
                    handleTabSelect(homeTab);
                    const container = document.querySelector(".main-content-reference");
                    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  title={`Go to ${currentUser.role.replace("-", " ")} Home Overview`}
                >
                  {currentUser.role.replace("-", " ")}
                </button>

                <ChevronRight size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />

                <button
                  type="button"
                  className="breadcrumb-current-btn"
                  onClick={() => {
                    if (inspectExam) setInspectExam(null);
                    if (selectedExamId) {
                      setSelectedExamId("");
                      setLatestGradeResult(null);
                    }
                    handleTabSelect(activeTab);
                    const container = document.querySelector(".main-content-reference");
                    if (container) container.scrollTo({ top: 0, behavior: "smooth" });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  title={`Current Section: ${getActiveTabTitle(activeTab)} (click to view or scroll to top)`}
                >
                  {getActiveTabTitle(activeTab)}
                </button>

                {activeTab === "exams" && activeExam && !inspectExam && (
                  <>
                    <ChevronRight size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    <button
                      type="button"
                      className="breadcrumb-sub-badge"
                      title={`Active Exam Grading Studio: ${activeExam.name}`}
                      onClick={() => {
                        const container = document.querySelector(".main-content-reference");
                        if (container) container.scrollTo({ top: 0, behavior: "smooth" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <BookOpen size={13} style={{ color: "var(--primary, #28166f)", flexShrink: 0 }} />
                      <span>{activeExam.name}</span>
                    </button>
                  </>
                )}

                {inspectExam && (
                  <>
                    <ChevronRight size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                    <button
                      type="button"
                      className="breadcrumb-sub-badge"
                      title={`Inspecting: ${inspectExam.name}`}
                      onClick={() => {
                        const container = document.querySelector(".main-content-reference");
                        if (container) container.scrollTo({ top: 0, behavior: "smooth" });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      <Eye size={13} style={{ color: "var(--primary, #28166f)", flexShrink: 0 }} />
                      <span>{inspectExam.course_code ? `${inspectExam.course_code} Details` : inspectExam.name}</span>
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className="reference-header-right">
              {/* Notifications Dropdown Container */}
              <div
                className="header-notification-container"
                ref={notificationMenuRef}
                style={{ position: "relative" }}
              >
                <button
                  type="button"
                  className={`header-icon-btn ${isNotificationMenuOpen ? "active" : ""}`}
                  title="Notifications & System Alerts"
                  onClick={() => setIsNotificationMenuOpen((prev) => !prev)}
                  style={{ position: "relative" }}
                >
                  <Bell size={18} />
                  {notifications.some((n) => !n.read) && (
                    <span
                      className="header-notif-dot"
                      style={{
                        position: "absolute",
                        top: "7px",
                        right: "7px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--primary, #28166f)",
                        border: "2px solid #ffffff",
                        boxShadow: "0 0 6px rgba(0, 98, 255, 0.6)",
                      }}
                    />
                  )}
                </button>

                <NotificationDropdown
                  isOpen={isNotificationMenuOpen}
                  onClose={() => setIsNotificationMenuOpen(false)}
                  notifications={notifications}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onClearAll={handleClearAll}
                  onDeleteNotification={handleDeleteNotification}
                  onSelectNotification={handleSelectNotification}
                />
              </div>

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
              onNavigateTab={(tab) => handleTabSelect(tab as AppTab)}
            />
          )}

          {/* PROGRAMME-SCOPED OR INSTITUTION-WIDE WORKSPACE */}
          {(() => {
            const isPh = currentUser?.role === "programme-head";
            const phProgram = (currentUser?.programme || "BSIT").toLowerCase();
            const currentExams = isPh
              ? exams.filter((e) => !e.program || e.program.toLowerCase() === phProgram)
              : exams;
            const currentExamIds = new Set(currentExams.map((e) => e.id));
            const currentSubmissions = isPh
              ? submissions.filter((s) => currentExamIds.has(s.exam_id))
              : submissions;
            const currentStudentIds = new Set(currentSubmissions.map((s) => s.student_id));
            const currentRoster = isPh
              ? roster.filter((r) =>
                currentStudentIds.has(r.student_id) ||
                (r.course_section && r.course_section.toLowerCase().includes(phProgram))
              )
              : roster;

            return (
              <>
                {activeTab === "academic-management" && currentUser && (
                  <DeanAcademicManagement
                    currentUser={currentUser}
                    summary={dashboardSummary}
                    exams={currentExams}
                    submissions={currentSubmissions}
                    roster={currentRoster}
                    onInspectExam={(exam) => setInspectExam(exam)}
                    addToast={addToast}
                  />
                )}

                {activeTab === "examinations" && currentUser && (
                  currentUser.role === "student" ? (
                    <StudentPortalView
                      currentUser={currentUser}
                      exams={exams}
                      submissions={submissions}
                      roster={roster}
                      formatDate={formatDate}
                    />
                  ) : (
                    <DeanExaminations
                      currentUser={currentUser}
                      exams={currentExams}
                      submissions={currentSubmissions}
                      roster={currentRoster}
                      onInspectExam={(exam) => setInspectExam(exam)}
                      addToast={addToast}
                      formatDate={formatDate}
                    />
                  )
                )}

                {activeTab === "reports" && currentUser && (
                  currentUser.role === "student" ? (
                    <StudentPortalView
                      currentUser={currentUser}
                      exams={exams}
                      submissions={submissions}
                      roster={roster}
                      formatDate={formatDate}
                    />
                  ) : (
                    <DeanReportsAnalytics
                      currentUser={currentUser}
                      exams={currentExams}
                      submissions={currentSubmissions}
                      roster={currentRoster}
                      summary={dashboardSummary}
                      addToast={addToast}
                    />
                  )
                )}
              </>
            );
          })()}

          {activeTab === "progress-records" && currentUser && (
            <DeanProgressRecords
              exams={exams}
              submissions={submissions}
              onInspectExam={(exam) => setInspectExam(exam)}
              formatDate={formatDate}
              programFilter="all"
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
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  padding: "1.25rem 1.5rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Create Account
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                    Register new teacher and student accounts
                  </p>
                </div>
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
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  padding: "1.25rem 1.5rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    {currentUser.role === "programme-head"
                      ? `${currentUser.programme || "BSIT"} Student Access`
                      : currentUser.role === "dean"
                        ? "User Access"
                        : "User Directory"}
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                    {currentUser.role === "programme-head"
                      ? `Enrolled student accounts under ${currentUser.programme || "BSIT"} academic program`
                      : currentUser.role === "dean"
                        ? "Manage and oversee user access across Higher Education programs"
                        : "Manage registered faculty and student accounts"}
                  </p>
                </div>
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
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                  padding: "1.25rem 1.5rem",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  marginBottom: "1.25rem",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                    Quick Scanner
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
                    Scan ZipGrade bubble sheets via camera or file upload
                  </p>
                </div>
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
                                        className={`bubble-btn ${detectedVal === null
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
                                        className={`bubble-btn ${detectedVal === null
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
              {!activeExam ? (
                /* ========================================================================= */
                /* ALL CREATED EXAMINATION CONTAINERS DIRECTORY VIEW                         */
                /* ========================================================================= */
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Search, Filter & Quick Stats Toolbar */}
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
                    {/* Header Row: Title & Subtitle + Search & Action Buttons */}
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
                          <BookOpen size={17} />
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
                            Created Examinations Directory
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.78rem",
                              color: "#64748b",
                              fontWeight: 500,
                            }}
                          >
                            Filter and manage test specifications, question answer keys, and grading rubrics
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
                        <div style={{ position: "relative", minWidth: "250px", flex: "1 1 250px" }}>
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
                            placeholder="Search by title, subject, course code, section, or instructor..."
                            type="text"
                            value={examListSearch}
                            onChange={(e) => setExamListSearch(e.target.value)}
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

                        <span
                          className="badge"
                          style={{
                            background: "var(--primary-light-surface, #f5f3ff)",
                            color: "var(--primary, #28166f)",
                            border: "1px solid var(--primary-light-border, #ddd6fe)",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            padding: "0.45rem 0.75rem",
                            borderRadius: "8px",
                            height: "38px",
                            display: "inline-flex",
                            alignItems: "center",
                            flexShrink: 0,
                          }}
                        >
                          {exams.length} Total Assessments
                        </span>

                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => setIsExamModalOpen(true)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontWeight: 700,
                            borderRadius: "8px",
                            padding: "0.45rem 0.95rem",
                            fontSize: "0.82rem",
                            height: "38px",
                            flexShrink: 0,
                            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03)",
                          }}
                        >
                          <Plus size={15} /> Create Examination
                        </button>
                      </div>
                    </div>

                    {/* Filter Grid */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                        gap: "0.85rem",
                      }}
                    >
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
                            value={examAcademicYearFilter}
                            onChange={(e) => setExamAcademicYearFilter(e.target.value)}
                          >
                            {examAcademicYears.map((ay) => (
                              <option key={ay} value={ay}>
                                {ay === "All" ? "All Academic Years" : `AY ${ay}`}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="academic-select-arrow" />
                        </div>
                      </div>

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
                            value={examSemesterFilter}
                            onChange={(e) => setExamSemesterFilter(e.target.value)}
                          >
                            <option value="All">All Semesters</option>
                            <option value="1st Semester">1st Semester</option>
                            <option value="2nd Semester">2nd Semester</option>
                            <option value="Summer">Summer</option>
                          </select>
                          <ChevronDown size={14} className="academic-select-arrow" />
                        </div>
                      </div>

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
                          Exam Period / Type
                        </label>
                        <div className="academic-select-wrapper">
                          <select
                            className="academic-select"
                            value={examTypeFilter}
                            onChange={(e) => setExamTypeFilter(e.target.value)}
                          >
                            <option value="All">All Exam Periods</option>
                            <option value="Preliminary">Preliminary</option>
                            <option value="Midterm">Midterm</option>
                            <option value="Pre-Final">Pre-Final</option>
                            <option value="Final">Final</option>
                          </select>
                          <ChevronDown size={14} className="academic-select-arrow" />
                        </div>
                      </div>

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
                          Program / Course
                        </label>
                        <div className="academic-select-wrapper">
                          <select
                            className="academic-select"
                            value={examProgramFilter}
                            onChange={(e) => setExamProgramFilter(e.target.value)}
                          >
                            {examPrograms.map((prog) => (
                              <option key={prog} value={prog}>
                                {prog === "All" ? "All Programs & Courses" : prog}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="academic-select-arrow" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Grid of All Created Examination Containers */}
                  <SmoothContentTransition
                    isLoading={loadingExams}
                    hasExistingData={exams.length > 0}
                    skeleton={<SkeletonExamList count={6} />}
                  >
                    {(() => {
                      const filtered = exams.filter((ex) => {
                        const q = examListSearch.toLowerCase().trim();
                        const matchesSearch =
                          !q ||
                          ex.name.toLowerCase().includes(q) ||
                          (ex.subject && ex.subject.toLowerCase().includes(q)) ||
                          (ex.course_code && ex.course_code.toLowerCase().includes(q)) ||
                          (ex.section && ex.section.toLowerCase().includes(q)) ||
                          (ex.instructor_name && ex.instructor_name.toLowerCase().includes(q));

                        const matchesType =
                          examTypeFilter === "All" ||
                          (ex.exam_type || "").toLowerCase() === examTypeFilter.toLowerCase();

                        const matchesSem =
                          examSemesterFilter === "All" ||
                          (ex.semester || "1st Semester").toLowerCase() === examSemesterFilter.toLowerCase();

                        const matchesYear =
                          examAcademicYearFilter === "All" ||
                          (ex.academic_year || "").toLowerCase() === examAcademicYearFilter.toLowerCase();

                        const matchesProg =
                          examProgramFilter === "All" ||
                          (ex.program || "").toLowerCase() === examProgramFilter.toLowerCase() ||
                          (ex.course_code || "").toLowerCase() === examProgramFilter.toLowerCase();

                        return matchesSearch && matchesType && matchesSem && matchesYear && matchesProg;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div
                            className="card"
                            style={{
                              background: "#ffffff",
                              border: "1px dashed #cbd5e1",
                              borderRadius: "16px",
                              padding: "3.5rem 2rem",
                              textAlign: "center",
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "16px",
                                background: "var(--primary-light-surface, #f5f3ff)",
                                color: "var(--primary, #28166f)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <BookOpen size={28} />
                            </div>
                            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                              No Examinations Found
                            </h3>
                            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0, maxWidth: "420px" }}>
                              {exams.length === 0
                                ? "You haven't created any examinations yet. Click the button below to create your first assessment."
                                : "No examinations match your current search or filter criteria. Try clearing your filters."}
                            </p>
                            {exams.length === 0 && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setIsExamModalOpen(true)}
                                style={{ marginTop: "0.5rem", fontWeight: 700, borderRadius: "10px" }}
                              >
                                <Plus size={16} /> Create Examination
                              </button>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
                            gap: "1.25rem",
                          }}
                        >
                          {filtered.map((exam) => (
                            <ExamCard
                              key={exam.id}
                              exam={exam}
                              isSelected={false}
                              submissionCount={
                                submissions.filter((s) => s.exam_id === exam.id).length
                              }
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
                    })()}
                  </SmoothContentTransition>
                </div>
              ) : (
                /* ========================================================================= */
                /* DEDICATED GRADING STUDIO FOR THE SELECTED EXAMINATION                     */
                /* ========================================================================= */
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* Back to All Examinations Navigation Bar */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      padding: "0.75rem 1.25rem",
                      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setSelectedExamId("");
                        setLatestGradeResult(null);
                        setIsCameraActive(false);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        fontWeight: 700,
                        borderRadius: "8px",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        color: "#0f172a",
                        fontSize: "0.85rem",
                        padding: "0.45rem 0.95rem",
                      }}
                    >
                      <ArrowLeft size={16} /> Back to All Examinations
                    </button>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsCameraActive((prev) => !prev)}
                        style={{
                          background: isCameraActive ? "var(--primary-light-surface, #f5f3ff)" : "#ffffff",
                          border: isCameraActive ? "1px solid var(--primary-light-border, #ddd6fe)" : "1px solid #cbd5e1",
                          color: isCameraActive ? "var(--primary, #28166f)" : "#0f172a",
                          fontWeight: 600,
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        title="Launch or close the live camera sheet scanner"
                      >
                        <Camera size={14} /> {isCameraActive ? "Close Camera" : "Live Camera"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => studentScanInputRef.current?.click()}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          fontWeight: 600,
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        title="Upload student answer sheet image files (.png, .jpg)"
                      >
                        <UploadCloud size={14} /> Upload Sheet(s)
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleExportGradeSheet}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          color: "#0f172a",
                          fontWeight: 600,
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                        }}
                      >
                        <Download size={14} /> Export Grade Sheet (.xlsx)
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setIsExamModalOpen(true)}
                        style={{
                          fontWeight: 700,
                          borderRadius: "8px",
                          fontSize: "0.82rem",
                        }}
                      >
                        <Plus size={15} /> Create Examination
                      </button>
                    </div>
                  </div>

                  {/* Active Exam Grading Controls Card */}
                  <div
                    className="card"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                    }}
                  >
                    {(() => {
                      const activeExamSubmissions = submissions.filter(
                        (s) => s.exam_id === activeExam.id,
                      );
                      const questionCount =
                        activeExam.num_items ||
                        Object.keys(activeExam.answer_key || {}).length ||
                        50;
                      const avgScore =
                        activeExamSubmissions.length > 0
                          ? activeExamSubmissions.reduce((acc, s) => acc + s.score, 0) /
                          activeExamSubmissions.length
                          : 0;
                      const avgPercentage =
                        questionCount > 0 ? Math.round((avgScore / questionCount) * 100) : 0;
                      const avgTransmuted = calculateTransmutedGrade(
                        Math.round(avgScore),
                        questionCount,
                      );
                      const passCount = activeExamSubmissions.filter((s) => {
                        const t = calculateTransmutedGrade(s.score, questionCount);
                        return t.status === "Passed";
                      }).length;
                      const passRate =
                        activeExamSubmissions.length > 0
                          ? Math.round((passCount / activeExamSubmissions.length) * 100)
                          : 0;

                      // Answer key distribution
                      const answerDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
                      Object.values(activeExam.answer_key || {}).forEach((ans) => {
                        if (ans && answerDist[ans] !== undefined) {
                          answerDist[ans]++;
                        }
                      });

                      // Grade result calculations
                      const allAnswerEntries = Object.entries(activeExam.answer_key || {}).sort(
                        (a, b) => parseInt(a[0]) - parseInt(b[0]),
                      );
                      const correctCount = latestGradeResult
                        ? allAnswerEntries.filter(([qStr, correctAns]) => {
                          const s = latestGradeResult.answers[qStr];
                          return (
                            s &&
                            !s.is_empty &&
                            !s.is_ambiguous &&
                            s.selected === correctAns
                          );
                        }).length
                        : 0;
                      const incorrectCount = latestGradeResult
                        ? allAnswerEntries.filter(([qStr, correctAns]) => {
                          const s = latestGradeResult.answers[qStr];
                          return (
                            s &&
                            (!s.selected || s.selected !== correctAns) &&
                            !s.is_ambiguous
                          );
                        }).length
                        : 0;
                      const ambiguousCount = latestGradeResult
                        ? allAnswerEntries.filter(([qStr]) => {
                          const s = latestGradeResult.answers[qStr];
                          return s && s.is_ambiguous;
                        }).length
                        : 0;

                      const filteredAnswerEntries = allAnswerEntries.filter(
                        ([qStr, correctAns]) => {
                          if (!latestGradeResult) return true;
                          const s = latestGradeResult.answers[qStr];
                          if (gradeResultFilter === "correct") {
                            return (
                              s &&
                              !s.is_empty &&
                              !s.is_ambiguous &&
                              s.selected === correctAns
                            );
                          }
                          if (gradeResultFilter === "incorrect") {
                            return (
                              s &&
                              (!s.selected || s.selected !== correctAns) &&
                              !s.is_ambiguous
                            );
                          }
                          if (gradeResultFilter === "ambiguous") {
                            return s && s.is_ambiguous;
                          }
                          return true;
                        },
                      );

                      const latestTransmuted = latestGradeResult
                        ? calculateTransmutedGrade(
                          latestGradeResult.score,
                          latestGradeResult.total_questions,
                        )
                        : null;

                      const getStudentName = (studentId?: string) => {
                        if (!studentId) return "Anonymous / Unassigned";
                        const found = roster.find(
                          (r) =>
                            r.student_id.toLowerCase() === studentId.toLowerCase(),
                        );
                        return found ? found.name : `Student (${studentId})`;
                      };

                      return (
                        <div>
                          {/* Active Exam Hero Header */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: "1.25rem",
                              marginBottom: "1.25rem",
                              borderBottom: "1px solid #f1f5f9",
                              paddingBottom: "1.25rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: "260px" }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                  marginBottom: "6px",
                                }}
                              >
                                <span
                                  className="badge"
                                  style={{
                                    background: "var(--primary-light-surface, #f5f3ff)",
                                    color: "var(--primary, #28166f)",
                                    border: "1px solid var(--primary-light-border, #ddd6fe)",
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    padding: "0.2rem 0.55rem",
                                    borderRadius: "6px",
                                  }}
                                >
                                  {activeExam.exam_type || "Midterm"}
                                </span>
                                {activeExam.course_code && (
                                  <span
                                    style={{
                                      fontSize: "0.8rem",
                                      fontWeight: 800,
                                      color: "var(--primary, #28166f)",
                                      background: "#f0fdf4",
                                      border: "1px solid #bbf7d0",
                                      padding: "0.15rem 0.5rem",
                                      borderRadius: "6px",
                                    }}
                                  >
                                    {activeExam.course_code}
                                  </span>
                                )}
                                {activeExam.section && (
                                  <span
                                    style={{
                                      fontSize: "0.78rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Sec: {activeExam.section}
                                  </span>
                                )}
                                {activeExam.academic_year && (
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "#64748b",
                                    }}
                                  >
                                    • AY {activeExam.academic_year}{" "}
                                    {activeExam.semester ? `(${activeExam.semester})` : ""}
                                  </span>
                                )}
                              </div>
                              <h2
                                style={{
                                  margin: 0,
                                  fontSize: "1.35rem",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                  letterSpacing: "-0.01em",
                                }}
                              >
                                {activeExam.name}
                              </h2>
                              {activeExam.subject && (
                                <p
                                  style={{
                                    fontSize: "0.84rem",
                                    color: "#475569",
                                    margin: "0.2rem 0 0 0",
                                  }}
                                >
                                  {activeExam.subject}{" "}
                                  {activeExam.instructor_name ? `• Instructor: ${activeExam.instructor_name}` : ""}
                                </p>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.6rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                className="btn btn-secondary"
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  padding: "0.45rem 0.8rem",
                                  borderRadius: "8px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                                onClick={() => setInspectExam(activeExam)}
                                title="Inspect Answer Key and Exam Settings"
                              >
                                <Eye size={14} /> Inspect Exam
                              </button>
                              <button
                                className="btn btn-secondary"
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  padding: "0.45rem 0.8rem",
                                  borderRadius: "8px",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "5px",
                                }}
                                onClick={handleExportGradeSheet}
                                title="Export Class Grade Sheet to Excel"
                              >
                                <Download size={14} /> Export Submissions
                              </button>
                              <button
                                className="btn"
                                style={{
                                  padding: "0.45rem 0.8rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#ef4444",
                                  borderRadius: "8px",
                                }}
                                onClick={() => handleDeleteExam(activeExam.id)}
                                title="Delete this Examination"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </div>

                          {/* 4 Live Quick Metric Cards */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: "0.85rem",
                              marginBottom: "1.5rem",
                            }}
                          >
                            {/* Metric 1: Submissions */}
                            <div className="exam-studio-metric-card">
                              <div
                                className="metric-avatar"
                                style={{
                                  background: "var(--primary-light-surface, #f5f3ff)",
                                  color: "var(--primary, #28166f)",
                                  border: "1px solid var(--primary-light-border, #ddd6fe)",
                                }}
                              >
                                <Users size={18} />
                              </div>
                              <div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                  Submissions
                                </div>
                                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                                  {activeExamSubmissions.length}{" "}
                                  <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                                    / {roster.length}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 700 }}>
                                  {Math.round((activeExamSubmissions.length / (roster.length || 1)) * 100)}% class turnout
                                </div>
                              </div>
                            </div>

                            {/* Metric 2: Class Average */}
                            <div className="exam-studio-metric-card">
                              <div
                                className="metric-avatar"
                                style={{
                                  background: "#fef3c7",
                                  color: "#b45309",
                                  border: "1px solid #fde68a",
                                }}
                              >
                                <Award size={18} />
                              </div>
                              <div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                  Class Average
                                </div>
                                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                                  {avgScore > 0 ? avgScore.toFixed(1) : "0.0"}{" "}
                                  <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                                    / {questionCount}
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700 }}>
                                  {avgPercentage}% raw mean
                                </div>
                              </div>
                            </div>

                            {/* Metric 3: Transmuted Grade */}
                            <div className="exam-studio-metric-card">
                              <div
                                className="metric-avatar"
                                style={{
                                  background: "#f3e8ff",
                                  color: "#7e22ce",
                                  border: "1px solid #e9d5ff",
                                }}
                              >
                                <GraduationCap size={18} />
                              </div>
                              <div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                  Transmuted Grade
                                </div>
                                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#7e22ce" }}>
                                  {activeExamSubmissions.length > 0 ? avgTransmuted.grade : "—"}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700 }}>
                                  {activeExamSubmissions.length > 0 ? avgTransmuted.remarks : "No submissions"}
                                </div>
                              </div>
                            </div>

                            {/* Metric 4: Passing Rate */}
                            <div className="exam-studio-metric-card">
                              <div
                                className="metric-avatar"
                                style={{
                                  background: passRate >= 75 ? "#ecfdf5" : "#fffbeb",
                                  color: passRate >= 75 ? "#047857" : "#b45309",
                                  border: `1px solid ${passRate >= 75 ? "#a7f3d0" : "#fde68a"}`,
                                }}
                              >
                                <CheckCircle2 size={18} />
                              </div>
                              <div>
                                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                  Passing Rate
                                </div>
                                <div style={{ fontSize: "1.15rem", fontWeight: 800, color: passRate >= 75 ? "#047857" : "#b45309" }}>
                                  {passRate}%
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 700 }}>
                                  {passCount} passed • {activeExamSubmissions.length - passCount} failed
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Studio Workspace Tabs Bar */}
                          <div className="exam-subtab-bar">
                            <button
                              type="button"
                              className={`exam-subtab-item ${activeExamStudioTab === "grading" ? "active" : ""
                                }`}
                              onClick={() => setActiveExamStudioTab("grading")}
                            >
                              <Sparkles size={15} /> OMR Grading Studio
                            </button>
                            <button
                              type="button"
                              className={`exam-subtab-item ${activeExamStudioTab === "answer-key" ? "active" : ""
                                }`}
                              onClick={() => setActiveExamStudioTab("answer-key")}
                            >
                              <Key size={15} /> Visual Answer Key ({questionCount} Items)
                            </button>
                          </div>

                          {/* TAB 1: OMR GRADING STUDIO */}
                          {activeExamStudioTab === "grading" && (
                            <div>
                              {/* Hidden File Input for Batch Sheet Upload */}
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

                              {/* Grading Progress Bar (Visible during batch upload or live scan) */}
                              {gradingProgress && (
                                <div style={{ marginBottom: "1.25rem" }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      fontSize: "0.78rem",
                                      marginBottom: "0.35rem",
                                      color: "#475569",
                                      fontWeight: 700,
                                    }}
                                  >
                                    <span>Processing answer sheets...</span>
                                    <span>
                                      {gradingProgress.current} of {gradingProgress.total} completed
                                    </span>
                                  </div>
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "8px",
                                      background: "#f1f5f9",
                                      borderRadius: "4px",
                                      overflow: "hidden",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  >
                                    <div
                                      style={{
                                        height: "100%",
                                        background: "linear-gradient(90deg, var(--primary, #28166f), var(--srcb-blue-light, #4326b8))",
                                        width: `${(gradingProgress.current / gradingProgress.total) * 100}%`,
                                        transition: "width 0.25s ease",
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              )}

                              {/* Live Camera Scanner (Only rendered on-demand when activated) */}
                              {isCameraActive && (
                                <div style={{ marginBottom: "1.5rem" }}>
                                  <CameraScanner
                                    onCapture={async (file) => {
                                      await handleGradeSheetsSubmit([file]);
                                    }}
                                    onClose={() => setIsCameraActive(false)}
                                    onSwitchToUpload={() => {
                                      setIsCameraActive(false);
                                      studentScanInputRef.current?.click();
                                    }}
                                    title={`Grade Student Sheet — ${activeExam.name}`}
                                    subtitle={`Align the 4 black corner squares within the viewfinder. Scored instantly against ${activeExam.name}.`}
                                  />
                                </div>
                              )}

                              {/* Latest Grade Result Showcase */}
                              {latestGradeResult ? (
                                <div
                                  className="card"
                                  style={{
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "16px",
                                    background: "#ffffff",
                                    padding: "1.5rem",
                                    boxShadow: "0 4px 20px rgba(40, 22, 111, 0.05)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "1.25rem",
                                      flexWrap: "wrap",
                                      gap: "1rem",
                                      borderBottom: "1px solid #f1f5f9",
                                      paddingBottom: "1rem",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                      <div
                                        style={{
                                          width: "44px",
                                          height: "44px",
                                          borderRadius: "12px",
                                          background: "var(--primary-light-surface, #f5f3ff)",
                                          color: "var(--primary, #28166f)",
                                          border: "1px solid var(--primary-light-border, #ddd6fe)",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontWeight: 800,
                                          fontSize: "1rem",
                                        }}
                                      >
                                        {latestGradeResult.student_id ? latestGradeResult.student_id.slice(-2) : "ID"}
                                      </div>
                                      <div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                          <h4
                                            style={{
                                              margin: 0,
                                              fontSize: "1.1rem",
                                              fontWeight: 800,
                                              color: "#0f172a",
                                            }}
                                          >
                                            {getStudentName(latestGradeResult.student_id)}
                                          </h4>
                                          <span
                                            className="badge"
                                            style={{
                                              background: "#f1f5f9",
                                              color: "#475569",
                                              border: "1px solid #cbd5e1",
                                              fontSize: "0.72rem",
                                              fontWeight: 700,
                                            }}
                                          >
                                            ID: {latestGradeResult.student_id || "Unrecognized"}
                                          </span>
                                        </div>
                                        <p
                                          style={{
                                            margin: "0.15rem 0 0 0",
                                            fontSize: "0.78rem",
                                            color: "#64748b",
                                          }}
                                        >
                                          Graded successfully against {activeExam.name}
                                        </p>
                                      </div>
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                      {latestTransmuted && (
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.6rem",
                                            background: latestTransmuted.status === "Passed" ? "#f0fdf4" : "#fef2f2",
                                            border: `1px solid ${latestTransmuted.status === "Passed" ? "#bbf7d0" : "#fecaca"}`,
                                            padding: "0.4rem 0.85rem",
                                            borderRadius: "10px",
                                          }}
                                        >
                                          <div>
                                            <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                                              Transmuted Grade
                                            </div>
                                            <div
                                              style={{
                                                fontSize: "1.1rem",
                                                fontWeight: 800,
                                                color: latestTransmuted.status === "Passed" ? "#15803d" : "#b91c1c",
                                              }}
                                            >
                                              {latestTransmuted.grade}
                                            </div>
                                          </div>
                                          <span
                                            className="badge"
                                            style={{
                                              fontSize: "0.72rem",
                                              fontWeight: 800,
                                              background: latestTransmuted.status === "Passed" ? "#16a34a" : "#dc2626",
                                              color: "#ffffff",
                                              padding: "0.2rem 0.5rem",
                                              borderRadius: "6px",
                                            }}
                                          >
                                            {latestTransmuted.status}
                                          </span>
                                        </div>
                                      )}
                                      <StatusBadge
                                        score={latestGradeResult.score}
                                        totalQuestions={latestGradeResult.total_questions}
                                      />
                                    </div>
                                  </div>

                                  {/* Question Filter Chips Bar */}
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      marginBottom: "1rem",
                                      flexWrap: "wrap",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                                      <button
                                        type="button"
                                        className={`filter-chip-btn ${gradeResultFilter === "all" ? "active" : ""}`}
                                        onClick={() => setGradeResultFilter("all")}
                                      >
                                        All Items ({allAnswerEntries.length})
                                      </button>
                                      <button
                                        type="button"
                                        className={`filter-chip-btn ${gradeResultFilter === "correct" ? "active" : ""}`}
                                        onClick={() => setGradeResultFilter("correct")}
                                        style={{ color: gradeResultFilter === "correct" ? "#ffffff" : "#16a34a" }}
                                      >
                                        <Check size={13} /> Correct ({correctCount})
                                      </button>
                                      <button
                                        type="button"
                                        className={`filter-chip-btn ${gradeResultFilter === "incorrect" ? "active" : ""}`}
                                        onClick={() => setGradeResultFilter("incorrect")}
                                        style={{ color: gradeResultFilter === "incorrect" ? "#ffffff" : "#dc2626" }}
                                      >
                                        <X size={13} /> Incorrect ({incorrectCount})
                                      </button>
                                      {ambiguousCount > 0 && (
                                        <button
                                          type="button"
                                          className={`filter-chip-btn ${gradeResultFilter === "ambiguous" ? "active" : ""}`}
                                          onClick={() => setGradeResultFilter("ambiguous")}
                                          style={{ color: gradeResultFilter === "ambiguous" ? "#ffffff" : "#d97706" }}
                                        >
                                          <AlertTriangle size={13} /> Ambiguous ({ambiguousCount})
                                        </button>
                                      )}
                                    </div>

                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "0.3rem 0.65rem",
                                        borderRadius: "8px",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                      }}
                                      onClick={() => setIsOverlayZoomOpen(true)}
                                    >
                                      <Maximize2 size={13} /> Enlarged Preview
                                    </button>
                                  </div>

                                  {/* Split Layout: Annotated Image Preview & Answers Check */}
                                  <div className="grade-layout">
                                    <div
                                      className="image-preview-container"
                                      style={{
                                        maxHeight: "420px",
                                        borderRadius: "12px",
                                        overflow: "hidden",
                                        border: "1px solid #e2e8f0",
                                        position: "relative",
                                        background: "#f8fafc",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => setIsOverlayZoomOpen(true)}
                                      title="Click to view full resolution sheet overlay"
                                    >
                                      <img
                                        src={`data:image/png;base64,${latestGradeResult.overlay_image}`}
                                        alt="Graded OMR Sheet"
                                        style={{ width: "100%", height: "auto", display: "block" }}
                                      />
                                      <div
                                        style={{
                                          position: "absolute",
                                          bottom: "8px",
                                          right: "8px",
                                          background: "rgba(15, 23, 42, 0.8)",
                                          color: "#ffffff",
                                          padding: "0.25rem 0.6rem",
                                          borderRadius: "6px",
                                          fontSize: "0.7rem",
                                          fontWeight: 700,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "4px",
                                        }}
                                      >
                                        <Maximize2 size={12} /> Click to zoom
                                      </div>
                                    </div>

                                    <div
                                      className="bubble-sheet-card"
                                      style={{
                                        maxHeight: "420px",
                                        background: "#f8fafc",
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "12px",
                                        padding: "1rem",
                                        overflowY: "auto",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          justifyContent: "space-between",
                                          alignItems: "center",
                                          marginBottom: "0.75rem",
                                        }}
                                      >
                                        <h4
                                          style={{
                                            fontSize: "0.88rem",
                                            fontWeight: 800,
                                            color: "#0f172a",
                                            margin: 0,
                                          }}
                                        >
                                          Question-by-Question Breakdown
                                        </h4>
                                        <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                          Showing {filteredAnswerEntries.length} items
                                        </span>
                                      </div>

                                      {filteredAnswerEntries.length === 0 ? (
                                        <div
                                          style={{
                                            textAlign: "center",
                                            padding: "2rem 1rem",
                                            color: "#64748b",
                                            fontSize: "0.82rem",
                                          }}
                                        >
                                          No questions match the "{gradeResultFilter}" filter.
                                        </div>
                                      ) : (
                                        filteredAnswerEntries.map(([qStr, correctAns]) => {
                                          const studentAnsObj = latestGradeResult.answers[qStr];
                                          const selected = studentAnsObj ? studentAnsObj.selected : null;
                                          const isEmpty = studentAnsObj ? studentAnsObj.is_empty : true;
                                          const isAmbiguous = studentAnsObj ? studentAnsObj.is_ambiguous : false;
                                          const isCorrect = !isEmpty && !isAmbiguous && selected === correctAns;

                                          return (
                                            <div
                                              key={qStr}
                                              className="bubble-row"
                                              style={{
                                                padding: "0.3rem 0.5rem",
                                                borderRadius: "6px",
                                                marginBottom: "2px",
                                                background: isCorrect ? "#f0fdf4" : isEmpty ? "transparent" : "#fef2f2",
                                              }}
                                            >
                                              <span
                                                className="bubble-num"
                                                style={{
                                                  color: "#0f172a",
                                                  fontWeight: 800,
                                                  fontSize: "0.8rem",
                                                  minWidth: "28px",
                                                }}
                                              >
                                                {qStr}.
                                              </span>
                                              <div className="bubble-options">
                                                {["A", "B", "C", "D", "E"].map((opt) => {
                                                  let btnClass = "";
                                                  if (isAmbiguous) {
                                                    if (selected === opt) btnClass = "ambiguous";
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
                                                    fontSize: "0.74rem",
                                                    color: isAmbiguous
                                                      ? "#b45309"
                                                      : isEmpty
                                                        ? "#94a3b8"
                                                        : isCorrect
                                                          ? "#059669"
                                                          : "#dc2626",
                                                    marginLeft: "0.5rem",
                                                    fontWeight: 700,
                                                  }}
                                                >
                                                  {isEmpty
                                                    ? "— Blank (Key: " + correctAns + ")"
                                                    : isAmbiguous
                                                      ? "⚠ Multiple Marks"
                                                      : isCorrect
                                                        ? "✓ Correct"
                                                        : `✗ Student: ${selected} (Key: ${correctAns})`}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                /* Guidance Placeholder before first scan */
                                <div
                                  style={{
                                    background: "#ffffff",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "16px",
                                    padding: "2rem 1.5rem",
                                    textAlign: "center",
                                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                  }}
                                >
                                  <div
                                    style={{
                                      width: "56px",
                                      height: "56px",
                                      borderRadius: "16px",
                                      background: "var(--primary-light-surface, #f5f3ff)",
                                      color: "var(--primary, #28166f)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      marginBottom: "0.85rem",
                                    }}
                                  >
                                    <Sparkles size={28} />
                                  </div>
                                  <h3
                                    style={{
                                      fontSize: "1.1rem",
                                      fontWeight: 800,
                                      color: "#0f172a",
                                      margin: "0 0 0.35rem 0",
                                    }}
                                  >
                                    Ready to Scan Student Answer Sheets
                                  </h3>
                                  <p
                                    style={{
                                      fontSize: "0.82rem",
                                      color: "#64748b",
                                      maxWidth: "460px",
                                      margin: "0 auto 1.25rem auto",
                                    }}
                                  >
                                    Drag & drop scanned OMR answer sheets or launch the Live Camera Scanner above to compute student raw scores and transmutation curves in real-time.
                                  </p>
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "center",
                                      gap: "0.75rem",
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="btn btn-primary"
                                      onClick={() => studentScanInputRef.current?.click()}
                                      style={{
                                        fontSize: "0.82rem",
                                        fontWeight: 700,
                                        borderRadius: "10px",
                                      }}
                                    >
                                      <UploadCloud size={15} /> Upload Sheets
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => {
                                        setActiveExamStudioTab("grading");
                                        setIsCameraActive(true);
                                      }}
                                      style={{
                                        fontSize: "0.82rem",
                                        fontWeight: 700,
                                        borderRadius: "10px",
                                      }}
                                    >
                                      <Camera size={15} /> Open Camera Viewfinder
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* VISUAL ANSWER KEY PALETTE & DISTRIBUTION */}
                          {activeExamStudioTab === "answer-key" && (
                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  marginBottom: "1.25rem",
                                  flexWrap: "wrap",
                                  gap: "0.75rem",
                                }}
                              >
                                <div>
                                  <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                                    Master Answer Key & Distribution Matrix
                                  </h4>
                                  <p style={{ margin: "0.15rem 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                                    Configured correct bubble options and question answer balance across {questionCount} questions
                                  </p>
                                </div>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      fontSize: "0.8rem",
                                      fontWeight: 700,
                                      padding: "0.45rem 0.85rem",
                                      borderRadius: "8px",
                                    }}
                                    onClick={() => {
                                      setEditingExam(activeExam);
                                      setIsExamModalOpen(true);
                                    }}
                                  >
                                    Edit Answer Key
                                  </button>
                                </div>
                              </div>

                              {/* Choice Frequency Bars */}
                              <div
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "14px",
                                  padding: "1.25rem",
                                  marginBottom: "1.5rem",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                }}
                              >
                                <h5
                                  style={{
                                    fontSize: "0.86rem",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    margin: "0 0 0.85rem 0",
                                  }}
                                >
                                  Option Frequency Distribution
                                </h5>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(5, 1fr)",
                                    gap: "0.75rem",
                                  }}
                                >
                                  {["A", "B", "C", "D", "E"].map((opt) => {
                                    const count = answerDist[opt] || 0;
                                    const pct = questionCount > 0 ? Math.round((count / questionCount) * 100) : 0;
                                    return (
                                      <div
                                        key={opt}
                                        style={{
                                          background: "#f8fafc",
                                          border: "1px solid #e2e8f0",
                                          borderRadius: "10px",
                                          padding: "0.75rem",
                                          textAlign: "center",
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "50%",
                                            background: "var(--primary, #28166f)",
                                            color: "#ffffff",
                                            fontWeight: 800,
                                            fontSize: "0.85rem",
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            marginBottom: "0.35rem",
                                          }}
                                        >
                                          {opt}
                                        </div>
                                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                                          {count}
                                        </div>
                                        <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                                          {pct}% of items
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 5-Column Compact Bubble Matrix Palette */}
                              <div
                                style={{
                                  background: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "14px",
                                  padding: "1.25rem",
                                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                                }}
                              >
                                <h5
                                  style={{
                                    fontSize: "0.86rem",
                                    fontWeight: 800,
                                    color: "#0f172a",
                                    margin: "0 0 1rem 0",
                                  }}
                                >
                                  Configured Questions Palette (1 - {questionCount})
                                </h5>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                                    gap: "0.6rem",
                                  }}
                                >
                                  {Array.from({ length: questionCount }, (_, idx) => {
                                    const qNum = idx + 1;
                                    const qKey = qNum.toString();
                                    const ans = (activeExam.answer_key || {})[qKey];

                                    return (
                                      <div
                                        key={qKey}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          padding: "0.45rem 0.65rem",
                                          borderRadius: "8px",
                                          background: ans ? "#f8fafc" : "#fef2f2",
                                          border: `1px solid ${ans ? "#e2e8f0" : "#fecaca"}`,
                                        }}
                                      >
                                        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                                          Q{qNum}
                                        </span>
                                        {ans ? (
                                          <span
                                            style={{
                                              width: "24px",
                                              height: "24px",
                                              borderRadius: "50%",
                                              background: "var(--primary, #28166f)",
                                              color: "#ffffff",
                                              fontSize: "0.75rem",
                                              fontWeight: 800,
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                          >
                                            {ans}
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 700 }}>
                                            Empty
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Modal for Enlarged Graded Sheet Image */}
                          {isOverlayZoomOpen && latestGradeResult && (
                            <div
                              className="modal-overlay"
                              onClick={() => setIsOverlayZoomOpen(false)}
                              style={{ zIndex: 100000 }}
                            >
                              <div
                                className="modal-content"
                                style={{
                                  maxWidth: "850px",
                                  maxHeight: "92vh",
                                  background: "#ffffff",
                                  border: "1px solid #cbd5e1",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "1rem 1.5rem",
                                    borderBottom: "1px solid #e2e8f0",
                                  }}
                                >
                                  <div>
                                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                                      Annotated OMR Sheet Viewfinder
                                    </h3>
                                    <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                                      Student ID: {latestGradeResult.student_id || "Unrecognized"} • Score: {latestGradeResult.score}/{latestGradeResult.total_questions}
                                    </p>
                                  </div>
                                  <button
                                    className="btn btn-secondary btn-icon-only"
                                    onClick={() => setIsOverlayZoomOpen(false)}
                                    style={{ borderRadius: "8px" }}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                                <div
                                  style={{
                                    padding: "1rem",
                                    overflowY: "auto",
                                    textAlign: "center",
                                    background: "#f8fafc",
                                  }}
                                >
                                  <img
                                    src={`data:image/png;base64,${latestGradeResult.overlay_image}`}
                                    alt="Enlarged Graded OMR Sheet"
                                    style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain", borderRadius: "8px", border: "1px solid #e2e8f0" }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EXAM RECORDS / GRADING AUDIT HISTORY TAB */}
          {activeTab === "history" && (
            <GradingHistoryView
              exams={exams}
              submissions={submissions}
              roster={roster}
              currentUser={currentUser}
              onSelectSubmission={viewSubmissionDetails}
              onDeleteGradingRecord={handleDeleteGradingRecord}
              formatDate={formatDate}
              addToast={addToast}
            />
          )}

          {/* OFFICIAL GRADEBOOK & ASSESSMENT RECORDS TAB (TEACHER) */}
          {(activeTab === "results-management" || activeTab === "compiler") && currentUser && (
            <TeacherExamCompiler
              exams={exams}
              submissions={submissions}
              roster={roster}
              currentUser={currentUser}
              onSelectSubmission={viewSubmissionDetails}
              onInspectExam={(exam) => setInspectExam(exam)}
              addToast={addToast}
              formatDate={formatDate}
            />
          )}

          {/* OBE ITEM ANALYSIS TAB */}
          {activeTab === "item-analysis" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Exam Selector Card */}
              <div
                className="card"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.25rem 1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    flex: "1 1 320px",
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
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#475569",
                        display: "block",
                        marginBottom: "4px",
                      }}
                    >
                      Select Examination to Evaluate:
                    </label>
                    <select
                      className="form-input"
                      style={{
                        width: "100%",
                        maxWidth: "420px",
                        height: "38px",
                        fontSize: "0.85rem",
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        color: "#0f172a",
                        fontWeight: 600,
                      }}
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                    >
                      {exams.map((exam) => (
                        <option key={exam.id} value={exam.id}>
                          {exam.name} {exam.course_code ? `[${exam.course_code}]` : ""} {exam.section ? `• Sec ${exam.section}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {activeExam && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      flexWrap: "wrap",
                    }}
                  >
                    {activeExam.course_code && (
                      <span
                        style={{
                          background: "var(--primary-light-surface, #f5f3ff)",
                          color: "var(--primary, #28166f)",
                          border: "1px solid var(--primary-light-border, #ddd6fe)",
                          padding: "0.3rem 0.6rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 800,
                        }}
                      >
                        {activeExam.course_code}
                      </span>
                    )}
                    {activeExam.section && (
                      <span
                        style={{
                          background: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          padding: "0.3rem 0.6rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        Sec: {activeExam.section}
                      </span>
                    )}
                    <span
                      style={{
                        background: "#f8fafc",
                        color: "#475569",
                        border: "1px solid #e2e8f0",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      {Object.keys(activeExam.answer_key || {}).length} Items
                    </span>
                    <span
                      style={{
                        background: "#f8fafc",
                        color: "var(--primary, #28166f)",
                        border: "1px solid var(--primary-light-border, #ddd6fe)",
                        padding: "0.3rem 0.6rem",
                        borderRadius: "6px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                      }}
                    >
                      {submissions.filter((s) => s.exam_id === activeExam.id).length} Scanned
                    </span>
                    <button
                      className="btn btn-primary"
                      onClick={handleExportItemAnalysis}
                      style={{
                        fontWeight: 700,
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Download size={15} /> Export Item Analysis (.xlsx)
                    </button>
                  </div>
                )}
              </div>

              {/* Item Analysis Results Card */}
              <div
                className="card"
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.02)",
                }}
              >
                {activeExam ? (
                  <>
                    {submissions.filter((s) => s.exam_id === activeExam.id)
                      .length === 0 && (
                        <div
                          style={{
                            marginBottom: "1.25rem",
                            padding: "0.85rem 1.1rem",
                            background: "#fffbeb",
                            border: "1px solid #fde68a",
                            borderRadius: "10px",
                            color: "#92400e",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            fontSize: "0.82rem",
                          }}
                        >
                          <AlertTriangle
                            size={18}
                            style={{ flexShrink: 0, color: "#d97706" }}
                          />
                          <span>
                            <strong>No real submissions found</strong> for this exam
                            — the table below displays <strong>sample demo psychometrics</strong>{" "}
                            for illustration purposes. Grade student OMR sheets under <strong>Exams & Grading</strong> to generate live data.
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
                      padding: "3rem",
                      color: "#64748b",
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
                    SRCB EduAssess User Guide & System Manual
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
                  {(() => {
                    const sortedAnswers = Object.entries(selectedSubmission.answers || {})
                      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
                    const midIndex = Math.ceil(sortedAnswers.length / 2);
                    const firstCol = sortedAnswers.slice(0, midIndex);
                    const secondCol = sortedAnswers.slice(midIndex);
                    const exam = exams.find((e) => e.id === selectedSubmission.exam_id);

                    return (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                        }}
                      >
                        <div>
                          {firstCol.map(([qStr, ansObj]) => {
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
                          {secondCol.map(([qStr, ansObj]) => {
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
                    );
                  })()}
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
