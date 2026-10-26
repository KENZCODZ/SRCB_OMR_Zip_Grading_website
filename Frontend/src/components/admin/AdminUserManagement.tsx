import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  UserPlus,
  ShieldCheck,
  GraduationCap,
  Users,
  Search,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Award,
  KeyRound,
  Eye,
  EyeOff,
  RefreshCw,
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  X,
  Check,
  Sparkles,
  UserCheck,
  Shield,
  FileDown,
  IdCard,
  ChevronDown,
  ArrowUpDown,
  RotateCcw,
  BookOpen,
  Copy,
} from "lucide-react";
import * as XLSX from "xlsx";
import type { AuthUser, PendingUser } from "../../types";
import { fetchAllUsers, adminCreateUser, adminBatchCreateUsers, deleteUser } from "../../api";
import { SkeletonTable, SmoothContentTransition } from "../shared";
import { cacheManager } from "../../utils/cacheManager";

const DEFAULT_SYSTEM_USERS: PendingUser[] = [];

export interface ProgrammeOption {
  code: string;
  name: string;
  label: string;
  collegiateOptions: string[];
}

const PROGRAMME_OPTIONS: ProgrammeOption[] = [
  {
    code: "BSIT",
    name: "Bachelor of Science in Information Technology",
    label: "BSIT — Bachelor of Science in Information Technology",
    collegiateOptions: ["College of Computing Studies", "N/A"],
  },
  {
    code: "BSCRIM",
    name: "Bachelor of Science in Criminology",
    label: "BSCRIM — Bachelor of Science in Criminology",
    collegiateOptions: ["College of Criminal Justice Education", "N/A"],
  },
  {
    code: "BSHM",
    name: "Bachelor of Science in Hotel Management",
    label: "BSHM — Bachelor of Science in Hotel Management",
    collegiateOptions: ["College of Hospitality Management", "N/A"],
  },
  {
    code: "BSBA",
    name: "Bachelor of Science in Business Administration",
    label: "BSBA — Bachelor of Science in Business Administration",
    collegiateOptions: [
      "Financial Management",
      "Human Resource Development Management",
      "Marketing Management",
      "College of Business Administration",
    ],
  },
  {
    code: "TEP",
    name: "Teacher Education Program",
    label: "TEP — Teacher Education Program",
    collegiateOptions: [
      "English",
      "Mathematics",
      "Science",
      "Filipino",
      "College of Teacher Education",
    ],
  },
];

const getCollegiateOptionsForProgramme = (progCode: string): string[] => {
  const p = (progCode || "").trim().toUpperCase();
  const found = PROGRAMME_OPTIONS.find((item) => item.code.toUpperCase() === p);
  if (found) return found.collegiateOptions;
  if (p === "IT" || p.includes("INFO") || p.includes("COMP")) return ["College of Computing Studies", "N/A"];
  if (p.includes("BA") || p.includes("BUS") || p.includes("ADMIN")) {
    return [
      "Financial Management",
      "Human Resource Development Management",
      "Marketing Management",
      "College of Business Administration",
    ];
  }
  if (p.includes("CRIM")) return ["College of Criminal Justice Education", "N/A"];
  if (p.includes("HM") || p.includes("HOTEL") || p.includes("HOSP")) return ["College of Hospitality Management", "N/A"];
  if (p === "BSED" || p.includes("TEP") || p.includes("TEACH") || p.includes("EDUC")) {
    return ["English", "Mathematics", "Science", "Filipino", "College of Teacher Education"];
  }
  return ["N/A"];
};

const getDepartmentForProgram = (prog: string): string => {
  const options = getCollegiateOptionsForProgramme(prog);
  return options[0] || "N/A";
};


interface ParsedStudentRow {
  id: string;
  student_id: string;
  name: string;
  email: string;
  programme: string;
  department: string;
  initial_password: string;
  status: "ready" | "duplicate_file" | "exists_system" | "invalid";
  errorMessage?: string;
}

interface AdminUserManagementProps {
  currentUser?: AuthUser;
  addToast: (type: "success" | "error" | "info", message: string) => void;
  formatDate?: (iso: string) => string;
  viewMode?: "all" | "create" | "directory";
}

export default function AdminUserManagement({
  currentUser,
  addToast,
  viewMode = "all",
}: AdminUserManagementProps) {
  const isCurrentUserAdmin = currentUser?.role === "admin";
  const isProgrammeHead = currentUser?.role === "programme-head";
  const phProgram = (currentUser?.programme || "BSIT").toLowerCase();

  const [users, setUsers] = useState<PendingUser[]>(
    () => cacheManager.get<PendingUser[]>("users_all") || []
  );
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "teacher" | "student" | "programme-head" | "admin">("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name_asc" | "name_desc" | "date_desc" | "date_asc" | "role">("name_asc");

  // Mode state within creation tab
  const [creationTab, setCreationTab] = useState<"single" | "bulk">("single");

  // Single Account Form State
  const [targetRole, setTargetRole] = useState<"teacher" | "programme-head" | "student">("teacher");
  const [honorific, setHonorific] = useState("Prof.");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [programme, setProgramme] = useState("BSIT");
  const [department, setDepartment] = useState("College of Computing Studies");
  const [idSuffix, setIdSuffix] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Custom Modal States (Institutional UI replacing browser-native dialogs)
  const [userToDelete, setUserToDelete] = useState<{
    id: string;
    name: string;
    email?: string;
    role?: string;
    student_id?: string;
  } | null>(null);

  const [createdAccountModal, setCreatedAccountModal] = useState<{
    name: string;
    email: string;
    password: string;
    role: string;
    programme?: string;
    department?: string;
    student_id?: string;
  } | null>(null);
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [isBatchEnrollModalOpen, setIsBatchEnrollModalOpen] = useState(false);
  const [isClearBatchModalOpen, setIsClearBatchModalOpen] = useState(false);

  const copyToClipboard = (text: string, fieldId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Bulk Enrollment State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudentRow[]>([]);
  const [bulkDefaultProgram, setBulkDefaultProgram] = useState("BSIT");
  const [bulkDefaultDepartment, setBulkDefaultDepartment] = useState("N/A");
  const [bulkPasswordPolicy, setBulkPasswordPolicy] = useState<"student_id" | "random" | "custom">("student_id");
  const [bulkCustomPassword, setBulkCustomPassword] = useState("Srcb@2026");
  const [bulkSearchQuery, setBulkSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [enrollProgress, setEnrollProgress] = useState({ current: 0, total: 0 });
  const [enrolledSummary, setEnrolledSummary] = useState<{
    count: number;
    failed: number;
    enrolledList: any[];
  } | null>(null);

  const getFullName = () => {
    const parts: string[] = [];
    if ((targetRole === "teacher" || targetRole === "programme-head") && honorific && honorific !== "None") {
      parts.push(honorific);
    }
    if (firstName.trim()) parts.push(firstName.trim());
    if (middleName.trim()) {
      const mid = middleName.trim();
      parts.push(mid.length === 1 ? `${mid}.` : mid);
    }
    if (lastName.trim()) parts.push(lastName.trim());
    if (suffix.trim() && suffix !== "None") parts.push(suffix.trim());
    return parts.join(" ");
  };

  const getFormattedId = () => {
    const raw = idSuffix.trim();
    if (!raw) return "";
    return raw;
  };

  const loadUsers = async (forceRefresh = false) => {
    const hasCached = cacheManager.has("users_all");
    if (!hasCached || forceRefresh) {
      setLoading(true);
    }
    try {
      const data = await fetchAllUsers({ forceRefresh });
      if (data && Array.isArray(data) && data.length > 0) {
        setUsers(data);
      } else {
        setUsers(DEFAULT_SYSTEM_USERS);
      }
    } catch {
      if (!hasCached) {
        setUsers(DEFAULT_SYSTEM_USERS);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleSwitch = (newRole: "teacher" | "programme-head" | "student") => {
    setTargetRole(newRole);
  };

  const handleProgrammeChange = (newProg: string) => {
    setProgramme(newProg);
    const available = getCollegiateOptionsForProgramme(newProg);
    if (!available.includes(department)) {
      setDepartment(available[0] || "N/A");
    }
  };

  const handleBulkProgramChange = (newProg: string) => {
    setBulkDefaultProgram(newProg);
    const available = getCollegiateOptionsForProgramme(newProg);
    if (!available.includes(bulkDefaultDepartment)) {
      setBulkDefaultDepartment(available[0] || "N/A");
    }
  };

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let gen = "";
    for (let i = 0; i < 10; i++) {
      gen += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return gen;
  };

  const handleGeneratePassword = () => {
    const gen = generateRandomPassword();
    setPassword(gen);
    setShowPassword(true);
    addToast("info", "Generated secure password for new account.");
  };

  const handleAppendDomain = () => {
    if (!email) {
      if (idSuffix) {
        const cleanId = idSuffix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
        setEmail(`s.${cleanId}@srcb.edu.ph`);
      } else if (firstName && lastName) {
        const cleanFirst = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
        const cleanLast = lastName.toLowerCase().replace(/[^a-z0-9]/g, "");
        setEmail(`${cleanFirst}.${cleanLast}@srcb.edu.ph`);
      } else {
        setEmail("@srcb.edu.ph");
      }
    } else if (!email.includes("@")) {
      setEmail(`${email.trim()}@srcb.edu.ph`);
    } else {
      const parts = email.split("@");
      setEmail(`${parts[0]}@srcb.edu.ph`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    const cleanFullName = getFullName();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();
    const finalId = getFormattedId();

    if (!cleanFirst || !cleanLast) {
      addToast("error", "Please provide both First Name and Last Name.");
      return;
    }

    if (!cleanEmail || !cleanPass) {
      addToast("error", "Please fill in email and password fields.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      addToast("error", "Please provide a valid institutional email.");
      return;
    }

    if (cleanPass.length < 6) {
      addToast("error", "Password must be at least 6 characters.");
      return;
    }

    if (targetRole === "student" && !finalId) {
      addToast("error", "Please provide the Student ID number (e.g. 2024-00123).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminCreateUser({
        name: cleanFullName,
        email: cleanEmail,
        password: cleanPass,
        role: targetRole,
        programme,
        department,
        student_id: targetRole === "student" ? finalId : (finalId || undefined),
      });

      addToast("success", res.message || `Successfully created ${targetRole} account for ${cleanFullName}.`);

      // Display Institutional Credentials Modal with 1-click Copy
      setCreatedAccountModal({
        name: cleanFullName,
        email: cleanEmail,
        password: cleanPass,
        role: targetRole,
        programme,
        department,
        student_id: finalId || undefined,
      });

      // Reset form
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setSuffix("");
      setEmail("");
      setPassword("");
      setIdSuffix("");
      setProgramme("BSIT");
      setDepartment("N/A");

      loadUsers(true);
    } catch (err: any) {
      addToast("error", err.message || "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteUser = (user: { id: string; name: string; email?: string; role?: string; student_id?: string }) => {
    setUserToDelete(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const { id: userId, name: userName } = userToDelete;

    setDeletingId(userId);
    try {
      await deleteUser(userId);
      addToast("success", `Account for ${userName} has been removed.`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setUserToDelete(null);
    } catch (err: any) {
      addToast("error", err.message || "Failed to delete user account.");
    } finally {
      setDeletingId(null);
    }
  };

  // ----------------------------------------------------
  // BULK ENROLLMENT WORKFLOW HANDLERS
  // ----------------------------------------------------
  const downloadSampleTemplate = (type: "xlsx" | "csv") => {
    const sampleData = [
      {
        "Student ID": "2024-00101",
        "First Name": "Kenneth Ernest",
        "Middle Name": "G.",
        "Last Name": "Palicte",
        "Email": "k.palicte@srcb.edu.ph",
        "Program": "BSIT",
        "Department": "N/A",
      },
      {
        "Student ID": "2024-00102",
        "First Name": "Alyssa Jane",
        "Middle Name": "M.",
        "Last Name": "Bautista",
        "Email": "a.bautista@srcb.edu.ph",
        "Program": "BSBA",
        "Department": "Financial Management",
      },
      {
        "Student ID": "2024-00103",
        "First Name": "John Mark",
        "Middle Name": "D.",
        "Last Name": "Dizon",
        "Email": "j.dizon@srcb.edu.ph",
        "Program": "TEP",
        "Department": "English",
      },
      {
        "Student ID": "2024-00104",
        "First Name": "Samantha Nicole",
        "Middle Name": "R.",
        "Last Name": "Cruz",
        "Email": "s.cruz@srcb.edu.ph",
        "Program": "BSHM",
        "Department": "N/A",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 20 },
      { wch: 15 },
      { wch: 18 },
      { wch: 28 },
      { wch: 12 },
      { wch: 26 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Student Enrollment Template");

    if (type === "xlsx") {
      XLSX.writeFile(wb, "SRCB_Student_Enrollment_Template.xlsx");
    } else {
      XLSX.writeFile(wb, "SRCB_Student_Enrollment_Template.csv");
    }
    addToast("success", `Downloaded sample ${type.toUpperCase()} template.`);
  };

  const processUploadedFile = async (file: File) => {
    try {
      setIsUploading(true);
      setBulkFile(file);
      setEnrolledSummary(null);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

      if (!rawRows || rawRows.length === 0) {
        addToast("error", "The uploaded file does not contain any readable student data rows.");
        setIsUploading(false);
        return;
      }

      const seenIdsInFile = new Set<string>();
      const existingSystemIds = new Set(
        users.filter((u) => u.student_id).map((u) => u.student_id!.trim().toLowerCase())
      );
      const existingSystemEmails = new Set(
        users.filter((u) => u.email).map((u) => u.email.trim().toLowerCase())
      );

      const parsed: ParsedStudentRow[] = rawRows.map((row, idx) => {
        const rawId = String(
          row["Student ID"] ||
          row["StudentID"] ||
          row["Student_ID"] ||
          row["StudentNo"] ||
          row["Student No"] ||
          row["ID Number"] ||
          row["ID"] ||
          row["student_id"] ||
          ""
        ).trim();

        const fName = String(row["First Name"] || row["FirstName"] || row["first_name"] || "").trim();
        const mName = String(row["Middle Name"] || row["MiddleName"] || row["middle_name"] || "").trim();
        const lName = String(row["Last Name"] || row["LastName"] || row["last_name"] || "").trim();
        let fullName = String(
          row["Student Name"] || row["Full Name"] || row["Name"] || row["student_name"] || ""
        ).trim();

        if (!fullName && (fName || lName)) {
          fullName = [fName, mName, lName].filter(Boolean).join(" ");
        }

        const prog = String(
          row["Program"] || row["Programme"] || row["Course"] || row["program"] || row["programme"] || bulkDefaultProgram
        ).trim() || bulkDefaultProgram;

        const dept = String(
          row["Department"] || row["Collegiate Department"] || row["Major"] || row["major"] || row["department"] || getDepartmentForProgram(prog)
        ).trim() || getDepartmentForProgram(prog);

        let studentEmail = String(
          row["Email"] || row["School Email"] || row["Institutional Email"] || row["email"] || ""
        ).trim().toLowerCase();

        if (!studentEmail && rawId) {
          const cleanId = rawId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
          studentEmail = `s.${cleanId}@srcb.edu.ph`;
        }

        let initialPass = "";
        if (bulkPasswordPolicy === "student_id") {
          initialPass = rawId.length >= 6 ? rawId : `Srcb@${rawId}`;
        } else if (bulkPasswordPolicy === "random") {
          initialPass = generateRandomPassword();
        } else {
          initialPass = bulkCustomPassword || "Srcb@2026";
        }

        let status: "ready" | "duplicate_file" | "exists_system" | "invalid" = "ready";
        let errorMessage = "";

        if (!rawId || !fullName) {
          status = "invalid";
          errorMessage = !rawId ? "Missing Student ID" : "Missing Full Name";
        } else {
          const lowerId = rawId.toLowerCase();
          if (seenIdsInFile.has(lowerId)) {
            status = "duplicate_file";
            errorMessage = "Duplicate ID within uploaded spreadsheet";
          } else if (existingSystemIds.has(lowerId)) {
            status = "exists_system";
            errorMessage = "Student ID already exists in system";
          } else if (studentEmail && existingSystemEmails.has(studentEmail)) {
            status = "exists_system";
            errorMessage = "Email already registered in system";
          } else {
            seenIdsInFile.add(lowerId);
          }
        }

        return {
          id: `row-${idx}-${Date.now()}`,
          student_id: rawId,
          name: fullName,
          email: studentEmail,
          programme: prog,
          department: dept,
          initial_password: initialPass,
          status,
          errorMessage,
        };
      });

      setParsedStudents(parsed);
      addToast("info", `Successfully loaded ${parsed.length} student entries.`);
    } catch (err: any) {
      addToast("error", err.message || "Failed to parse spreadsheet file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processUploadedFile(file);
    }
  };

  const handleRemoveRow = (rowId: string) => {
    setParsedStudents((prev) => prev.filter((r) => r.id !== rowId));
  };

  const handleRequestBatchEnrollment = () => {
    const readyList = parsedStudents.filter((s) => s.status === "ready");
    if (readyList.length === 0) {
      addToast("error", "No valid students are ready for enrollment.");
      return;
    }
    setIsBatchEnrollModalOpen(true);
  };

  const handleConfirmClearBatch = () => {
    setParsedStudents([]);
    setBulkFile(null);
    setEnrolledSummary(null);
    setIsClearBatchModalOpen(false);
    addToast("info", "Staged enrollment batch cleared.");
  };

  const handleConfirmBatchEnrollment = async () => {
    setIsBatchEnrollModalOpen(false);
    const readyList = parsedStudents.filter((s) => s.status === "ready");
    if (readyList.length === 0) {
      addToast("error", "No valid students are ready for enrollment.");
      return;
    }

    setIsEnrolling(true);
    setEnrollProgress({ current: 0, total: readyList.length });

    try {
      const payload = readyList.map((s) => ({
        name: s.name,
        student_id: s.student_id,
        email: s.email,
        password: s.initial_password,
        programme: s.programme,
        department: s.department,
      }));

      let successCount = 0;
      let failedCount = 0;
      const finalEnrolled: any[] = [];

      try {
        const res = await adminBatchCreateUsers(payload);
        if (res && res.status === "success") {
          successCount = res.created_count;
          failedCount = res.failed_count;
          finalEnrolled.push(...(res.created || []));
        } else {
          throw new Error("Batch API returned fallback signal");
        }
      } catch {
        // Sequential fallback
        for (let i = 0; i < readyList.length; i++) {
          const item = readyList[i];
          try {
            const res = await adminCreateUser({
              name: item.name,
              email: item.email,
              password: item.initial_password,
              role: "student",
              programme: item.programme,
              department: item.department,
              student_id: item.student_id,
            });
            successCount++;
            finalEnrolled.push({ ...item, ...res.user });
          } catch {
            failedCount++;
          }
          setEnrollProgress({ current: i + 1, total: readyList.length });
        }
      }

      setEnrolledSummary({
        count: successCount,
        failed: failedCount,
        enrolledList: finalEnrolled.length > 0 ? finalEnrolled : readyList,
      });

      addToast("success", `Batch enrollment complete! ${successCount} student accounts provisioned.`);
      loadUsers(true);
    } catch (err: any) {
      addToast("error", err.message || "An error occurred during batch enrollment.");
    } finally {
      setIsEnrolling(false);
    }
  };

  const exportEnrolledCredentials = () => {
    if (!enrolledSummary || enrolledSummary.enrolledList.length === 0) return;

    const exportData = enrolledSummary.enrolledList.map((st, i) => ({
      "No.": i + 1,
      "Student ID": st.student_id,
      "Full Name": st.name,
      "School Email": st.email,
      "Program": st.programme,
      "Department": st.department,
      "Initial Password": st.initial_password || st.password || "(Assigned)",
      "Account Status": "Active",
      "Enrollment Date": new Date().toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 16 },
      { wch: 26 },
      { wch: 28 },
      { wch: 12 },
      { wch: 24 },
      { wch: 20 },
      { wch: 14 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Enrolled Credentials");
    XLSX.writeFile(wb, `SRCB_Enrolled_Students_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addToast("success", "Downloaded credentials roster (.xlsx).");
  };

  // Stats calculation
  const totalTeachers = users.filter((u) => u.role === "teacher").length;
  const totalStudents = users.filter((u) => u.role === "student").length;
  const totalProgrammeHeads = users.filter((u) => u.role === "programme-head").length;
  const totalAdminsAndDeans = users.filter((u) => u.role === "admin" || u.role === "dean").length;

  const OFFICIAL_PROGRAM_CODES = ["BSIT", "BSCRIM", "BSHM", "BSBA", "TEP"];

  const availablePrograms = useMemo(() => {
    return OFFICIAL_PROGRAM_CODES;
  }, []);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.department && u.department.trim() && u.department !== "N/A") {
        set.add(u.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const result = users.filter((u) => {
      // Exclude any account not belonging to the 5 official institutional programmes (unless administrative system role)
      if (u.role !== "admin" && u.role !== "dean") {
        const uProg = (u.programme || "").trim().toUpperCase();
        if (!OFFICIAL_PROGRAM_CODES.includes(uProg)) {
          return false;
        }
      }

      if (isProgrammeHead) {
        if (u.role !== "student") return false;
        const uProg = (u.programme || "").toLowerCase().trim();
        const isMatch =
          uProg === phProgram ||
          ((uProg === "it" || uProg === "bsit") && (phProgram === "it" || phProgram === "bsit")) ||
          ((uProg === "tep" || uProg === "bsed") && (phProgram === "tep" || phProgram === "bsed"));
        if (!isMatch) return false;
      } else {
        if (roleFilter !== "all") {
          if (roleFilter === "admin") {
            if (u.role !== "admin" && u.role !== "dean") return false;
          } else if (u.role !== roleFilter) {
            return false;
          }
        }
      }

      if (programFilter !== "all") {
        if ((u.programme || "").toLowerCase() !== programFilter.toLowerCase()) return false;
      }

      if (deptFilter !== "all") {
        if ((u.department || "").toLowerCase() !== deptFilter.toLowerCase()) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (u.name || "").toLowerCase().includes(q);
        const matchEmail = (u.email || "").toLowerCase().includes(q);
        const matchDept = (u.department || "").toLowerCase().includes(q);
        const matchProg = (u.programme || "").toLowerCase().includes(q);
        const matchId = (u.student_id || "").toLowerCase().includes(q);
        return matchName || matchEmail || matchDept || matchProg || matchId;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "name_asc") return (a.name || "").localeCompare(b.name || "");
      if (sortBy === "name_desc") return (b.name || "").localeCompare(a.name || "");
      if (sortBy === "date_desc") return (b.created_at || "").localeCompare(a.created_at || "");
      if (sortBy === "date_asc") return (a.created_at || "").localeCompare(b.created_at || "");
      if (sortBy === "role") return (a.role || "").localeCompare(b.role || "");
      return 0;
    });

    return result;
  }, [users, isProgrammeHead, phProgram, roleFilter, programFilter, deptFilter, searchQuery, sortBy]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    roleFilter !== "all" ||
    programFilter !== "all" ||
    deptFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setProgramFilter("all");
    setDeptFilter("all");
    setSortBy("name_asc");
  };

  const handleExportFilteredUsers = () => {
    try {
      const data = filteredUsers.map((u: PendingUser, index: number) => ({
        "No.": index + 1,
        "Name": u.name,
        "Role": u.role.toUpperCase(),
        "Email": u.email,
        "Programme": u.programme || "—",
        "Department": u.department || "—",
        "Student / Institutional ID": u.student_id || "—",
        "Account Status": u.status || "active",
        "Registered Date": u.created_at ? new Date(u.created_at).toLocaleDateString() : "—",
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "User Accounts Directory");
      XLSX.writeFile(wb, `SRCB_User_Accounts_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
      addToast("success", `Exported ${filteredUsers.length} user records to Excel (.xlsx).`);
    } catch {
      addToast("error", "Failed to export user accounts directory to Excel.");
    }
  };

  const validParsedCount = parsedStudents.filter((s) => s.status === "ready").length;
  const duplicateParsedCount = parsedStudents.filter((s) => s.status === "duplicate_file" || s.status === "exists_system").length;
  const invalidParsedCount = parsedStudents.filter((s) => s.status === "invalid").length;

  const filteredParsedStudents = parsedStudents.filter((s) => {
    if (!bulkSearchQuery.trim()) return true;
    const q = bulkSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.student_id.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.programme.toLowerCase().includes(q)
    );
  });

  return (
    <div className="account-creation-shell">
      {/* VIEW MODE SENSITIVE NAVIGATION TABS (CREATE ACCOUNT TAB) */}
      {viewMode === "create" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div className="account-mode-tabs">
            <button
              type="button"
              className={`account-mode-btn ${creationTab === "single" ? "active" : ""}`}
              onClick={() => setCreationTab("single")}
            >
              <UserPlus size={16} /> Single Account
            </button>
            <button
              type="button"
              className={`account-mode-btn ${creationTab === "bulk" ? "active" : ""}`}
              onClick={() => setCreationTab("bulk")}
            >
              <FileSpreadsheet size={16} /> Bulk Student Enrollment (Excel / CSV)
            </button>
          </div>

          <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
            Total Registered Users: <strong style={{ color: "#0f172a" }}>{users.length}</strong> accounts
          </div>
        </div>
      )}

      {/* ── MAIN CONTAINER ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            viewMode === "all"
              ? "repeat(auto-fit, minmax(420px, 1fr))"
              : "1fr",
          gap: "1.5rem",
          alignItems: "start",
          width: "100%",
        }}
      >
        {/* ========================================================= */}
        {/* SINGLE ACCOUNT CREATOR FORM (ADMIN ONLY) */}
        {/* ========================================================= */}
        {(viewMode === "all" || (viewMode === "create" && creationTab === "single")) && (
          <div className="account-card-premium">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: "var(--primary-light-surface, #f5f3ff)",
                  border: "1px solid var(--primary-light-border, #ddd6fe)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--primary, #28166f)",
                }}
              >
                <UserPlus size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                  Create Institutional Account
                </h3>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                  Directly provision active faculty and student credentials into the campus directory
                </p>
              </div>
            </div>

            {/* Role Selection Tabs */}
            <div className="account-role-pill-group">
              <button
                type="button"
                onClick={() => handleRoleSwitch("teacher")}
                className={`account-role-pill-btn ${targetRole === "teacher" ? "selected" : ""}`}
              >
                <ShieldCheck size={18} /> Teacher / Faculty
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch("programme-head")}
                className={`account-role-pill-btn ${targetRole === "programme-head" ? "selected" : ""}`}
              >
                <Award size={18} /> Programme Head
              </button>

              <button
                type="button"
                onClick={() => handleRoleSwitch("student")}
                className={`account-role-pill-btn ${targetRole === "student" ? "selected" : ""}`}
              >
                <GraduationCap size={18} /> Student Account
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.75rem", alignItems: "start" }}>
              {/* Form Column */}
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                {/* Name Fields: Structured 2-row layout */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "#334155" }}>
                    Full Legal Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>

                  <div
                    className="admin-name-fields-grid"
                    style={{
                      gridTemplateColumns:
                        targetRole === "teacher" || targetRole === "programme-head"
                          ? undefined
                          : "1fr 1fr",
                    }}
                  >
                    {(targetRole === "teacher" || targetRole === "programme-head") && (
                      <select
                        className="input"
                        value={honorific}
                        onChange={(e) => setHonorific(e.target.value)}
                        style={{ fontSize: "0.82rem", padding: "0.5rem" }}
                      >
                        <option value="Prof.">Prof.</option>
                        <option value="Dr.">Dr.</option>
                        <option value="Engr.">Engr.</option>
                        <option value="Mr.">Mr.</option>
                        <option value="Ms.">Ms.</option>
                        <option value="Mrs.">Mrs.</option>
                        <option value="None">None</option>
                      </select>
                    )}

                    <input
                      type="text"
                      className="input"
                      placeholder="First Name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                    />

                    <input
                      type="text"
                      className="input"
                      placeholder="Middle Name (Opt)"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                    />
                  </div>

                  <div className="admin-name-subfields-grid">
                    <input
                      type="text"
                      className="input"
                      placeholder="Last Name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                    />

                    <select
                      className="input"
                      value={suffix}
                      onChange={(e) => setSuffix(e.target.value)}
                      style={{ fontSize: "0.82rem", padding: "0.5rem" }}
                    >
                      <option value="">Suffix</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="None">None</option>
                    </select>
                  </div>

                  {(firstName.trim() || lastName.trim()) && (
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "#475569",
                        marginTop: "0.4rem",
                        background: "#f8fafc",
                        padding: "0.35rem 0.6rem",
                        borderRadius: "6px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <UserCheck size={13} style={{ color: "var(--primary, #28166f)" }} />
                      Display Name: <strong style={{ color: "var(--primary, #28166f)" }}>{getFullName()}</strong>
                    </div>
                  )}
                </div>

                {/* Institutional Student ID or Employee ID */}
                <div>
                  <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, marginBottom: "0.4rem", color: "#334155" }}>
                    {targetRole === "student" ? "Institutional Student ID Number" : "Employee ID Number"} {targetRole === "student" && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>

                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="input"
                      placeholder={targetRole === "student" ? "e.g. 2024-00123 or C2024-00123" : "e.g. EMP-10045"}
                      value={idSuffix}
                      onChange={(e) => setIdSuffix(e.target.value)}
                      required={targetRole === "student"}
                      style={{ paddingLeft: "2.3rem" }}
                    />
                    <IdCard size={16} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  </div>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.25rem", display: "block" }}>
                    Enter official student ID or registration code matching admission records
                  </span>
                </div>

                {/* Email Address with helper button */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                      Institutional School Email <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAppendDomain}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary, #28166f)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                      title="Quick fill @srcb.edu.ph"
                    >
                      <Sparkles size={12} /> Auto-Fill Domain
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type="email"
                      className="input"
                      style={{ width: "100%", paddingLeft: "2.3rem" }}
                      placeholder={targetRole === "teacher" ? "e.g. j.garcia@srcb.edu.ph" : "e.g. s.202400123@srcb.edu.ph"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Mail size={16} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  </div>
                </div>

                {/* Password with Auto-Generate */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                      Password <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary, #28166f)",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <KeyRound size={12} /> Auto-Generate
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="input"
                      style={{ width: "100%", paddingLeft: "2.3rem", paddingRight: "2.4rem" }}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <Lock size={16} style={{ position: "absolute", left: "0.8rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Academic Role & Programme Assignment */}
                <div
                  style={{
                    background: (targetRole === "teacher" || targetRole === "programme-head") ? "#f5f3ff" : "#f8fafc",
                    border: (targetRole === "teacher" || targetRole === "programme-head") ? "1.5px solid #c4b5fd" : "1px solid #e2e8f0",
                    borderRadius: "14px",
                    padding: "1.1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.85rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ fontSize: "0.84rem", fontWeight: 800, color: (targetRole === "teacher" || targetRole === "programme-head") ? "var(--primary, #28166f)" : "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                      <BookOpen size={16} />
                      {(targetRole === "teacher" || targetRole === "programme-head")
                        ? "Assigned Academic Programme (System Role Recognition) *"
                        : "Academic Programme & Department *"}
                    </label>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "6px",
                        background: (targetRole === "teacher" || targetRole === "programme-head") ? "#ede9fe" : "#e2e8f0",
                        color: (targetRole === "teacher" || targetRole === "programme-head") ? "#5b21b6" : "#475569",
                      }}
                    >
                      {programme}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <span style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, marginBottom: "0.3rem", color: "#475569" }}>
                        Designated Programme *
                      </span>
                      <select
                        className="input"
                        style={{ width: "100%", fontWeight: 600 }}
                        value={programme}
                        onChange={(e) => handleProgrammeChange(e.target.value)}
                      >
                        {PROGRAMME_OPTIONS.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <span style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, marginBottom: "0.3rem", color: "#475569" }}>
                        Collegiate Department / Specialization
                      </span>
                      <select
                        className="input"
                        style={{ width: "100%", fontWeight: 600 }}
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                      >
                        {getCollegiateOptionsForProgramme(programme).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(targetRole === "teacher" || targetRole === "programme-head") && (
                    <div
                      style={{
                        fontSize: "0.74rem",
                        color: "#4c1d95",
                        background: "rgba(255, 255, 255, 0.7)",
                        padding: "0.55rem 0.8rem",
                        borderRadius: "8px",
                        border: "1px solid #ddd6fe",
                        lineHeight: 1.45,
                      }}
                    >
                      <Sparkles size={13} style={{ verticalAlign: "middle", marginRight: "4px", color: "var(--primary, #28166f)" }} />
                      <strong>Engine Recognition:</strong> When created, this {targetRole === "programme-head" ? "Programme Head" : "Teacher"} account will be automatically bound to the{" "}
                      <strong>{PROGRAMME_OPTIONS.find(p => p.code === programme)?.name || programme}</strong> ({programme}) faculty roster. All exam sets, sheet grading, item analyses, and dean oversight matrices will immediately recognize this account under this programme.
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{
                    marginTop: "0.5rem",
                    width: "100%",
                    padding: "0.85rem",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    background: "var(--primary, #28166f)",
                    color: "#ffffff",
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 4px 14px rgba(40, 22, 111, 0.25)",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={18} className="spin" style={{ marginRight: "0.5rem" }} /> Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} style={{ marginRight: "0.5rem" }} /> Create & Provision{" "}
                      {targetRole === "teacher"
                        ? "Faculty Teacher"
                        : targetRole === "programme-head"
                          ? "Programme Head"
                          : "Student"}{" "}
                      Account
                    </>
                  )}
                </button>
              </form>

              {/* Live Digital ID Card Preview */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "1.5rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.2rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>
                    Digital ID Card Preview
                  </div>
                  <span
                    style={{
                      background: targetRole === "student" ? "#ecfdf5" : targetRole === "programme-head" ? "#eff6ff" : "#f5f3ff",
                      color: targetRole === "student" ? "#059669" : targetRole === "programme-head" ? "#1d4ed8" : "var(--primary, #28166f)",
                      border: `1px solid ${targetRole === "student" ? "#a7f3d0" : targetRole === "programme-head" ? "#bfdbfe" : "var(--primary-light-border, #ddd6fe)"}`,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {targetRole === "student" ? <GraduationCap size={12} /> : targetRole === "programme-head" ? <Award size={12} /> : <ShieldCheck size={12} />}
                    {targetRole === "student" ? "STUDENT" : targetRole === "programme-head" ? "PROGRAMME HEAD" : "FACULTY TEACHER"}
                  </span>
                </div>

                {/* ID Badge Frame */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #28166f 0%, #1e1058 100%)",
                    borderRadius: "14px",
                    padding: "1.4rem",
                    color: "#ffffff",
                    boxShadow: "0 8px 24px rgba(40, 22, 111, 0.2)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: "-20px",
                      bottom: "-20px",
                      opacity: 0.1,
                      pointerEvents: "none",
                    }}
                  >
                    <Shield size={160} />
                  </div>

                  <div style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.85, marginBottom: "0.2rem" }}>
                    St. Rita's College of Balingasag
                  </div>
                  <div style={{ fontSize: "0.68rem", opacity: 0.7, marginBottom: "1.2rem" }}>
                    Higher Education Department
                  </div>

                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div
                      style={{
                        width: "60px",
                        height: "60px",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.15)",
                        border: "2px solid rgba(255, 255, 255, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {firstName ? firstName[0].toUpperCase() : targetRole === "student" ? "S" : targetRole === "programme-head" ? "H" : "F"}
                    </div>
                    <div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.2 }}>
                        {getFullName() || "Student Full Name"}
                      </div>
                      <div style={{ fontSize: "0.78rem", opacity: 0.85, marginTop: "0.2rem" }}>
                        ID: <strong style={{ color: "#facc15" }}>{getFormattedId() || "2024-XXXXX"}</strong>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.15)", paddingTop: "0.85rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.72rem" }}>
                    <div>
                      <div style={{ opacity: 0.7 }}>PROGRAMME</div>
                      <div style={{ fontWeight: 700 }}>{programme}</div>
                    </div>
                    <div>
                      <div style={{ opacity: 0.7 }}>COLLEGIATE / MAJOR</div>
                      <div style={{ fontWeight: 700 }}>{department}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", opacity: 0.85, wordBreak: "break-all" }}>
                    {email || "student@srcb.edu.ph"}
                  </div>
                </div>

                <div style={{ fontSize: "0.76rem", color: "#64748b", lineHeight: 1.4 }}>
                  <Check size={14} style={{ color: "#10b981", verticalAlign: "middle", marginRight: "4px" }} />
                  Instant directory activation with automatic credentials hashing and student ledger registration.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* BULK STUDENT ENROLLMENT (EXCEL / CSV SPREADSHEET UPLOAD) */}
        {/* ========================================================= */}
        {(viewMode === "create" && creationTab === "bulk") && (
          <div className="account-card-premium">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "12px",
                    background: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#059669",
                  }}
                >
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                    Bulk Student Enrollment & Database Upload
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "#64748b" }}>
                    Batch enroll students all at once using an Excel spreadsheet (.xlsx, .xls) or CSV database file
                  </p>
                </div>
              </div>

              {/* Template Download Buttons */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => downloadSampleTemplate("xlsx")}
                  style={{ fontSize: "0.8rem", padding: "0.5rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Download size={14} /> Download Excel Template (.xlsx)
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => downloadSampleTemplate("csv")}
                  style={{ fontSize: "0.8rem", padding: "0.5rem 0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <Download size={14} /> Sample CSV (.csv)
                </button>
              </div>
            </div>

            {/* Batch Configuration Settings */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "1.15rem 1.25rem",
                marginBottom: "1.5rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "1rem",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                  Default Programme
                </label>
                <select
                  className="input"
                  style={{ width: "100%", fontSize: "0.85rem" }}
                  value={bulkDefaultProgram}
                  onChange={(e) => handleBulkProgramChange(e.target.value)}
                >
                  {PROGRAMME_OPTIONS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Applied if row has blank program</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                  Default Collegiate Department
                </label>
                <select
                  className="input"
                  style={{ width: "100%", fontSize: "0.85rem" }}
                  value={bulkDefaultDepartment}
                  onChange={(e) => setBulkDefaultDepartment(e.target.value)}
                >
                  {getCollegiateOptionsForProgramme(bulkDefaultProgram).map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Applied if row has blank department</span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, marginBottom: "0.35rem", color: "#475569" }}>
                  Initial Password Policy
                </label>
                <select
                  className="input"
                  style={{ width: "100%", fontSize: "0.85rem" }}
                  value={bulkPasswordPolicy}
                  onChange={(e) => setBulkPasswordPolicy(e.target.value as any)}
                >
                  <option value="student_id">Use Student ID Number as initial password</option>
                  <option value="random">Auto-generate secure random password per student</option>
                  <option value="custom">Use uniform default password</option>
                </select>
                {bulkPasswordPolicy === "custom" ? (
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Srcb@2026"
                    value={bulkCustomPassword}
                    onChange={(e) => setBulkCustomPassword(e.target.value)}
                    style={{ marginTop: "0.35rem", fontSize: "0.8rem" }}
                  />
                ) : (
                  <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                    {bulkPasswordPolicy === "student_id" ? "Students login using their own ID" : "Unique passwords exported after enrollment"}
                  </span>
                )}
              </div>
            </div>

            {/* Drag and Drop Zone */}
            <div
              className={`bulk-dropzone ${isDragging ? "dragging" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    processUploadedFile(e.target.files[0]);
                  }
                }}
              />

              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "var(--primary-light-surface, #f5f3ff)",
                    border: "1px solid var(--primary-light-border, #ddd6fe)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--primary, #28166f)",
                  }}
                >
                  <UploadCloud size={28} />
                </div>

                <div>
                  <span style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a" }}>
                    {isUploading ? "Reading and analyzing spreadsheet file..." : bulkFile ? bulkFile.name : "Click to select or drag & drop Excel / CSV file"}
                  </span>
                  <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    {bulkFile
                      ? `${(bulkFile.size / 1024).toFixed(1)} KB — ${parsedStudents.length} records parsed. Click to upload a different spreadsheet.`
                      : "Supports .xlsx, .xls, and .csv spreadsheet formats with student columns"}
                  </p>
                </div>
              </div>
            </div>

            {/* Enrolled Summary Banner (if completed) */}
            {enrolledSummary && (
              <div
                style={{
                  marginTop: "1.5rem",
                  padding: "1.25rem 1.5rem",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      background: "#10b981",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Check size={22} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#065f46" }}>
                      Batch Enrollment Successful!
                    </h4>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#047857" }}>
                      {enrolledSummary.count} student accounts enrolled into active directory ({enrolledSummary.failed} skipped/existing).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={exportEnrolledCredentials}
                  style={{
                    background: "#059669",
                    border: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: 800,
                  }}
                >
                  <FileDown size={16} /> Export Student Credentials (.xlsx)
                </button>
              </div>
            )}

            {/* Parsed Students Preview & Action Bar */}
            {parsedStudents.length > 0 && (
              <div style={{ marginTop: "1.75rem" }}>
                {/* Metric Summary Counters */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700 }}>TOTAL ROWS</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>{parsedStudents.length}</div>
                  </div>
                  <div style={{ background: "#ecfdf5", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #a7f3d0" }}>
                    <div style={{ fontSize: "0.74rem", color: "#065f46", fontWeight: 700 }}>READY TO ENROLL</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#059669" }}>{validParsedCount}</div>
                  </div>
                  <div style={{ background: "#fff1f2", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #fecdd3" }}>
                    <div style={{ fontSize: "0.74rem", color: "#9f1239", fontWeight: 700 }}>DUPLICATES / EXISTING</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#e11d48" }}>{duplicateParsedCount}</div>
                  </div>
                  <div style={{ background: "#fffbeb", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #fde68a" }}>
                    <div style={{ fontSize: "0.74rem", color: "#92400e", fontWeight: 700 }}>INVALID ROWS</div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#d97706" }}>{invalidParsedCount}</div>
                  </div>
                </div>

                {/* Search & Actions Bar */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div style={{ position: "relative", minWidth: "260px" }}>
                    <input
                      type="text"
                      className="input"
                      style={{ paddingLeft: "2.1rem", fontSize: "0.82rem", height: "36px" }}
                      placeholder="Search parsed records..."
                      value={bulkSearchQuery}
                      onChange={(e) => setBulkSearchQuery(e.target.value)}
                    />
                    <Search size={14} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (parsedStudents.length > 0) {
                          setIsClearBatchModalOpen(true);
                        } else {
                          setParsedStudents([]);
                          setBulkFile(null);
                          setEnrolledSummary(null);
                        }
                      }}
                      disabled={isEnrolling || isUploading}
                      style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem" }}
                    >
                      Clear File
                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleRequestBatchEnrollment}
                      disabled={isEnrolling || isUploading || validParsedCount === 0}
                      style={{
                        fontSize: "0.85rem",
                        padding: "0.45rem 1.1rem",
                        fontWeight: 800,
                        background: "var(--primary, #28166f)",
                        color: "#ffffff",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {isEnrolling ? (
                        <>
                          <RefreshCw size={16} className="spin" /> Enrolling ({enrollProgress.current}/{enrollProgress.total})...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} /> Enroll All ({validParsedCount} Students)
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress Bar (when enrolling) */}
                {isEnrolling && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700, marginBottom: "0.3rem", color: "#475569" }}>
                      <span>Enrolling students into institutional database...</span>
                      <span>{Math.round((enrollProgress.current / (enrollProgress.total || 1)) * 100)}%</span>
                    </div>
                    <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${(enrollProgress.current / (enrollProgress.total || 1)) * 100}%`,
                          background: "var(--primary, #28166f)",
                          transition: "width 0.2s ease",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Parsed Preview Table */}
                <div className="bulk-table-wrapper" style={{ maxHeight: "380px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>#</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Student ID</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Student Name</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>School Email</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Program & Dept</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Initial Password</th>
                        <th style={{ padding: "0.6rem 0.75rem", color: "#475569" }}>Status</th>
                        <th style={{ padding: "0.6rem 0.75rem", textAlign: "right", color: "#475569" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParsedStudents.map((row, idx) => (
                        <tr
                          key={row.id}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: row.status === "invalid" ? "#fffdfa" : "transparent",
                          }}
                        >
                          <td style={{ padding: "0.55rem 0.75rem", color: "#94a3b8" }}>{idx + 1}</td>
                          <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: "#0f172a" }}>
                            {row.student_id || <span style={{ color: "#ef4444" }}>(Missing)</span>}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", fontWeight: 700, color: "#1e293b" }}>
                            {row.name || <span style={{ color: "#ef4444" }}>(Missing)</span>}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", color: "#64748b" }}>{row.email}</td>
                          <td style={{ padding: "0.55rem 0.75rem" }}>
                            <span style={{ fontWeight: 700, color: "#334155" }}>{row.programme}</span>{" "}
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>({row.department})</span>
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", fontFamily: "monospace", color: "#475569" }}>
                            {row.initial_password}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem" }}>
                            {row.status === "ready" && (
                              <span
                                className="bulk-badge-ready"
                                style={{
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "6px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <Check size={11} /> Ready
                              </span>
                            )}
                            {(row.status === "duplicate_file" || row.status === "exists_system") && (
                              <span
                                className="bulk-badge-duplicate"
                                style={{
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "6px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title={row.errorMessage}
                              >
                                <AlertTriangle size={11} /> {row.status === "duplicate_file" ? "File Duplicate" : "Exists in DB"}
                              </span>
                            )}
                            {row.status === "invalid" && (
                              <span
                                className="bulk-badge-warning"
                                style={{
                                  padding: "0.15rem 0.45rem",
                                  borderRadius: "6px",
                                  fontSize: "0.7rem",
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title={row.errorMessage}
                              >
                                <AlertTriangle size={11} /> Missing Info
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem", textAlign: "right" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(row.id)}
                              disabled={isEnrolling}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#94a3b8",
                                cursor: "pointer",
                                padding: "0.2rem",
                              }}
                              title="Remove row from batch"
                            >
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* USER DIRECTORY TABLE (VISIBLE IN DIRECTORY OR ALL MODE) */}
        {/* ========================================================= */}
        {(viewMode === "all" || viewMode === "directory") && (
          <div className="account-card-premium">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>
                  {isProgrammeHead ? `${currentUser?.programme || "BSIT"} Enrolled Students` : "User Accounts Directory"}
                </h3>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b", marginTop: "0.2rem" }}>
                  {isProgrammeHead
                    ? `Active student records under ${currentUser?.programme || "BSIT"} department (${filteredUsers.length} students)`
                    : `Comprehensive institutional user directory with multi-criteria filtering (${filteredUsers.length} accounts found)`}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleExportFilteredUsers}
                  title="Export Filtered Directory (.xlsx)"
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    color: "var(--primary, #28166f)",
                  }}
                >
                  <FileSpreadsheet size={15} /> Export Excel
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => loadUsers(true)}
                  disabled={loading}
                  title="Refresh users list"
                  style={{
                    padding: "0.45rem 0.85rem",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <RefreshCw size={14} className={loading ? "spin" : ""} /> Refresh
                </button>
              </div>
            </div>

            {/* Complete Filtration Toolbar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
              {/* Primary Search Bar */}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="input"
                  style={{
                    width: "100%",
                    paddingLeft: "2.3rem",
                    paddingRight: searchQuery ? "2.2rem" : "0.85rem",
                    fontSize: "0.84rem",
                    height: "38px",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                  placeholder={
                    isProgrammeHead
                      ? `Search ${currentUser?.programme || "BSIT"} students by name, email, or student ID...`
                      : "Search by user name, school email, department, programme, or ID number..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: "0.8rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#94a3b8",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{
                      position: "absolute",
                      right: "0.75rem",
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

              {/* Role Filter Pills */}
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                {isProgrammeHead ? (
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      background: "var(--primary-light-surface, #f5f3ff)",
                      color: "var(--primary, #28166f)",
                      padding: "0.35rem 0.85rem",
                      borderRadius: "20px",
                      border: "1px solid var(--primary-light-border, #ddd6fe)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <GraduationCap size={14} /> {currentUser?.programme || "BSIT"} Students Only ({filteredUsers.length})
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleFilter === "all" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: "0.78rem", padding: "0.32rem 0.75rem", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setRoleFilter("all")}
                    >
                      <Users size={13} /> All Accounts ({users.length})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleFilter === "teacher" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: "0.78rem", padding: "0.32rem 0.75rem", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setRoleFilter("teacher")}
                    >
                      <ShieldCheck size={13} /> Faculty Teachers ({totalTeachers})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleFilter === "student" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: "0.78rem", padding: "0.32rem 0.75rem", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setRoleFilter("student")}
                    >
                      <GraduationCap size={13} /> Students ({totalStudents})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleFilter === "programme-head" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: "0.78rem", padding: "0.32rem 0.75rem", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setRoleFilter("programme-head")}
                    >
                      <Award size={13} /> Programme Heads ({totalProgrammeHeads})
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${roleFilter === "admin" ? "btn-primary" : "btn-secondary"}`}
                      style={{ fontSize: "0.78rem", padding: "0.32rem 0.75rem", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                      onClick={() => setRoleFilter("admin")}
                    >
                      <Shield size={13} /> Admins & Deans ({totalAdminsAndDeans})
                    </button>
                  </>
                )}
              </div>

              {/* Multi-Criteria Secondary Filter Controls (Dean / Admin Navigation) */}
              {!isProgrammeHead && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                    gap: "0.6rem",
                    padding: "0.75rem 0.85rem",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                  }}
                >
                  {/* Academic Program Select */}
                  <div style={{ position: "relative" }}>
                    <select
                      value={programFilter}
                      onChange={(e) => setProgramFilter(e.target.value)}
                      style={{
                        width: "100%",
                        height: "34px",
                        fontSize: "0.8rem",
                        padding: "0 1.8rem 0 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontWeight: 600,
                        appearance: "none",
                      }}
                      aria-label="Filter by academic program"
                    >
                      <option value="all">All Programmes</option>
                      {availablePrograms.map((p: string) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                  </div>

                  {/* Department Select */}
                  <div style={{ position: "relative" }}>
                    <select
                      value={deptFilter}
                      onChange={(e) => setDeptFilter(e.target.value)}
                      style={{
                        width: "100%",
                        height: "34px",
                        fontSize: "0.8rem",
                        padding: "0 1.8rem 0 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontWeight: 600,
                        appearance: "none",
                      }}
                      aria-label="Filter by department"
                    >
                      <option value="all">All Departments</option>
                      {availableDepartments.map((d: string) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                  </div>

                  {/* Sort By Select */}
                  <div style={{ position: "relative" }}>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      style={{
                        width: "100%",
                        height: "34px",
                        fontSize: "0.8rem",
                        padding: "0 1.8rem 0 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#0f172a",
                        fontWeight: 600,
                        appearance: "none",
                      }}
                      aria-label="Sort users"
                    >
                      <option value="name_asc">Sort: Name (A → Z)</option>
                      <option value="name_desc">Sort: Name (Z → A)</option>
                      <option value="date_desc">Sort: Newest Registered</option>
                      <option value="date_asc">Sort: Oldest Registered</option>
                      <option value="role">Sort: Role</option>
                    </select>
                    <ArrowUpDown size={13} style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }} />
                  </div>

                  {/* Quick Reset Button */}
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      style={{
                        height: "34px",
                        fontSize: "0.78rem",
                        padding: "0 0.75rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        color: "#dc2626",
                        fontWeight: 700,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "5px",
                        cursor: "pointer",
                      }}
                      title="Clear all active filters"
                    >
                      <RotateCcw size={12} /> Clear Filters
                    </button>
                  )}
                </div>
              )}

              {/* Active Filter Badges */}
              {hasActiveFilters && !isProgrammeHead && (
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 700, marginRight: "0.2rem" }}>
                    Active Filters:
                  </span>
                  {searchQuery && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "14px",
                        color: "#0f172a",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Search: "{searchQuery}"
                      <X size={11} style={{ cursor: "pointer" }} onClick={() => setSearchQuery("")} />
                    </span>
                  )}
                  {roleFilter !== "all" && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "var(--primary-light-surface, #f5f3ff)",
                        border: "1px solid var(--primary-light-border, #ddd6fe)",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "14px",
                        color: "var(--primary, #28166f)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                      }}
                    >
                      Role: {roleFilter.toUpperCase()}
                      <X size={11} style={{ cursor: "pointer" }} onClick={() => setRoleFilter("all")} />
                    </span>
                  )}
                  {programFilter !== "all" && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "#eff6ff",
                        border: "1px solid #bfdbfe",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "14px",
                        color: "#1d4ed8",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                      }}
                    >
                      Programme: {programFilter}
                      <X size={11} style={{ cursor: "pointer" }} onClick={() => setProgramFilter("all")} />
                    </span>
                  )}
                  {deptFilter !== "all" && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        background: "#f0fdf4",
                        border: "1px solid #bbf7d0",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "14px",
                        color: "#15803d",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: 700,
                      }}
                    >
                      Dept: {deptFilter}
                      <X size={11} style={{ cursor: "pointer" }} onClick={() => setDeptFilter("all")} />
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* User Table List */}
            <SmoothContentTransition
              isLoading={loading}
              skeleton={<SkeletonTable rows={5} columns={5} />}
            >
              <div
                style={{
                  position: "relative",
                  maxHeight: "520px",
                  overflowY: "auto",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#ffffff",
                }}
              >
                {filteredUsers.length === 0 ? (
                  <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#64748b" }}>
                    <Users size={36} style={{ margin: "0 auto 0.75rem", color: "#94a3b8" }} />
                    <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b", margin: "0 0 0.25rem 0" }}>
                      No matching user accounts found
                    </p>
                    <p style={{ margin: 0, fontSize: "0.82rem" }}>
                      Try clearing or adjusting your search filters above.
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="btn btn-secondary btn-sm"
                        style={{ marginTop: "1rem" }}
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0", background: "#f8fafc", textAlign: "left" }}>
                        <th style={{ padding: "0.75rem 1rem", color: "#475569" }}>User Profile</th>
                        <th style={{ padding: "0.75rem 1rem", color: "#475569" }}>System Role</th>
                        <th style={{ padding: "0.75rem 1rem", color: "#475569" }}>Academic Programme</th>
                        <th style={{ padding: "0.75rem 1rem", color: "#475569" }}>Registered</th>
                        {isCurrentUserAdmin && (
                          <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569" }}>Action</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u: PendingUser) => {
                        const isTeacher = u.role === "teacher";
                        const isStudent = u.role === "student";
                        const isPh = u.role === "programme-head";
                        const isDean = u.role === "dean";
                        const isAdmin = u.role === "admin";

                        const roleBadgeConfig = isDean
                          ? { label: "DEAN", bg: "#fef3c7", color: "#b45309", border: "#fde68a", icon: <Award size={12} /> }
                          : isPh
                            ? { label: "PROG HEAD", bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd", icon: <BookOpen size={12} /> }
                            : isTeacher
                              ? { label: "FACULTY", bg: "#ecfdf5", color: "#059669", border: "#a7f3d0", icon: <ShieldCheck size={12} /> }
                              : isStudent
                                ? { label: "STUDENT", bg: "var(--primary-light-surface, #f5f3ff)", color: "var(--primary, #28166f)", border: "var(--primary-light-border, #ddd6fe)", icon: <GraduationCap size={12} /> }
                                : { label: "ADMIN", bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe", icon: <Shield size={12} /> };

                        const initials = (u.name || "U")
                          .replace(/^(Dr\.|Prof\.|Ms\.|Mr\.)\s+/i, "")
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((n: string) => n[0])
                          .join("")
                          .toUpperCase();

                        return (
                          <tr
                            key={u.id}
                            style={{
                              borderBottom: "1px solid #f1f5f9",
                              transition: "background 0.15s ease",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                          >
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                                <div
                                  style={{
                                    width: "34px",
                                    height: "34px",
                                    borderRadius: "50%",
                                    background: roleBadgeConfig.bg,
                                    color: roleBadgeConfig.color,
                                    border: `1px solid ${roleBadgeConfig.border}`,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    fontSize: "0.75rem",
                                    flexShrink: 0,
                                  }}
                                >
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                                  <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{u.email}</div>
                                  {u.student_id && (
                                    <div style={{ fontSize: "0.72rem", color: "var(--primary, #28166f)", fontWeight: 700, marginTop: "0.1rem" }}>
                                      ID: {u.student_id}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.35rem",
                                  padding: "0.22rem 0.55rem",
                                  borderRadius: "6px",
                                  fontSize: "0.72rem",
                                  fontWeight: 800,
                                  background: roleBadgeConfig.bg,
                                  color: roleBadgeConfig.color,
                                  border: `1px solid ${roleBadgeConfig.border}`,
                                }}
                              >
                                {roleBadgeConfig.icon}
                                {roleBadgeConfig.label}
                              </span>
                            </td>

                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>
                                {u.programme || "Institution-wide"}
                              </span>
                              {u.department && u.department !== "N/A" && (
                                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                  {u.department}
                                </div>
                              )}
                            </td>

                            <td style={{ padding: "0.75rem 1rem", color: "#64748b", fontSize: "0.76rem" }}>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                            </td>

                            {isCurrentUserAdmin && (
                              <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "0.4rem" }}>
                                  {!isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenDeleteUser({
                                          id: u.id,
                                          name: u.name,
                                          email: u.email,
                                          role: u.role,
                                          student_id: u.student_id,
                                        })
                                      }
                                      disabled={deletingId === u.id}
                                      title="Permanently remove account"
                                      style={{
                                        background: "#fef2f2",
                                        border: "1px solid #fecaca",
                                        color: "#ef4444",
                                        padding: "0.25rem 0.45rem",
                                        borderRadius: "6px",
                                        cursor: deletingId === u.id ? "not-allowed" : "pointer",
                                        opacity: deletingId === u.id ? 0.6 : 1,
                                        display: "inline-flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </SmoothContentTransition>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 1: DELETE USER ACCOUNT CONFIRMATION MODAL           */}
        {/* ========================================================= */}
        {userToDelete && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              padding: "1rem",
              animation: "modalFadeIn 0.18s ease-out",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !deletingId) {
                setUserToDelete(null);
              }
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                maxWidth: "460px",
                width: "100%",
                boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(239, 68, 68, 0.15)",
                overflow: "hidden",
                animation: "modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
                  borderBottom: "1px solid #fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ef4444",
                    }}
                  >
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#991b1b" }}>
                      Delete User Account
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#b91c1c" }}>
                      Permanent Directory Removal
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !deletingId && setUserToDelete(null)}
                  disabled={Boolean(deletingId)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: deletingId ? "not-allowed" : "pointer",
                    padding: "6px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "1.4rem 1.5rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.88rem", color: "#334155", lineHeight: 1.5 }}>
                  Are you sure you want to permanently delete this user account from the official directory?
                </p>

                {/* Target User Info Card */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.45rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      Target Account
                    </span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "9999px",
                        background: "#ede9fe",
                        color: "#4326b8",
                        textTransform: "capitalize",
                      }}
                    >
                      {userToDelete.role || "user"}
                    </span>
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                    {userToDelete.name}
                  </div>
                  {userToDelete.email && (
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      {userToDelete.email}
                    </div>
                  )}
                  {userToDelete.student_id && (
                    <div style={{ fontSize: "0.76rem", color: "#475569", fontWeight: 600 }}>
                      ID Number: <strong>{userToDelete.student_id}</strong>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    background: "#fff1f2",
                    border: "1px solid #ffe4e6",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "0.78rem",
                    color: "#9f1239",
                    lineHeight: 1.45,
                  }}
                >
                  <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong>Warning:</strong> This cannot be undone. All active sessions, student examination answers, and directory records associated with this account will be removed.
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setUserToDelete(null)}
                  disabled={Boolean(deletingId)}
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.55rem 1.1rem",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={Boolean(deletingId)}
                  style={{
                    background: deletingId ? "#f87171" : "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.55rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: deletingId ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {deletingId ? (
                    <>
                      <RefreshCw size={14} className="spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Delete Account
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 2: CREATED ACCOUNT PROVISIONED CREDENTIALS MODAL    */}
        {/* ========================================================= */}
        {createdAccountModal && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              padding: "1rem",
              animation: "modalFadeIn 0.18s ease-out",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setCreatedAccountModal(null);
                setShowCreatedPassword(false);
              }
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                maxWidth: "520px",
                width: "100%",
                boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(67, 38, 184, 0.15)",
                overflow: "hidden",
                animation: "modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Header Banner */}
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)",
                  borderBottom: "1px solid #ddd6fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "#ffffff",
                      border: "1.5px solid #c4b5fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4326b8",
                      boxShadow: "0 4px 10px rgba(67, 38, 184, 0.15)",
                    }}
                  >
                    <UserCheck size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800, color: "#1e0f59" }}>
                      Account Provisioned
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#4326b8", fontWeight: 600 }}>
                      Institutional credentials active & ready
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedAccountModal(null);
                    setShowCreatedPassword(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#6b7280",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "1.4rem 1.5rem" }}>
                {/* Account Details Header Box */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.85rem 1rem",
                    borderRadius: "12px",
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                      {createdAccountModal.name}
                    </div>
                    {(createdAccountModal.programme || createdAccountModal.department) && (
                      <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>
                        {createdAccountModal.programme} {createdAccountModal.department && createdAccountModal.department !== "N/A" ? `• ${createdAccountModal.department}` : ""}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "4px 10px",
                      borderRadius: "9999px",
                      background: "#ede9fe",
                      color: "#4326b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {createdAccountModal.role}
                  </span>
                </div>

                {/* Credentials Copy List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {/* Email Field */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "0.6rem 0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Institutional Email
                      </div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", wordBreak: "break-all" }}>
                        {createdAccountModal.email}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdAccountModal.email, "email")}
                      style={{
                        background: copiedField === "email" ? "#ecfdf5" : "#f1f5f9",
                        border: `1px solid ${copiedField === "email" ? "#a7f3d0" : "#cbd5e1"}`,
                        color: copiedField === "email" ? "#059669" : "#475569",
                        borderRadius: "8px",
                        padding: "0.35rem 0.65rem",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0,
                      }}
                    >
                      {copiedField === "email" ? (
                        <>
                          <Check size={13} /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy
                        </>
                      )}
                    </button>
                  </div>

                  {/* Password Field */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                      padding: "0.6rem 0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Initial Password
                      </div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 700, fontFamily: "monospace", color: "#0f172a" }}>
                        {showCreatedPassword ? createdAccountModal.password : "••••••••••••"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => setShowCreatedPassword(!showCreatedPassword)}
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #cbd5e1",
                          color: "#64748b",
                          borderRadius: "8px",
                          padding: "0.35rem 0.5rem",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                        }}
                        title={showCreatedPassword ? "Hide password" : "Show password"}
                      >
                        {showCreatedPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdAccountModal.password, "password")}
                        style={{
                          background: copiedField === "password" ? "#ecfdf5" : "#f1f5f9",
                          border: `1px solid ${copiedField === "password" ? "#a7f3d0" : "#cbd5e1"}`,
                          color: copiedField === "password" ? "#059669" : "#475569",
                          borderRadius: "8px",
                          padding: "0.35rem 0.65rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        {copiedField === "password" ? (
                          <>
                            <Check size={13} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Student/Employee ID Field */}
                  {createdAccountModal.student_id && (
                    <div
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px",
                        padding: "0.6rem 0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "8px",
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                          {createdAccountModal.role === "student" ? "Institutional Student ID" : "Employee ID"}
                        </div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                          {createdAccountModal.student_id}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(createdAccountModal.student_id!, "id")}
                        style={{
                          background: copiedField === "id" ? "#ecfdf5" : "#f1f5f9",
                          border: `1px solid ${copiedField === "id" ? "#a7f3d0" : "#cbd5e1"}`,
                          color: copiedField === "id" ? "#059669" : "#475569",
                          borderRadius: "8px",
                          padding: "0.35rem 0.65rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        {copiedField === "id" ? (
                          <>
                            <Check size={13} /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={13} /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const lines = [
                      "========================================",
                      "   SRCB INSTITUTIONAL ACCOUNT CREDENTIALS",
                      "========================================",
                      `Account Name: ${createdAccountModal.name}`,
                      `Assigned Role: ${createdAccountModal.role.toUpperCase()}`,
                      `Institutional Email: ${createdAccountModal.email}`,
                      `Temporary Password: ${createdAccountModal.password}`,
                    ];
                    if (createdAccountModal.student_id) {
                      lines.push(`Institutional ID: ${createdAccountModal.student_id}`);
                    }
                    if (createdAccountModal.programme) {
                      lines.push(`Academic Program: ${createdAccountModal.programme}`);
                    }
                    lines.push("----------------------------------------");
                    lines.push("Please sign in to the SRCB EduAssess Portal and update your password.");
                    lines.push("========================================");
                    copyToClipboard(lines.join("\n"), "all_creds");
                  }}
                  style={{
                    fontSize: "0.82rem",
                    padding: "0.5rem 0.9rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {copiedField === "all_creds" ? (
                    <>
                      <Check size={14} style={{ color: "#059669" }} /> Full Card Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copy All Credentials
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedAccountModal(null);
                    setShowCreatedPassword(false);
                  }}
                  style={{
                    background: "var(--primary, #28166f)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.55rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(40, 22, 111, 0.25)",
                  }}
                >
                  <Check size={15} /> Done & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 3: BATCH ENROLLMENT CONFIRMATION MODAL               */}
        {/* ========================================================= */}
        {isBatchEnrollModalOpen && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              padding: "1rem",
              animation: "modalFadeIn 0.18s ease-out",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget && !isEnrolling) {
                setIsBatchEnrollModalOpen(false);
              }
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                maxWidth: "480px",
                width: "100%",
                boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.4), 0 0 0 1px rgba(67, 38, 184, 0.15)",
                overflow: "hidden",
                animation: "modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  background: "linear-gradient(135deg, #ede9fe 0%, #e0e7ff 100%)",
                  borderBottom: "1px solid #ddd6fe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "#ffffff",
                      border: "1px solid #c4b5fd",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4326b8",
                    }}
                  >
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#1e0f59" }}>
                      Confirm Batch Enrollment
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#4326b8" }}>
                      Institutional Directory Provisioning
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => !isEnrolling && setIsBatchEnrollModalOpen(false)}
                  disabled={isEnrolling}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: isEnrolling ? "not-allowed" : "pointer",
                    padding: "6px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "1.4rem 1.5rem" }}>
                <p style={{ margin: "0 0 1rem 0", fontSize: "0.88rem", color: "#334155", lineHeight: 1.5 }}>
                  Are you ready to enroll student accounts into the official institutional directory?
                </p>

                {/* Batch Summary Card */}
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.6rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Validated Ready Students:</span>
                    <strong style={{ fontSize: "1rem", color: "#059669" }}>
                      {parsedStudents.filter((s) => s.status === "ready").length} Students
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Default Program:</span>
                    <strong style={{ fontSize: "0.82rem", color: "#0f172a" }}>{bulkDefaultProgram}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Password Assignment:</span>
                    <strong style={{ fontSize: "0.82rem", color: "#0f172a" }}>
                      {bulkPasswordPolicy === "student_id"
                        ? "Institutional Student ID"
                        : bulkPasswordPolicy === "random"
                          ? "Random Secure String"
                          : "Custom Default"}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "10px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    fontSize: "0.78rem",
                    color: "#166534",
                    lineHeight: 1.45,
                  }}
                >
                  <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    Each student will be provisioned with institutional portal access and can be exported after enrollment.
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsBatchEnrollModalOpen(false)}
                  disabled={isEnrolling}
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.55rem 1.1rem",
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBatchEnrollment}
                  disabled={isEnrolling}
                  style={{
                    background: "var(--primary, #28166f)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.55rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(40, 22, 111, 0.25)",
                  }}
                >
                  <Check size={15} /> Confirm & Enroll All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL 4: CLEAR STAGED BATCH CONFIRMATION MODAL            */}
        {/* ========================================================= */}
        {isClearBatchModalOpen && (
          <div
            className="modal-overlay"
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(15, 23, 42, 0.72)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
              padding: "1rem",
              animation: "modalFadeIn 0.18s ease-out",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsClearBatchModalOpen(false);
              }
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: "18px",
                maxWidth: "440px",
                width: "100%",
                boxShadow: "0 25px 60px -15px rgba(15, 23, 42, 0.4)",
                overflow: "hidden",
                animation: "modalScaleIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "1.25rem 1.5rem",
                  background: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%)",
                  borderBottom: "1px solid #fee2e2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "42px",
                      height: "42px",
                      borderRadius: "12px",
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ef4444",
                    }}
                  >
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#991b1b" }}>
                      Clear Staged Batch?
                    </h3>
                    <p style={{ margin: 0, fontSize: "0.76rem", color: "#b91c1c" }}>
                      Discard uncommitted file rows
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsClearBatchModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    cursor: "pointer",
                    padding: "6px",
                    borderRadius: "8px",
                    display: "flex",
                    alignItems: "center",
                  }}
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: "1.4rem 1.5rem" }}>
                <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.5 }}>
                  Are you sure you want to discard the uploaded file? All{" "}
                  <strong>{parsedStudents.length} staged student records</strong> will be cleared from memory.
                </p>
              </div>

              {/* Footer */}
              <div
                style={{
                  padding: "1rem 1.5rem",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsClearBatchModalOpen(false)}
                  style={{
                    fontSize: "0.85rem",
                    padding: "0.55rem 1.1rem",
                    fontWeight: 600,
                  }}
                >
                  Keep Records
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearBatch}
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    padding: "0.55rem 1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  <Trash2 size={14} /> Discard Batch
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
