import React, { useState, useMemo } from "react";
import {
  BookOpen,
  X,
  Search,
  GraduationCap,
  ShieldCheck,
  Award,
  Sparkles,
  BarChart3,
  CheckCircle2,
  HelpCircle,
  Camera,
  FileSpreadsheet,
  Users,
  Lightbulb,
  FileText,
  Sliders,
  ChevronDown,
  ChevronUp,
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

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  badge?: string;
  summary: string;
  steps: {
    title: string;
    description: string;
    tip?: string;
  }[];
}

interface RoleGuide {
  role: UserRole | "omr-guide" | "faq";
  roleTitle: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  keyResponsibilities: string[];
  targetAudience: string;
  sections: GuideSection[];
}

const ROLE_GUIDES: RoleGuide[] = [
  {
    role: "admin",
    roleTitle: "Admin (Quick Scanner)",
    badgeColor: "var(--info-bg)",
    icon: Sparkles,
    description:
      "High-speed optical mark recognition and live camera scanning station for instantaneous student answer sheet grading.",
    targetAudience: "System Administrators, Scanning Station Operators, Proctors",
    keyResponsibilities: [
      "Process 50-item and 100-item OMR answer sheets via live camera or file upload",
      "Instant alignment feedback and real-time bubble detection",
      "Real-time answer extraction and grading visualization",
    ],
    sections: [
      {
        id: "admin-quick-scanner-guide",
        title: "1. Operating the AeroOMR Quick Scanner",
        icon: Sparkles,
        summary: "Procedure for capturing, detecting bubbles, and grading answer sheets.",
        steps: [
          {
            title: "Align Sheet with Guide Frame",
            description:
              "Position the physical answer sheet inside the live camera frame until the four corner fiducial markers lock on.",
            tip: "Maintain flat alignment and balanced ambient lighting without heavy glare.",
          },
          {
            title: "Instant Scoring & Overlay Feedback",
            description:
              "The OMR scanner automatically tabulates marked bubbles and renders visual grade overlays instantly.",
          },
        ],
      },
    ],
  },
  {
    role: "dean",
    roleTitle: "Dean / Executive Administration",
    badgeColor: "var(--error-bg)",
    icon: ShieldCheck,
    description:
      "Institutional oversight, high-level academic performance monitoring, faculty auditing, and cross-departmental pass-rate evaluations.",
    targetAudience: "Deans, Vice Presidents for Academic Affairs, Executive Committee",
    keyResponsibilities: [
      "Monitor institutional and departmental grade trends",
      "Audit exam quality and pass rates across all programmes",
      "Generate executive summaries for accreditation & CHED compliance",
      "Manage academic roles and system-wide permission scopes",
    ],
    sections: [
      {
        id: "dean-dashboard-overview",
        title: "1. Navigating the Executive Dashboard",
        icon: BarChart3,
        summary: "Understand institutional metrics, passing rates, and active programmes at a glance.",
        steps: [
          {
            title: "Access Institutional Snapshot",
            description:
              "Log in with your Dean credentials. The dashboard displays overall student counts, active faculty, overall exam volume, and institutional pass rate percentages.",
            tip: "Use the Metric Tiles to quickly spot departments operating below target performance thresholds.",
          },
          {
            title: "Review Priority Modules",
            description:
              "Navigate to Academic Management to see detailed breakdowns per department (Information Technology, Business Administration, Education, etc.).",
          },
        ],
      },
      {
        id: "dean-reports-compliance",
        title: "2. Generating Institutional & CHED Compliance Reports",
        icon: FileSpreadsheet,
        summary: "Export standardized grade sheets and academic metrics for CHED and accrediting bodies.",
        steps: [
          {
            title: "Export CHED Grade Sheet Formats",
            description:
              "Go to Reports & Analytics. Select an active exam and click 'Export CHED Grade Sheet (.xlsx)'. The file automatically formats scores into the official Philippine 1.00–5.00 grade conversion scale.",
            tip: "Reports follow the standard 75% passing threshold required by CHED guidelines.",
          },
          {
            title: "Cross-Programme Auditing",
            description:
              "Compare mean scores and item discrimination across multiple terms to ensure consistent grading standards across departments.",
          },
        ],
      },
    ],
  },
  {
    role: "programme-head",
    roleTitle: "Programme Head (Department Chair)",
    badgeColor: "var(--warning-bg)",
    icon: GraduationCap,
    description:
      "Departmental exam monitoring, curriculum alignment, section pass-rate tracking, and Outcome-Based Education (OBE) item review.",
    targetAudience: "BSIT Programme Heads, Department Chairs, Curriculum Coordinators",
    keyResponsibilities: [
      "Oversee exams published within your specific academic programme (e.g., BSIT)",
      "Evaluate curriculum effectiveness using Item Analysis (Difficulty & Discrimination Indices)",
      "Track faculty exam creation and scanning activity",
      "Identify students needing academic intervention or tutoring",
    ],
    sections: [
      {
        id: "ph-programme-analytics",
        title: "1. Programme Overview & Performance Monitoring",
        icon: Users,
        summary: "Track student performance specifically scoped to your assigned academic programme.",
        steps: [
          {
            title: "Inspect Programme Pass Rates",
            description:
              "Your dashboard defaults to your assigned programme (e.g., BSIT). Monitor current term pass rates, active exams, and faculty participation.",
          },
          {
            title: "Review Section Performance",
            description:
              "Filter examinations by section (e.g., BSIT 3A vs. BSIT 3B) to detect learning gaps across different class offerings.",
            tip: "Sections falling below a 70% average are flagged for curriculum review.",
          },
        ],
      },
      {
        id: "ph-obe-review",
        title: "2. Outcome-Based Education (OBE) Item Analysis Review",
        icon: Sliders,
        summary: "Analyze test validity using statistical item difficulty and discrimination metrics.",
        steps: [
          {
            title: "Evaluate Difficulty Index (P)",
            description:
              "Difficulty Index measures the proportion of students who answered a question correctly (0.0 to 1.0). Questions with P < 0.30 are categorized as 'Difficult', while P > 0.80 are 'Easy'.",
          },
          {
            title: "Evaluate Discrimination Index (D)",
            description:
              "Discrimination Index compares top 27% high performers against bottom 27% low performers (-1.0 to +1.0). Questions with D < 0.20 are flagged as 'Poor' and should be revised or discarded.",
            tip: "Export the full OBE Item Analysis table to Excel for department syllabus review meetings.",
          },
        ],
      },
    ],
  },
  {
    role: "teacher",
    roleTitle: "Teacher / Faculty Member",
    badgeColor: "var(--info-bg)",
    icon: BookOpen,
    description:
      "Full examination lifecycle: answer key creation, ZipGrade 50-question sheet scanning, automated grading, score transmute, and student feedback.",
    targetAudience: "Instructors, Professors, Lecturers, Exam Proctors",
    keyResponsibilities: [
      "Create new exams and define official answer keys (Questions 1–50)",
      "Scan master answer keys using sheet images or camera upload",
      "Grade student OMR sheets individually or in bulk",
      "Export CHED transmuted grade sheets and review feedback",
    ],
    sections: [
      {
        id: "teacher-create-exam",
        title: "1. Creating an Exam & Answer Key",
        icon: Sparkles,
        summary: "Set up a new 50-question exam and define correct option keys (A–E).",
        steps: [
          {
            title: "Create New Exam Entry",
            description:
              "Navigate to 'Exams & Grading' tab and click '+ Create New Exam'. Enter the exam title (e.g., 'ITP 305 Midterm Examination').",
          },
          {
            title: "Input Answer Key (Manual or Scan)",
            description:
              "Type answers manually or use 'Scan Answer Key Sheet' to upload a pre-filled master ZipGrade sheet. AeroOMR will extract the filled bubbles automatically!",
            tip: "Master answer keys can be updated at any time prior to final grade publishing.",
          },
        ],
      },
      {
        id: "teacher-scanning-workflow",
        title: "2. Quick Scanner & Bulk Sheet Grading",
        icon: Camera,
        summary: "Process student ZipGrade answer sheets with high-speed Optical Mark Recognition (OMR).",
        steps: [
          {
            title: "Quick Scanner Mode",
            description:
              "Use the 'Quick Scanner' tab to upload any sheet for instant answer extraction without saving to a specific exam database.",
          },
          {
            title: "Grading Student Sheets for an Exam",
            description:
              "Go to 'Exams & Grading', select your target exam. Choose between 'Upload Files' or 'Scan with Camera'. With the camera scanner, the system auto-detects alignment corner boxes in real time, locks bubbles, and automatically calculates scores and visual overlays.",
            tip: "Green circles indicate correct answers; Red circles highlight incorrect marks or ambiguous fills.",
          },
        ],
      },
      {
        id: "teacher-roster-export",
        title: "3. Importing Class Rosters & Exporting Reports",
        icon: FileSpreadsheet,
        summary: "Manage student IDs and export official CHED grade sheets.",
        steps: [
          {
            title: "Import Class Roster",
            description:
              "Click 'Import Class Roster' modal to upload a CSV file containing Student IDs and Names. This maps scanned Student IDs directly to enrolled students.",
          },
          {
            title: "Export CHED Grade Sheet",
            description:
              "Click 'Export CHED Grade Sheet (.xlsx)' to download an Excel document with raw scores, percentages, transmuted grades (1.00–5.00), and pass/fail statuses.",
          },
        ],
      },
    ],
  },
  {
    role: "student",
    roleTitle: "Student (View Only)",
    badgeColor: "var(--success-bg)",
    icon: Users,
    description:
      "Personal grade transparency, item-by-item bubble review, official CHED transmuted grade lookup, and performance tracking.",
    targetAudience: "Enrolled Students across all academic departments",
    keyResponsibilities: [
      "View published scores for quizzes, midterms, and final exams",
      "Check itemized answer breakdown (your selection vs. correct answer key)",
      "Understand CHED transmuted grades (1.00 = 99-100%, 3.00 = 75% Passing, 5.00 = Failed)",
      "Review teacher feedback on weak performance areas",
    ],
    sections: [
      {
        id: "student-results-view",
        title: "1. Accessing Your Exam Grades",
        icon: Award,
        summary: "View overall scores, transmuted grades, and passing remarks.",
        steps: [
          {
            title: "Log in to Student Workspace",
            description:
              "Sign in with your student email. Your personal dashboard highlights your latest exam scores, average percentage, and class ranking.",
          },
          {
            title: "Understand Transmuted Grades",
            description:
              "AeroOMR follows the standard Philippine CHED Transmutation Table where 75% = 3.00 (Passing). High scores (e.g., 96–100%) transmute to 1.00 (Excellent). Scores below 75% result in 5.00 (Failed).",
            tip: "Check the 'Remarks' column in your results table to see if your exam is Marked Passed or Failed.",
          },
        ],
      },
      {
        id: "student-answer-review",
        title: "2. Detailed Question & Answer Review",
        icon: FileText,
        summary: "Inspect your scanned answer sheet to learn from mistakes.",
        steps: [
          {
            title: "View Answer Overlay",
            description:
              "Click 'Inspect Sheet' on any graded exam entry to see your scanned sheet image with overlay annotations.",
          },
          {
            title: "Compare Answers",
            description:
              "Review questions item by item. Red flags indicate items where your marked bubble differed from the teacher's key or where a bubble was marked too faintly.",
          },
        ],
      },
    ],
  },
  {
    role: "omr-guide",
    roleTitle: "ZipGrade 50-Question OMR Best Practices",
    badgeColor: "var(--info-bg)",
    icon: Camera,
    description:
      "Technical guidelines for capturing high-accuracy OMR sheet images, lighting conditions, corner marker alignment, and bubble shading rules.",
    targetAudience: "All users scanning or uploading ZipGrade bubble sheets",
    keyResponsibilities: [
      "Ensure proper camera angle, lighting, and resolution when capturing sheets",
      "Maintain clear visibility of the 4 black square corner positioning markers",
      "Understand threshold settings for empty vs. ambiguous vs. valid bubble marks",
    ],
    sections: [
      {
        id: "omr-capture-rules",
        title: "1. Sheet Image Capture Requirements",
        icon: Camera,
        summary: "Optimal conditions for 99.9% optical scanning precision.",
        steps: [
          {
            title: "Four Corner Alignment",
            description:
              "Ensure all 4 solid black square corner boxes on the ZipGrade form are completely visible inside your photo frame. AeroOMR uses perspective transform mapping based on these 4 anchors.",
            tip: "Do not cut off or cover any corner marker box with fingers or clips.",
          },
          {
            title: "Lighting & Contrast",
            description:
              "Use even, bright light without harsh shadows cast across the bubble area. Avoid extreme camera tilt—hold the phone/camera directly above the paper sheet.",
          },
        ],
      },
      {
        id: "omr-bubble-rules",
        title: "2. Bubble Shading Standards",
        icon: CheckCircle2,
        summary: "How student bubble shade intensity is evaluated.",
        steps: [
          {
            title: "Dark Pencil / Black Ink",
            description:
              "Bubbles must be shaded cleanly with #2 pencil or dark blue/black ink.",
          },
          {
            title: "Ambiguous or Double Fills",
            description:
              "If a student shades two bubbles for a single question, AeroOMR flags the question as 'Ambiguous' and marks it incorrect to preserve exam integrity.",
          },
        ],
      },
    ],
  },
  {
    role: "faq",
    badgeColor: "var(--info-bg)",
    roleTitle: "Frequently Asked Questions (FAQ)",
    icon: HelpCircle,
    description:
      "Quick answers to common questions about AeroOMR grading and system workflows.",
    targetAudience: "All system users",
    keyResponsibilities: ["Self-service troubleshooting and system clarification"],
    sections: [
      {
        id: "faq-section",
        title: "Common Questions & Support",
        icon: Lightbulb,
        summary: "Resolving common questions without leaving the app.",
        steps: [
          {
            title: "Q: What sheet format does AeroOMR support?",
            description:
              "AeroOMR is optimized for the standard ZipGrade 50-Question Form V2 (supporting Student ID grid + 50 questions with choices A to E).",
          },
          {
            title: "Q: Can I run AeroOMR without an active backend connection?",
            description:
              "Yes! If the backend API is offline, AeroOMR automatically falls back to client-side mock demo data so you can continue exploring all dashboard features.",
          },
          {
            title: "Q: How is the Philippine Transmuted Grade calculated?",
            description:
              "Transmuted grades use the formula: Transmuted % = 75 + (Raw Score / Total Questions) * 25. The percentage is then mapped to standard CHED grades (1.00 = 99-100%, 1.25 = 96-98%, 1.50 = 93-95%, 3.00 = 75-77% Passing, 5.00 = Below 75%).",
          },
        ],
      },
    ],
  },
];

const getVisibleGuideRoles = (
  role?: UserRole,
): Array<UserRole | "omr-guide" | "faq"> => {
  switch (role) {
    case "dean":
      return ["dean", "omr-guide", "faq"];
    case "programme-head":
      return ["programme-head", "omr-guide", "faq"];
    case "teacher":
      return ["teacher", "omr-guide", "faq"];
    case "student":
      return ["student", "omr-guide", "faq"];
    default:
      return ["teacher", "omr-guide", "faq"];
  }
};

/**
 * UserGuideCard
 * Renders the complete, unified user guide inside a single seamless Card component.
 */
export const UserGuideCard: React.FC<UserGuideCardProps> = ({
  initialRole = "teacher",
  onNavigateTab,
  onClose,
  isModal = false,
  style = {},
  className = "",
}) => {
  const [activeRoleTab, setActiveRoleTab] = useState<
    UserRole | "omr-guide" | "faq"
  >(initialRole);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    all: true,
  });

  const visibleGuideRoles = useMemo(
    () => getVisibleGuideRoles(initialRole),
    [initialRole],
  );

  React.useEffect(() => {
    if (
      !activeRoleTab ||
      !visibleGuideRoles.includes(activeRoleTab as UserRole | "omr-guide" | "faq")
    ) {
      setActiveRoleTab(visibleGuideRoles[0] ?? initialRole);
    }
  }, [activeRoleTab, initialRole, visibleGuideRoles]);

  const currentRoleGuide = useMemo(() => {
    return (
      ROLE_GUIDES.find((g) => g.role === activeRoleTab) || ROLE_GUIDES[0]
    );
  }, [activeRoleTab]);

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return currentRoleGuide.sections;
    const q = searchQuery.toLowerCase();
    return currentRoleGuide.sections.filter(
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
  }, [currentRoleGuide, searchQuery]);

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

  const IconComp = currentRoleGuide.icon;

  return (
    <div
      className={`card ${className}`}
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        boxShadow: "var(--shadow-xl)",
        ...style,
      }}
    >
      {/* ── CARD UNIFIED HEADER ── */}
      <div
        style={{
          padding: "1.25rem 1.5rem",
          background: "var(--bg-surface-2)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {/* Top Title & Close Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "var(--warning-bg)",
                border: "1px solid var(--warning-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--warning-text)",
                flexShrink: 0,
              }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h2
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  margin: 0,
                  color: "var(--text-heading)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                AeroOMR User Guide & Manual
              </h2>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  margin: "0.15rem 0 0 0",
                }}
              >
                Comprehensive system workflow, scanning rules, and role procedures in a single card
              </p>
            </div>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="btn btn-outline"
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "8px",
                color: "var(--text-muted)",
              }}
              title="Close User Guide (Esc)"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Search Bar & Role Pill Tabs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ position: "relative" }}>
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
              style={{
                paddingLeft: "36px",
                background: "var(--bg-surface-2)",
                fontSize: "0.88rem",
                borderRadius: "8px",
                width: "100%",
              }}
              placeholder="Search user guide topics, CHED rules, OMR steps, or key terms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Role Navigation Pills */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              paddingBottom: "0.2rem",
            }}
          >
            {visibleGuideRoles.map((role) => {
              const guide = ROLE_GUIDES.find((item) => item.role === role);
              if (!guide) return null;

              const TabIcon = guide.icon;
              const isActive = activeRoleTab === guide.role;
              return (
                <button
                  key={guide.role}
                  onClick={() => setActiveRoleTab(guide.role)}
                  className={`btn ${isActive ? "btn-primary" : "btn-outline"}`}
                  style={{
                    padding: "0.4rem 0.75rem",
                    fontSize: "0.82rem",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    borderRadius: "20px",
                    border: isActive
                      ? "1px solid var(--srcb-gold-accent)"
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    background: isActive
                      ? "var(--srcb-gold-accent)"
                      : "var(--bg-surface-2)",
                    color: isActive ? "#000" : "var(--text-primary)",
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  <TabIcon size={14} />
                  {guide.role === "admin"
                    ? "Admin Guide"
                    : guide.role === "dean"
                      ? "Dean Guide"
                      : guide.role === "programme-head"
                        ? "Programme Head"
                        : guide.role === "teacher"
                          ? "Teacher Guide"
                          : guide.role === "student"
                            ? "Student Guide"
                            : guide.role === "omr-guide"
                              ? "OMR Scanning Rules"
                              : "FAQ & Help"}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CARD BODY (UNIFIED CONTINUOUS STREAM) ── */}
      <div
        style={{
          padding: "1.5rem",
          overflowY: isModal ? "auto" : "visible",
          maxHeight: isModal ? "calc(85vh - 200px)" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Role Overview Banner */}
        <div
          style={{
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border)",
            borderLeft: "4px solid var(--srcb-gold-accent)",
            borderRadius: "10px",
            padding: "1.1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginBottom: "0.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <IconComp size={20} style={{ color: "var(--srcb-gold-accent)" }} />
              <h3 style={{ fontSize: "1.1rem", margin: 0, fontWeight: 700 }}>
                {currentRoleGuide.roleTitle}
              </h3>
            </div>
            <span
              className="badge"
              style={{
                background: currentRoleGuide.badgeColor,
                color: "var(--srcb-gold-light)",
                fontSize: "0.75rem",
                padding: "0.2rem 0.6rem",
              }}
            >
              Audience: {currentRoleGuide.targetAudience}
            </span>
          </div>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", margin: "0 0 0.75rem 0", lineHeight: "1.5" }}>
            {currentRoleGuide.description}
          </p>

          {/* Key Capabilities */}
          <div
            style={{
              background: "var(--bg-base)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid var(--border-md)",
            }}
          >
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.4rem" }}>
              Key Responsibilities:
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.35rem" }}>
              {currentRoleGuide.keyResponsibilities.map((resp, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.4rem",
                    fontSize: "0.82rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <CheckCircle2 size={13} style={{ color: "var(--success)", flexShrink: 0, marginTop: "2px" }} />
                  <span>{resp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Action Navigation Buttons */}
        {onNavigateTab && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              flexWrap: "wrap",
              padding: "0.6rem 0.9rem",
              borderRadius: "8px",
              background: "var(--bg-surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
              Quick Action:
            </span>
            {currentRoleGuide.role === "teacher" && (
              <>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}
                  onClick={() => {
                    if (onClose) onClose();
                    onNavigateTab("quick-scan");
                  }}
                >
                  <Sparkles size={13} /> Open Quick Scanner
                </button>
                <button
                  className="btn btn-outline"
                  style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}
                  onClick={() => {
                    if (onClose) onClose();
                    onNavigateTab("exams");
                  }}
                >
                  <BookOpen size={13} /> Open Exams & Grading
                </button>
              </>
            )}
            {currentRoleGuide.role === "admin" && (
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}
                onClick={() => {
                  if (onClose) onClose();
                  onNavigateTab("quick-scan");
                }}
              >
                <Sparkles size={13} /> Open Quick Scanner
              </button>
            )}
            {(currentRoleGuide.role === "dean" || currentRoleGuide.role === "programme-head") && (
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}
                onClick={() => {
                  if (onClose) onClose();
                  onNavigateTab("reports");
                }}
              >
                <BarChart3 size={13} /> View Reports & Analytics
              </button>
            )}
            {currentRoleGuide.role === "student" && (
              <button
                className="btn btn-outline"
                style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem", borderRadius: "6px" }}
                onClick={() => {
                  if (onClose) onClose();
                  onNavigateTab("reports");
                }}
              >
                <Award size={13} /> View My Exam Results
              </button>
            )}
          </div>
        )}

        {/* Continuous Step-by-Step Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Step-by-Step Instructions & Workflow Procedures ({filteredSections.length})
            </h4>
          </div>

          {filteredSections.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "2rem",
                color: "var(--text-muted)",
                background: "var(--bg-surface-2)",
                borderRadius: "8px",
              }}
            >
              No guide topics matched your search "{searchQuery}". Try searching for terms like "CHED", "ZipGrade", "Pass Rate", or "Scan".
            </div>
          ) : (
            filteredSections.map((section) => {
              const SecIcon = section.icon;
              const open = isSectionOpen(section.id);

              return (
                <div
                  key={section.id}
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    overflow: "hidden",
                  }}
                >
                  {/* Section Title Bar */}
                  <div
                    onClick={() => toggleSection(section.id)}
                    style={{
                      padding: "0.85rem 1.1rem",
                      background: "var(--bg-base)",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                      <div
                        style={{
                          padding: "0.35rem",
                          borderRadius: "6px",
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "var(--accent)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <SecIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {section.title}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "1px" }}>
                          {section.summary}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {section.badge && (
                        <span
                          className="badge"
                          style={{
                            background: "rgba(168, 85, 247, 0.2)",
                            color: "#c084fc",
                            fontSize: "0.72rem",
                          }}
                        >
                          {section.badge}
                        </span>
                      )}
                      {open ? (
                        <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
                      ) : (
                        <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                      )}
                    </div>
                  </div>

                  {/* Section Steps Flow */}
                  {open && (
                    <div
                      style={{
                        padding: "1rem 1.1rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.85rem",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      {section.steps.map((step, sIdx) => (
                        <div
                          key={sIdx}
                          style={{
                            padding: "0.8rem 1rem",
                            borderRadius: "8px",
                            background: "var(--bg-surface-2)",
                            borderLeft: "3px solid var(--accent)",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.88rem",
                              color: "var(--text-primary)",
                              marginBottom: "0.3rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.45rem",
                            }}
                          >
                            <span
                              style={{
                                background: "var(--accent)",
                                color: "#000",
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                              }}
                            >
                              {sIdx + 1}
                            </span>
                            {step.title}
                          </div>

                          <p
                            style={{
                              fontSize: "0.84rem",
                              color: "var(--text-secondary)",
                              margin: 0,
                              lineHeight: "1.5",
                            }}
                          >
                            {step.description}
                          </p>

                          {step.tip && (
                            <div
                              style={{
                                marginTop: "0.45rem",
                                padding: "0.45rem 0.65rem",
                                borderRadius: "6px",
                                background: "rgba(245, 158, 11, 0.1)",
                                border: "1px solid rgba(245, 158, 11, 0.2)",
                                display: "flex",
                                alignItems: "flex-start",
                                gap: "0.4rem",
                                fontSize: "0.8rem",
                                color: "var(--srcb-gold-light)",
                              }}
                            >
                              <Lightbulb size={13} style={{ flexShrink: 0, marginTop: "2px" }} />
                              <span>
                                <strong>Pro Tip:</strong> {step.tip}
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
          padding: "0.9rem 1.5rem",
          background: "var(--bg-surface)",
          borderTop: "1px solid var(--border)",
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
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>St. Rita's College of Balingasag • Higher Education IT Department</span>
        </div>

        {isModal && onClose && (
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}>
            Got it, Close Manual
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * UserGuideModal
 * Overlay modal wrapper around the unified UserGuideCard.
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
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100vh",
        background: "var(--modal-overlay)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
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
          maxWidth: "920px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <UserGuideCard
          initialRole={initialRole}
          onNavigateTab={onNavigateTab}
          onClose={onClose}
          isModal={true}
          style={{ border: "none", borderRadius: 0, boxShadow: "none", maxHeight: "90vh" }}
        />
      </div>
    </div>
  );
};

export default UserGuideModal;
