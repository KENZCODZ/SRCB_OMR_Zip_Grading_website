import React, { useState, useMemo } from "react";
import {
  X,
  Search,
  GraduationCap,
  ShieldCheck,
  Award,
  Sparkles,
  BarChart3,
  CheckCircle2,
  Camera,
  FileSpreadsheet,
  Users,
  Lightbulb,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from "lucide-react";
import type { UserRole } from "../types";

export interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
  onNavigateTab?: (tab: string) => void;
}

export interface UserGuideCardProps {
  initialRole?: UserRole;
  onNavigateTab?: (tab: string) => void;
  onClose?: () => void;
  isModal?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

interface StepItem {
  title: string;
  description: string;
  tip?: string;
  note?: string;
}

interface SectionItem {
  id: string;
  title: string;
  icon: React.ElementType;
  summary: string;
  steps: StepItem[];
}

interface RoleManual {
  role: UserRole;
  portalName: string;
  portalBadge: string;
  badgeBg: string;
  badgeColor: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  quickActions: { label: string; tab: string; icon: React.ElementType }[];
  overview: {
    mission: string;
    keyPoints: string[];
  };
  sections: SectionItem[];
}

const ROLE_MANUALS: Record<UserRole, RoleManual> = {
  student: {
    role: "student",
    portalName: "Student Portal",
    portalBadge: "Examinee Workspace",
    badgeBg: "#ecfdf5",
    badgeColor: "#059669",
    title: "Student Portal User Guide",
    subtitle:
      "Official student manual for checking exam scores, understanding CHED transmuted grades, and inspecting scanned answer sheets.",
    icon: Award,
    quickActions: [
      { label: "View My Exam Results", tab: "reports", icon: Award },
    ],
    overview: {
      mission:
        "Access your personal examination scores transparently, understand your Philippine CHED transmuted grades, and review digital overlays of your scanned test papers.",
      keyPoints: [
        "View raw scores, percentages, and official CHED transmuted grades (1.00–5.00)",
        "Inspect high-resolution visual overlays of your scanned ZipGrade sheet",
        "Understand passing remarks (75% = 3.00 Passing threshold)",
      ],
    },
    sections: [
      {
        id: "student-accessing-results",
        title: "1. Accessing Your Exam Results & Performance",
        icon: Award,
        summary: "Sign in and view your personalized scores and subject records.",
        steps: [
          {
            title: "Sign in with Institutional Student Email",
            description:
              "Log in using your @srcb.edu.ph email address. Your personal portal opens directly to your latest exam scores, subject codes, and instructor names.",
          },
          {
            title: "Review Summary Metrics",
            description:
              "Your dashboard summarizes your average exam percentage, total assessments completed, and official passing status (Passed or Failed).",
            tip: "Check the 'Remarks' column in your exam table for immediate status clarification.",
          },
        ],
      },
      {
        id: "student-transmutation-scale",
        title: "2. Understanding Philippine CHED Transmuted Grades",
        icon: FileSpreadsheet,
        summary: "How raw scores convert to the official 1.00–5.00 grading scale.",
        steps: [
          {
            title: "The Standard CHED Formula",
            description:
              "SRCB strictly enforces the Commission on Higher Education (CHED) transmutation scale where a raw score of 75% equals 3.00 (Passing Mark). Formula: Transmuted % = 75 + (Raw Score / Total Questions) × 25.",
          },
          {
            title: "Grade Conversion Table Reference",
            description:
              "• 99–100% = 1.00 (Excellent)\n• 96–98% = 1.25 (Superior)\n• 93–95% = 1.50 (Very Good)\n• 90–92% = 1.75 (Good)\n• 87–89% = 2.00 (Very Satisfactory)\n• 84–86% = 2.25 (Satisfactory)\n• 81–83% = 2.50 (Fair)\n• 78–80% = 2.75 (Passed)\n• 75–77% = 3.00 (Passing Threshold)\n• Below 75% = 5.00 (Failed)",
            tip: "Scores below 75% automatically receive 5.00 (Failed) under CHED policies.",
          },
        ],
      },
      {
        id: "student-sheet-inspection",
        title: "3. Inspecting Your Scanned Answer Sheet",
        icon: FileText,
        summary: "View the digital scan of your physical test paper with grading annotations.",
        steps: [
          {
            title: "Open Visual Inspection",
            description:
              "Click 'Inspect Sheet' on any graded exam entry to view the high-resolution scanned photo of your physical ZipGrade sheet.",
          },
          {
            title: "Understand Annotation Overlays",
            description:
              "Correct answers are highlighted in Green circles. Mistakes or missed questions are highlighted in Red circles with the teacher's correct key indicated.",
          },
          {
            title: "Ambiguous or Double Fill Warnings",
            description:
              "If you shade two bubbles for a single question or erase incompletely, the system flags the question as 'Ambiguous' and counts it incorrect to maintain exam integrity.",
            tip: "Always erase cleanly if you change your answer during the exam.",
          },
        ],
      },
      {
        id: "student-shading-standards",
        title: "4. ZipGrade 50-Item Bubble Shading Rules",
        icon: Camera,
        summary: "Ensure your answer sheet is read accurately by the optical scanner.",
        steps: [
          {
            title: "Use Dark Lead or Black/Blue Ink",
            description:
              "Fill bubbles completely using a dark #2 pencil or black/blue pen. Light checks, x-marks, or faint dots will not trigger the optical density threshold.",
          },
          {
            title: "Shade Your 5-Digit Student ID Correctly",
            description:
              "Ensure each digit of your student ID is shaded carefully in the Student ID grid. The system maps your scanned sheet to your portal using this number.",
            tip: "If your ID is shaded incorrectly, notify your instructor immediately to re-map your score.",
          },
        ],
      },
    ],
  },

  dean: {
    role: "dean",
    portalName: "Dean & Executive Portal",
    portalBadge: "Executive Administration",
    badgeBg: "#fef2f2",
    badgeColor: "#dc2626",
    title: "Dean of Higher Education User Guide",
    subtitle:
      "Operational manual for institutional academic oversight, cross-department audits, and official CHED compliance reporting.",
    icon: Award,
    quickActions: [
      { label: "Institutional Analytics", tab: "reports", icon: BarChart3 },
      { label: "Export CHED Grade Sheets", tab: "reports", icon: FileSpreadsheet },
    ],
    overview: {
      mission:
        "Provide high-level academic oversight across all collegiate departments, audit faculty examination consistency, and generate accreditation grade sheets.",
      keyPoints: [
        "Collegiate KPI monitoring across all Higher Education programmes",
        "Auditing faculty exam records, completion rates, and grade consistency",
        "Exporting official CHED Master Grade Sheets (.xlsx) with 1.00–5.00 conversion",
      ],
    },
    sections: [
      {
        id: "dean-institutional-monitoring",
        title: "1. Navigating Institutional Academic Management",
        icon: BarChart3,
        summary: "Collegiate KPIs, enrollment volume, and departmental pass-rate metrics.",
        steps: [
          {
            title: "Collegiate Metric Tiles",
            description:
              "Your dashboard aggregates total student examinees, active faculty instructors, examinations administered, and overall collegiate passing percentage.",
            tip: "Quickly identify departments operating below institutional benchmarks (<75%).",
          },
          {
            title: "Cross-Department Comparison",
            description:
              "Filter assessment metrics across Computing Studies, Education, Business Administration, and Criminology to identify academic trends and curriculum needs.",
          },
        ],
      },
      {
        id: "dean-faculty-auditing",
        title: "2. Faculty Examination & Pass-Rate Auditing",
        icon: Users,
        summary: "Monitor instructor test submissions and grading standard compliance.",
        steps: [
          {
            title: "Track Faculty Submissions",
            description:
              "View all examinations handled by instructors, test dates, question quantities, and total processed student submissions per class section.",
          },
          {
            title: "Examine Pass/Fail Distributions",
            description:
              "Audit score distributions across course offerings to detect abnormal variances or inconsistencies in evaluation difficulty.",
          },
        ],
      },
      {
        id: "dean-ched-reports",
        title: "3. Generating Official CHED Compliance Reports",
        icon: FileSpreadsheet,
        summary: "Export standardized grade sheets formatted for accreditation bodies.",
        steps: [
          {
            title: "Export Master Database Formats",
            description:
              "Navigate to Reports & Analytics and click 'Export CHED Grade Sheet (.xlsx)' to download collegiate assessment spreadsheets with Philippine 1.00–5.00 scales.",
            tip: "All calculations strictly apply the Philippine CHED 75% = 3.00 passing benchmark.",
          },
          {
            title: "Multi-Term Accreditation Audits",
            description:
              "Utilize exported master databases for PACUCOA, CHED, and institutional quality assurance reviews.",
          },
        ],
      },
      {
        id: "dean-access-control",
        title: "4. User Directory & Institutional Security",
        icon: ShieldCheck,
        summary: "Maintain oversight of faculty access and institutional user records.",
        steps: [
          {
            title: "Account Directory Audit",
            description:
              "Review registered faculty, chairs, and examinees across all Higher Education departments to verify proper credentials and department assignments.",
          },
        ],
      },
    ],
  },

  "programme-head": {
    role: "programme-head",
    portalName: "Programme Head Portal",
    portalBadge: "Department Chair",
    badgeBg: "#fffbeb",
    badgeColor: "#d97706",
    title: "Programme Head User Guide",
    subtitle:
      "Department-scoped exam tracking, curriculum review, section comparisons, and Outcome-Based Education (OBE) item analysis.",
    icon: GraduationCap,
    quickActions: [
      { label: "Programme Analytics", tab: "reports", icon: Users },
      { label: "OBE Item Analysis", tab: "exams", icon: Sliders },
    ],
    overview: {
      mission:
        "Supervise examination quality and curriculum alignment strictly within your assigned academic programme (e.g., BS Information Technology).",
      keyPoints: [
        "Programme-scoped pass-rate and exam completion monitoring",
        "Section-by-section comparison to identify instructor or learning variances",
        "Statistical Outcome-Based Education (OBE) Item Analysis review",
      ],
    },
    sections: [
      {
        id: "ph-programme-monitoring",
        title: "1. Programme Examination Oversight",
        icon: Users,
        summary: "Scoped departmental dashboards and section comparative analytics.",
        steps: [
          {
            title: "Scoped Department View",
            description:
              "Your dashboard defaults strictly to your assigned programme (e.g., BS Information Technology), isolating relevant faculty, students, and course examinations.",
          },
          {
            title: "Section Performance Comparison",
            description:
              "Compare mean scores and pass percentages between class sections (e.g., BSIT 3A vs. BSIT 3B) to detect learning gaps across different class offerings.",
            tip: "Sections falling below the 75% institutional threshold are flagged for curriculum review.",
          },
        ],
      },
      {
        id: "ph-obe-item-analysis",
        title: "2. Outcome-Based Education (OBE) Item Analysis",
        icon: Sliders,
        summary: "Statistical item evaluation using standard educational measurement metrics.",
        steps: [
          {
            title: "Difficulty Index (P)",
            description:
              "Measures question difficulty (0.0 to 1.0). Questions with P < 0.30 are categorized as 'Difficult', while P > 0.80 are 'Easy'. Optimal exam questions target P between 0.40 and 0.70.",
          },
          {
            title: "Discrimination Index (D)",
            description:
              "Compares the top 27% high performers against the bottom 27% low performers (-1.0 to +1.0). Questions with D < 0.20 are flagged as 'Poor' and should be revised in test banks.",
            tip: "Export the full OBE Item Analysis table to Excel for departmental syllabus review meetings.",
          },
        ],
      },
      {
        id: "ph-curriculum-reports",
        title: "3. Departmental Assessment Reporting",
        icon: FileSpreadsheet,
        summary: "Export programme examination reports and student achievement summaries.",
        steps: [
          {
            title: "Export Programme Grade Sheets",
            description:
              "Download official transmuted grade sheets (.xlsx) formatted with Philippine 1.00–5.00 scales for departmental record keeping.",
          },
        ],
      },
    ],
  },

  teacher: {
    role: "teacher",
    portalName: "Faculty Portal",
    portalBadge: "Course Instructor",
    badgeBg: "#eff6ff",
    badgeColor: "#0062ff",
    title: "Faculty Instructor User Guide",
    subtitle:
      "Step-by-step instructions for creating examinations, scanning student ZipGrade sheets, importing rosters, and releasing grades.",
    icon: BookOpen,
    quickActions: [
      { label: "Create New Exam", tab: "exams", icon: BookOpen },
      { label: "Open Quick Scanner", tab: "quick-scan", icon: Sparkles },
      { label: "View Submissions", tab: "submissions", icon: Award },
    ],
    overview: {
      mission:
        "Manage your complete examination lifecycle: configure master answer keys, grade paper sheets instantly with OMR, map rosters, and export CHED grade sheets.",
      keyPoints: [
        "Create 50-item examinations with manual or scanned answer keys",
        "Live camera scanning with real-time bubble locking and visual feedback",
        "Import class rosters (CSV) and export official CHED grade sheets (.xlsx)",
      ],
    },
    sections: [
      {
        id: "teacher-create-exam",
        title: "1. Creating Examinations & Master Answer Keys",
        icon: BookOpen,
        summary: "Define test parameters and configure correct options (A–E).",
        steps: [
          {
            title: "Create Examination Entry",
            description:
              "Navigate to 'Exams & Grading' and click '+ Create New Exam'. Enter the course code (e.g., ITP 305), subject title, section, and semester.",
          },
          {
            title: "Input Master Answer Key (Choices A–E)",
            description:
              "Enter correct answers manually or click 'Scan Key Image' to upload a pre-filled master ZipGrade sheet. The system extracts the shaded bubbles automatically!",
            tip: "Master answer keys can be updated at any time prior to final grade publishing.",
          },
        ],
      },
      {
        id: "teacher-omr-grading",
        title: "2. Optical Mark Recognition (OMR) Grading",
        icon: Camera,
        summary: "Grade student sheets with live camera scanning or image uploads.",
        steps: [
          {
            title: "Live Camera Scanner",
            description:
              "Select your exam and click 'Scan with Camera'. Position the student sheet inside the viewfinder until the 4 corner alignment boxes lock. The engine detects bubbles in real time and calculates scores instantly.",
            tip: "Hold the sheet steadily inside the border guides for instant automatic capture.",
          },
          {
            title: "Batch File Upload",
            description:
              "Alternatively, upload multiple JPG/PNG photos or a ZIP archive for automated bulk background grading.",
          },
        ],
      },
      {
        id: "teacher-roster-mapping",
        title: "3. Class Roster Mapping (CSV Import)",
        icon: Users,
        summary: "Attach student names to scanned 5-digit student IDs.",
        steps: [
          {
            title: "Import Class Roster",
            description:
              "Click 'Import Class Roster' and upload your class list (.csv) containing Student IDs and Names.",
          },
          {
            title: "Automatic Name Association",
            description:
              "The system matches the 5-digit Student ID shaded on the paper sheet directly with the student's full name across all score tables and exports.",
          },
        ],
      },
      {
        id: "teacher-grade-export",
        title: "4. Exporting Official CHED Grade Sheets",
        icon: FileSpreadsheet,
        summary: "Download formatted Excel sheets with 1.00–5.00 scales.",
        steps: [
          {
            title: "Export Departmental Excel Report",
            description:
              "Click 'Export CHED Grade Sheet (.xlsx)' to generate an official spreadsheet complete with raw scores, transmuted grades (1.00–5.00), and passing remarks ready for submission.",
          },
        ],
      },
    ],
  },

  admin: {
    role: "admin",
    portalName: "Administrator Portal",
    portalBadge: "System Administration",
    badgeBg: "#f3e8ff",
    badgeColor: "#7e22ce",
    title: "System Administrator User Guide",
    subtitle:
      "Administrative procedures for scanning stations, user account provisioning, system security, and database maintenance.",
    icon: ShieldCheck,
    quickActions: [
      { label: "Open Quick Scanner", tab: "quick-scan", icon: Sparkles },
      { label: "Manage User Accounts", tab: "users", icon: Users },
      { label: "Exams & Records", tab: "exams", icon: BookOpen },
    ],
    overview: {
      mission:
        "Oversee portal operations, manage institutional access for all departments, and operate high-speed physical scanning stations.",
      keyPoints: [
        "High-speed optical mark recognition for batch exam grading stations",
        "Account provisioning for Deans, Chairs, Faculty, and Students",
        "Audit logs, access permissions, and database records integrity",
      ],
    },
    sections: [
      {
        id: "admin-quick-scanner-station",
        title: "1. Operating the OMR Quick Scanner Station",
        icon: Sparkles,
        summary: "Rapid optical bubble detection and scoring station workflow.",
        steps: [
          {
            title: "Camera Station Setup",
            description:
              "Mount the webcam or mobile camera directly above a flat, clean surface with uniform overhead lighting.",
          },
          {
            title: "Four-Corner Fiducial Locking",
            description:
              "Align the physical ZipGrade sheet inside the guide frame until all 4 corner boxes lock into place for 99.9% optical precision.",
            tip: "Keep ambient lighting even and avoid sharp shadows across the bubble area.",
          },
          {
            title: "Instant Scoring & Overlay Verification",
            description:
              "The optical mark recognition engine instantly registers bubble fills, tabulates student IDs, and displays the visual grade overlay.",
          },
        ],
      },
      {
        id: "admin-user-provisioning",
        title: "2. Institutional User Provisioning & Roles",
        icon: Users,
        summary: "Provision and audit institutional accounts across departments.",
        steps: [
          {
            title: "Create Institutional Accounts",
            description:
              "Navigate to 'User Management' tab to register single accounts or approve pending self-registrations with assigned departments and programmes.",
          },
          {
            title: "Manage Statuses & Access Control",
            description:
              "Quickly search accounts by name or email, toggle active/suspended statuses, or purge outdated access records.",
            tip: "Use the role filter pills to isolate faculty from student records quickly.",
          },
        ],
      },
      {
        id: "admin-system-maintenance",
        title: "3. Cache & Performance Optimization",
        icon: ShieldCheck,
        summary: "Maintain instantaneous navigation and offline resilience.",
        steps: [
          {
            title: "Universal High-Performance Cache",
            description:
              "The portal automatically caches records in memory and session storage so everyday navigation is instantaneous (0ms wait).",
          },
          {
            title: "Offline Fallback Operation",
            description:
              "If the backend Python server is offline or restarting, SRCB EduAssess seamlessly falls back to cached offline mock data so users can continue viewing views.",
          },
        ],
      },
    ],
  },
};

/**
 * UserGuideCard
 * Renders the dedicated, distinct user guide for the user's specific role.
 */
export const UserGuideCard: React.FC<UserGuideCardProps> = ({
  initialRole = "teacher",
  onNavigateTab,
  onClose,
  isModal = false,
  style = {},
  className = "",
}) => {
  // Normalize role to ensure valid lookup
  const safeRole: UserRole = ROLE_MANUALS[initialRole] ? initialRole : "teacher";
  const [selectedRole, setSelectedRole] = useState<UserRole>(safeRole);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    all: true,
  });

  // Keep selected role in sync if initialRole changes
  React.useEffect(() => {
    if (ROLE_MANUALS[initialRole]) {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  const currentManual = ROLE_MANUALS[selectedRole] || ROLE_MANUALS.teacher;

  // Filter sections by search query within this role's manual
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentManual.sections;
    const q = searchQuery.toLowerCase();
    return currentManual.sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q) ||
        sec.steps.some(
          (st) =>
            st.title.toLowerCase().includes(q) ||
            st.description.toLowerCase().includes(q) ||
            (st.tip && st.tip.toLowerCase().includes(q)),
        ),
    );
  }, [currentManual, searchQuery]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  };

  const isSectionOpen = (id: string) => {
    if (searchQuery.trim().length > 0) return true;
    return expandedSections[id] !== false;
  };

  const IconComp = currentManual.icon;
  const isAdmin = initialRole === "admin";

  return (
    <div
      className={`user-guide-card ${className}`}
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        boxShadow: "0 10px 30px -10px rgba(0, 30, 80, 0.08)",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* ── CARD HEADER (DISTINCT PER ROLE) ── */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: "#ffffff",
          borderBottom: "1px solid #f1f5f9",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Top Title & Close Action */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: "#ffffff",
                border: "2px solid #0062ff",
                padding: "2px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0, 98, 255, 0.15)",
                flexShrink: 0,
              }}
            >
              <img
                src="/srcb-logo.png"
                alt="SRCB Logo"
                style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <h2
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "#0f172a",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {currentManual.title}
                </h2>
                <span
                  style={{
                    background: currentManual.badgeBg,
                    color: currentManual.badgeColor,
                    border: `1px solid ${currentManual.badgeColor}33`,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.6rem",
                    borderRadius: "20px",
                  }}
                >
                  {currentManual.portalBadge}
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "#64748b",
                  margin: "0.15rem 0 0 0",
                }}
              >
                {currentManual.subtitle}
              </p>
            </div>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.15s ease",
              }}
              title="Close User Guide"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Bar & Optional Admin Role Switcher */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <div style={{ position: "relative" }}>
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              style={{
                width: "100%",
                padding: "0.55rem 1rem 0.55rem 2.35rem",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "10px",
                fontSize: "0.86rem",
                color: "#0f172a",
                outline: "none",
                transition: "all 0.15s ease",
              }}
              placeholder={`Search within ${currentManual.portalName} manual...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Admin-only Switcher to inspect other role guides if needed */}
          {isAdmin && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                overflowX: "auto",
                paddingTop: "0.1rem",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                Admin View Switch:
              </span>
              {(["admin", "dean", "programme-head", "teacher", "student"] as UserRole[]).map((r) => {
                const isActive = selectedRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    style={{
                      padding: "0.3rem 0.65rem",
                      fontSize: "0.75rem",
                      borderRadius: "16px",
                      border: isActive ? "1px solid #0062ff" : "1px solid #e2e8f0",
                      background: isActive ? "#0062ff" : "#ffffff",
                      color: isActive ? "#ffffff" : "#475569",
                      fontWeight: isActive ? 700 : 500,
                      cursor: "pointer",
                      textTransform: "capitalize",
                    }}
                  >
                    {r.replace("-", " ")}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── CARD BODY (AIRY, MINIMALIST & SPECIFIC TO THIS ROLE) ── */}
      <div
        style={{
          padding: "1.5rem",
          overflowY: isModal ? "auto" : "visible",
          maxHeight: isModal ? "calc(86vh - 220px)" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          background: "#ffffff",
        }}
      >
        {/* Role Overview Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #f0f7ff 100%)",
            border: "1px solid #e2e8f0",
            borderLeft: "4px solid #0062ff",
            borderRadius: "12px",
            padding: "1.1rem 1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "0.45rem",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#0062ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconComp size={16} />
            </div>
            <h3 style={{ fontSize: "1.05rem", margin: 0, fontWeight: 800, color: "#0f172a" }}>
              {currentManual.portalName} Overview
            </h3>
          </div>

          <p style={{ color: "#475569", fontSize: "0.85rem", margin: "0 0 0.85rem 0", lineHeight: "1.5" }}>
            {currentManual.overview.mission}
          </p>

          {/* Key Points */}
          <div
            style={{
              background: "#ffffff",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0f172a", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Key Guidelines for Your Role:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.4rem" }}>
              {currentManual.overview.keyPoints.map((pt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.45rem",
                    fontSize: "0.82rem",
                    color: "#334155",
                  }}
                >
                  <CheckCircle2 size={14} style={{ color: "#10b981", flexShrink: 0, marginTop: "2px" }} />
                  <span>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        {onNavigateTab && currentManual.quickActions.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
              padding: "0.65rem 1rem",
              borderRadius: "10px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
              Quick Navigation:
            </span>
            {currentManual.quickActions.map((action, aIdx) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={aIdx}
                  type="button"
                  onClick={() => {
                    if (onClose) onClose();
                    onNavigateTab(action.tab);
                  }}
                  style={{
                    padding: "0.35rem 0.75rem",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#0f172a",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  <ActionIcon size={13} color="#0062ff" /> {action.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Minimalist Step-by-Step Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, margin: 0, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.02em" }}>
              Operational Procedures ({filteredSections.length})
            </h4>
          </div>

          {filteredSections.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2.5rem 1.5rem",
                color: "#64748b",
                background: "#f8fafc",
                borderRadius: "10px",
                border: "1px dashed #cbd5e1",
                fontSize: "0.85rem",
              }}
            >
              No guide topics matched "{searchQuery}". Try searching for other terms or clear your search query.
            </div>
          ) : (
            filteredSections.map((section) => {
              const SecIcon = section.icon;
              const open = isSectionOpen(section.id);

              return (
                <div
                  key={section.id}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    overflow: "hidden",
                    transition: "border-color 0.15s ease",
                  }}
                >
                  {/* Section Title Bar */}
                  <div
                    onClick={() => toggleSection(section.id)}
                    style={{
                      padding: "0.85rem 1.15rem",
                      background: open ? "#f8fafc" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      userSelect: "none",
                      borderBottom: open ? "1px solid #e2e8f0" : "none",
                      transition: "background 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "6px",
                          background: "#eff6ff",
                          color: "#0062ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <SecIcon size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                          {section.title}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "1px" }}>
                          {section.summary}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {open ? (
                        <ChevronUp size={16} style={{ color: "#94a3b8" }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: "#94a3b8" }} />
                      )}
                    </div>
                  </div>

                  {/* Section Steps */}
                  {open && (
                    <div
                      style={{
                        padding: "1rem 1.15rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        background: "#ffffff",
                      }}
                    >
                      {section.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            padding: "0.85rem 1rem",
                            borderRadius: "10px",
                            background: "#f8fafc",
                            border: "1px solid #f1f5f9",
                            borderLeft: "3px solid #0062ff",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.86rem",
                              color: "#0f172a",
                              marginBottom: "0.3rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                            }}
                          >
                            <span
                              style={{
                                background: "#0062ff",
                                color: "#ffffff",
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {sIdx + 1}
                            </span>
                            {step.title}
                          </div>

                          <p
                            style={{
                              fontSize: "0.82rem",
                              color: "#475569",
                              margin: 0,
                              lineHeight: "1.55",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {step.description}
                          </p>

                          {step.tip && (
                            <div
                              style={{
                                marginTop: "0.45rem",
                                padding: "0.4rem 0.65rem",
                                borderRadius: "6px",
                                background: "#eff6ff",
                                border: "1px solid #bfdbfe",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "0.4rem",
                                fontSize: "0.78rem",
                                color: "#0052d9",
                              }}
                            >
                              <Lightbulb size={13} style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span>
                                <strong>Tip:</strong> {step.tip}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── CARD FOOTER ── */}
      <div
        style={{
          padding: "0.85rem 1.5rem",
          background: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            fontSize: "0.78rem",
            color: "#64748b",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>St. Rita's College of Balingasag • Academic Assessment Portal</span>
        </div>

        {isModal && onClose && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onClose}
            style={{
              fontSize: "0.82rem",
              padding: "0.4rem 0.95rem",
              borderRadius: "8px",
              background: "#0062ff",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * UserGuideModal
 * Overlay modal wrapper around the dedicated UserGuideCard.
 */
export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialRole = "teacher",
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "1.5rem",
      }}
    >
      <div
        className="modal-content"
        style={{
          maxWidth: "880px",
          width: "100%",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
          boxShadow: "0 25px 60px -15px rgba(0, 20, 60, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <UserGuideCard
          initialRole={initialRole}
          onNavigateTab={onNavigateTab}
          onClose={onClose}
          isModal={true}
          style={{ border: "none", borderRadius: 0, boxShadow: "none", maxHeight: "88vh" }}
        />
      </div>
    </div>
  );
};

export default UserGuideModal;
