import * as XLSX from 'xlsx';
import type { Submission, StudentRosterEntry, TransmutedGradeResult, ItemAnalysisRow, Exam } from '../types';

/**
 * Parses or infers Exam Type from Exam Name if not explicitly set
 */
export function parseExamType(examName?: string, explicitType?: string): string {
  if (explicitType && explicitType.trim().length > 0) {
    return explicitType.trim();
  }
  if (!examName) return 'Major Examination';
  const lower = examName.toLowerCase();
  if (lower.includes('midterm')) return 'Midterm Examination';
  if (lower.includes('final')) return 'Final Examination';
  if (lower.includes('quiz')) return 'Quiz';
  if (lower.includes('diagnostic')) return 'Diagnostic Test';
  if (lower.includes('unit') || lower.includes('chapter')) return 'Unit Test';
  if (lower.includes('prelim')) return 'Prelim Examination';
  return 'Major Examination';
}

/**
 * Calculates Philippine Transmuted Grade (1.00 - 5.00 Scale)
 * Standard PH HEI 50-Base Transmutation Formula:
 * Equivalent Percentage = 50 + (Raw Score / Total Questions * 50)
 */
export function calculateTransmutedGrade(score: number, totalQuestions: number = 50): TransmutedGradeResult {
  if (totalQuestions <= 0) {
    return { score: 0, total_questions: 50, percentage: 0, grade: '5.00', status: 'Failed', remarks: 'Invalid Total' };
  }

  const rawRatio = score / totalQuestions;
  const percentage = Math.round(50 + (rawRatio * 50));

  let grade = '5.00';
  let status: 'Passed' | 'Failed' = 'Failed';
  let remarks = 'Did Not Meet Minimum Benchmark';

  if (percentage >= 99) {
    grade = '1.00';
    status = 'Passed';
    remarks = 'Excellent';
  } else if (percentage >= 96) {
    grade = '1.25';
    status = 'Passed';
    remarks = 'Superior';
  } else if (percentage >= 93) {
    grade = '1.50';
    status = 'Passed';
    remarks = 'Very Good';
  } else if (percentage >= 90) {
    grade = '1.75';
    status = 'Passed';
    remarks = 'High Satisfactory';
  } else if (percentage >= 87) {
    grade = '2.00';
    status = 'Passed';
    remarks = 'Good';
  } else if (percentage >= 84) {
    grade = '2.25';
    status = 'Passed';
    remarks = 'Satisfactory';
  } else if (percentage >= 81) {
    grade = '2.50';
    status = 'Passed';
    remarks = 'Fair';
  } else if (percentage >= 78) {
    grade = '2.75';
    status = 'Passed';
    remarks = 'Moderate';
  } else if (percentage >= 75) {
    grade = '3.00';
    status = 'Passed';
    remarks = 'Passing Mark';
  } else {
    grade = '5.00';
    status = 'Failed';
    remarks = 'Failed';
  }

  return {
    score,
    total_questions: totalQuestions,
    percentage,
    grade,
    status,
    remarks
  };
}

/**
 * Calculates Outcome-Based Education (OBE) Item Analysis metrics
 */
export function calculateItemAnalysis(
  answerKey: Record<string, string>,
  submissions: Submission[]
): ItemAnalysisRow[] {
  const qNumbers = Object.keys(answerKey).map(q => parseInt(q)).sort((a, b) => a - b);
  const totalSubmissions = submissions.length;

  if (totalSubmissions === 0 || qNumbers.length === 0) {
    return [];
  }

  // Sort submissions by score descending for discrimination index (Upper 27% vs Lower 27%)
  const sortedSubmissions = [...submissions].sort((a, b) => b.score - a.score);
  const sampleSize = Math.max(1, Math.floor(totalSubmissions * 0.27));
  const upperGroup = sortedSubmissions.slice(0, sampleSize);
  const lowerGroup = sortedSubmissions.slice(totalSubmissions - sampleSize);

  return qNumbers.map(qNum => {
    const qStr = qNum.toString();
    const correctOpt = answerKey[qStr] || 'A';

    let correctCount = 0;
    const distractorCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, empty: 0 };

    submissions.forEach(sub => {
      const ansObj = sub.answers ? sub.answers[qStr] : null;
      const selected = ansObj ? ansObj.selected : null;

      if (!selected || ansObj?.is_empty) {
        distractorCounts.empty += 1;
      } else if (['A', 'B', 'C', 'D', 'E'].includes(selected)) {
        distractorCounts[selected as keyof typeof distractorCounts] += 1;
      }

      if (selected === correctOpt) {
        correctCount += 1;
      }
    });

    // Difficulty Index P = R / N
    const pIndex = Number((correctCount / totalSubmissions).toFixed(2));
    let pCat: 'Easy' | 'Moderate' | 'Difficult' = 'Moderate';
    if (pIndex >= 0.85) pCat = 'Easy';
    else if (pIndex < 0.35) pCat = 'Difficult';

    // Discrimination Index D = (Upper Correct - Lower Correct) / n
    let upperCorrect = 0;
    let lowerCorrect = 0;
    upperGroup.forEach(sub => {
      if (sub.answers && sub.answers[qStr]?.selected === correctOpt) upperCorrect += 1;
    });
    lowerGroup.forEach(sub => {
      if (sub.answers && sub.answers[qStr]?.selected === correctOpt) lowerCorrect += 1;
    });

    const dIndex = sampleSize > 0 ? Number(((upperCorrect - lowerCorrect) / sampleSize).toFixed(2)) : 0;
    let dCat: 'Very Good' | 'Reasonable' | 'Marginal' | 'Poor' = 'Reasonable';
    if (dIndex >= 0.40) dCat = 'Very Good';
    else if (dIndex >= 0.30) dCat = 'Reasonable';
    else if (dIndex >= 0.20) dCat = 'Marginal';
    else dCat = 'Poor';

    return {
      question_number: qNum,
      correct_answer: correctOpt,
      correct_count: correctCount,
      total_responses: totalSubmissions,
      difficulty_index: pIndex,
      difficulty_category: pCat,
      discrimination_index: dIndex,
      discrimination_category: dCat,
      distractor_counts: distractorCounts
    };
  });
}

/**
 * Parses uploaded Class Roster file (.xlsx or .csv)
 */
export async function parseRosterFile(file: File): Promise<StudentRosterEntry[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet);

        const roster: StudentRosterEntry[] = [];

        jsonData.forEach(row => {
          const student_id = String(row['Student ID'] || row['StudentNo'] || row['ID'] || row['student_id'] || '').trim();
          const name = String(row['Student Name'] || row['Name'] || row['Full Name'] || row['student_name'] || '').trim();
          const course_section = String(row['Course & Section'] || row['Section'] || row['Course'] || row['course_section'] || '').trim();
          const email = String(row['Email'] || row['email'] || '').trim();

          if (student_id) {
            roster.push({
              student_id,
              name: name || `Student ${student_id}`,
              course_section,
              email
            });
          }
        });

        resolve(roster);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Helper to build standard Institutional & Examination Header Metadata Rows
 */
function buildExaminationMetadataHeader(exam?: Exam, examTypeOverride?: string) {
  const examTitle = exam ? exam.name : 'OMR Examination';
  const examType = examTypeOverride || exam?.exam_type || parseExamType(examTitle);

  return [
    { 'METRIC / FIELD': 'INSTITUTION', 'VALUE': "St. Rita's College of Balingasag - Higher Education Department" },
    { 'METRIC / FIELD': 'EXAMINATION TITLE', 'VALUE': examTitle },
    { 'METRIC / FIELD': 'EXAM TYPE', 'VALUE': examType },
    { 'METRIC / FIELD': 'COURSE / SUBJECT', 'VALUE': exam?.subject || 'N/A' },
    { 'METRIC / FIELD': 'COURSE CODE', 'VALUE': exam?.course_code || 'N/A' },
    { 'METRIC / FIELD': 'SECTION', 'VALUE': exam?.section || 'N/A' },
    { 'METRIC / FIELD': 'PROGRAM / DEPARTMENT', 'VALUE': exam?.program || 'BSIT' },
    { 'METRIC / FIELD': 'ACADEMIC YEAR', 'VALUE': exam?.academic_year || '2025-2026' },
    { 'METRIC / FIELD': 'SEMESTER', 'VALUE': exam?.semester || '1st Semester' },
    { 'METRIC / FIELD': 'INSTRUCTOR NAME', 'VALUE': exam?.instructor_name || 'Faculty Member' },
    { 'METRIC / FIELD': 'SCHEDULED EXAM DATE', 'VALUE': exam?.exam_date || 'N/A' },
    { 'METRIC / FIELD': 'TOTAL TEST ITEMS', 'VALUE': exam?.num_items || Object.keys(exam?.answer_key || {}).length || 50 },
    { 'METRIC / FIELD': 'PASSING SCORE BENCHMARK', 'VALUE': exam?.passing_score ? `${exam.passing_score} / ${exam.num_items || 50}` : 'N/A' },
    { 'METRIC / FIELD': 'EXAM INSTRUCTIONS', 'VALUE': exam?.instructions || 'Standard OMR Grading Guidelines Applied.' },
    { 'METRIC / FIELD': 'REPORT GENERATED DATE', 'VALUE': new Date().toLocaleString() }
  ];
}

/**
 * 1. Single File Export: Exports an individual scanned submission directly from file inspection page.
 */
export function exportSingleSubmissionExcel(
  submission: Submission,
  exam: Exam | undefined,
  roster: StudentRosterEntry[] = []
) {
  const rosterMap = new Map<string, StudentRosterEntry>();
  roster.forEach(r => rosterMap.set(r.student_id.toLowerCase(), r));

  const matched = rosterMap.get((submission.student_id || '').toLowerCase());
  const totalItems = exam?.num_items || submission.total_questions || 50;
  const trans = calculateTransmutedGrade(submission.score, totalItems);
  const examName = exam ? exam.name : 'Unknown Exam';
  const examType = exam?.exam_type || parseExamType(examName);
  const dateStr = new Date(submission.created_at).toLocaleString();

  // Sheet 1: Individual Submission Overview Header Card & Complete Metadata
  const metadataRows = buildExaminationMetadataHeader(exam, examType);
  const studentRows = [
    { 'METRIC / FIELD': '--- STUDENT PERFORMANCE ---', 'VALUE': '----------------------------------------' },
    { 'METRIC / FIELD': 'Student ID', 'VALUE': submission.student_id || 'N/A' },
    { 'METRIC / FIELD': 'Student Full Name', 'VALUE': matched ? matched.name : 'N/A' },
    { 'METRIC / FIELD': 'Course & Section', 'VALUE': matched?.course_section || exam?.section || 'N/A' },
    { 'METRIC / FIELD': 'Student Email', 'VALUE': matched?.email || 'N/A' },
    { 'METRIC / FIELD': 'Raw Score Obtained', 'VALUE': `${submission.score} / ${totalItems}` },
    { 'METRIC / FIELD': 'Equivalent Percentage', 'VALUE': `${trans.percentage}%` },
    { 'METRIC / FIELD': 'PH Transmuted Grade', 'VALUE': trans.grade },
    { 'METRIC / FIELD': 'Academic Status', 'VALUE': trans.status },
    { 'METRIC / FIELD': 'Remarks', 'VALUE': trans.remarks },
    { 'METRIC / FIELD': 'Date & Time Graded', 'VALUE': dateStr }
  ];

  const summaryRows = [...metadataRows, ...studentRows];
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 55 }];

  // Sheet 2: Question-by-Question Bubble Mark Audit Table
  const answerKey = exam?.answer_key || {};
  const answersObj = submission.answers || {};
  const qBreakdown = [];

  for (let i = 1; i <= totalItems; i++) {
    const qStr = i.toString();
    const keyAns = answerKey[qStr] || 'N/A';
    const ansDetail = answersObj[qStr];
    const marked = ansDetail ? (ansDetail.is_empty ? 'EMPTY' : ansDetail.selected || 'N/A') : 'N/A';
    const isAmbiguous = ansDetail?.is_ambiguous || false;
    const isCorrect = marked === keyAns;

    let statusStr = 'Incorrect';
    if (isCorrect) statusStr = 'Correct';
    else if (ansDetail?.is_empty) statusStr = 'Unmarked / Blank';
    else if (isAmbiguous) statusStr = 'Ambiguous Mark';

    qBreakdown.push({
      'Question #': `Q${i}`,
      'Exam Title': examName,
      'Exam Type': examType,
      'Course Code': exam?.course_code || 'N/A',
      'Correct Answer Key': keyAns,
      'Student Marked Choice': marked,
      'Evaluation Status': statusStr,
      'Ambiguous Flag': isAmbiguous ? 'YES' : 'NO'
    });
  }

  const wsBreakdown = XLSX.utils.json_to_sheet(qBreakdown);
  wsBreakdown['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 24 }, { wch: 20 }, { wch: 16 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Submission Overview');
  XLSX.utils.book_append_sheet(workbook, wsBreakdown, 'Question Breakdown');

  const safeStudent = (submission.student_id || 'Student').replace(/[^a-zA-Z0-9]/g, '_');
  const safeExam = examName.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Single_Submission_${safeStudent}_${safeExam}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * 2. Exam-Based Batch Export: Compiles all student submissions belonging to the same examination into a single Excel report.
 */
export function exportExamBatchExcel(
  exam: Exam,
  submissions: Submission[],
  roster: StudentRosterEntry[] = [],
  examTypeOverride?: string
) {
  const rosterMap = new Map<string, StudentRosterEntry>();
  roster.forEach(r => rosterMap.set(r.student_id.toLowerCase(), r));

  const examSubs = submissions.filter(s => s.exam_id === exam.id);
  const examType = examTypeOverride || exam.exam_type || parseExamType(exam.name);
  const totalItems = exam.num_items || Object.keys(exam.answer_key || {}).length || 50;
  const totalCandidates = examSubs.length;
  const avgScore = totalCandidates > 0
    ? Number((examSubs.reduce((acc, curr) => acc + curr.score, 0) / totalCandidates).toFixed(2))
    : 0;
  const passCount = examSubs.filter(s => calculateTransmutedGrade(s.score, totalItems).status === 'Passed').length;
  const passRate = totalCandidates > 0 ? `${Math.round((passCount / totalCandidates) * 100)}%` : '0%';

  // Sheet 1: Exam Overview Header with Full Examination Metadata
  const metadataHeader = buildExaminationMetadataHeader(exam, examType);
  const statsRows = [
    { 'METRIC / FIELD': '--- CLASS PERFORMANCE SUMMARY ---', 'VALUE': '----------------------------------------' },
    { 'METRIC / FIELD': 'Total Students Scanned', 'VALUE': totalCandidates },
    { 'METRIC / FIELD': 'Mean Class Raw Score', 'VALUE': `${avgScore} / ${totalItems}` },
    { 'METRIC / FIELD': 'Class Average Percentage', 'VALUE': `${Math.round(50 + (avgScore / totalItems * 50))}%` },
    { 'METRIC / FIELD': 'Passed Candidates', 'VALUE': `${passCount} / ${totalCandidates}` },
    { 'METRIC / FIELD': 'Passing Rate (%)', 'VALUE': passRate }
  ];

  const overviewRows = [...metadataHeader, ...statsRows];
  const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
  wsOverview['!cols'] = [{ wch: 32 }, { wch: 55 }];

  // Sheet 2: Exam Batch Roster & Summary
  const studentRows = examSubs.map(sub => {
    const matched = rosterMap.get((sub.student_id || '').toLowerCase());
    const trans = calculateTransmutedGrade(sub.score, totalItems);

    return {
      'Student ID': sub.student_id || 'N/A',
      'Student Full Name': matched ? matched.name : 'N/A',
      'Course & Section': matched?.course_section || exam.section || 'N/A',
      'Exam Title': exam.name,
      'Exam Type': examType,
      'Course Code': exam.course_code || 'N/A',
      'Subject': exam.subject || 'N/A',
      'Academic Year': exam.academic_year || '2025-2026',
      'Semester': exam.semester || '1st Semester',
      'Instructor': exam.instructor_name || 'N/A',
      'Raw Score': sub.score,
      'Total Items': totalItems,
      'Equiv Percentage': `${trans.percentage}%`,
      'Transmuted Grade': trans.grade,
      'Status': trans.status,
      'Remarks': trans.remarks,
      'Date Graded': new Date(sub.created_at).toLocaleString()
    };
  });

  const wsSummary = XLSX.utils.json_to_sheet(studentRows);
  wsSummary['!cols'] = [
    { wch: 16 }, { wch: 25 }, { wch: 18 }, { wch: 32 }, { wch: 18 },
    { wch: 14 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 22 }
  ];

  // Sheet 3: Student Item Matrix (Q1 to Q[totalItems])
  const matrixData = examSubs.map(sub => {
    const matched = rosterMap.get((sub.student_id || '').toLowerCase());
    const row: Record<string, any> = {
      'Student ID': sub.student_id || 'N/A',
      'Student Name': matched ? matched.name : 'N/A',
      'Course Code': exam.course_code || 'N/A',
      'Score': sub.score
    };
    for (let q = 1; q <= totalItems; q++) {
      const qStr = q.toString();
      const ansObj = sub.answers ? sub.answers[qStr] : null;
      row[`Q${q}`] = ansObj ? (ansObj.is_empty ? '-' : ansObj.selected || '-') : '-';
    }
    return row;
  });
  const wsMatrix = XLSX.utils.json_to_sheet(matrixData);

  // Sheet 4: OBE Item Analysis Report
  const itemAnalysisRows = calculateItemAnalysis(exam.answer_key, examSubs);
  const analysisExport = itemAnalysisRows.map(row => ({
    'Question #': `Q${row.question_number}`,
    'Key Option': row.correct_answer,
    'Correct Responses': row.correct_count,
    'Total Scanned': row.total_responses,
    'Difficulty Index (P)': row.difficulty_index,
    'Difficulty Rating': row.difficulty_category,
    'Discrimination Index (D)': row.discrimination_index,
    'Discrimination Rating': row.discrimination_category,
    'A Count': row.distractor_counts.A,
    'B Count': row.distractor_counts.B,
    'C Count': row.distractor_counts.C,
    'D Count': row.distractor_counts.D,
    'E Count': row.distractor_counts.E,
    'Empty/Blank': row.distractor_counts.empty
  }));
  const wsAnalysis = XLSX.utils.json_to_sheet(analysisExport);
  wsAnalysis['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsOverview, 'Exam Overview');
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Batch Submissions Roster');
  XLSX.utils.book_append_sheet(workbook, wsMatrix, 'Answer Choice Matrix');
  XLSX.utils.book_append_sheet(workbook, wsAnalysis, 'OBE Item Analysis');

  const safeExam = exam.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `Batch_Report_${safeExam}_${examType.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Options for Grouped / Filtered Complete Database Export
 */
export interface DatabaseExportOptions {
  examTypeFilter?: string; // "All" | "Preliminary" | "Midterm" | "Pre-Final" | "Final"
  semesterFilter?: string; // "All" | "1st Semester" | "2nd Semester" | "Summer"
  searchQuery?: string;
  groupBy?: 'none' | 'exam_type' | 'subject'; // Group sheets by Exam Type or Subject
}

/**
 * 3. Grouped / Filtered Complete Teacher Database Export System
 */
export function exportCompleteDatabaseExcel(
  exams: Exam[],
  submissions: Submission[],
  roster: StudentRosterEntry[] = [],
  options: DatabaseExportOptions = {}
) {
  const rosterMap = new Map<string, StudentRosterEntry>();
  roster.forEach(r => rosterMap.set(r.student_id.toLowerCase(), r));

  const examMap = new Map<string, Exam>();
  exams.forEach(e => examMap.set(e.id, e));

  // Filter exams based on options
  let filteredExams = [...exams];
  if (options.examTypeFilter && options.examTypeFilter !== 'All') {
    filteredExams = filteredExams.filter(e => (e.exam_type || parseExamType(e.name)).toLowerCase() === options.examTypeFilter?.toLowerCase());
  }
  if (options.semesterFilter && options.semesterFilter !== 'All') {
    filteredExams = filteredExams.filter(e => (e.semester || '1st Semester').toLowerCase() === options.semesterFilter?.toLowerCase());
  }

  const filteredExamIds = new Set(filteredExams.map(e => e.id));

  // Filter submissions corresponding to filtered exams & search query
  let filteredSubmissions = submissions.filter(s => filteredExamIds.has(s.exam_id));
  if (options.searchQuery && options.searchQuery.trim()) {
    const q = options.searchQuery.toLowerCase().trim();
    filteredSubmissions = filteredSubmissions.filter(sub => {
      const student = rosterMap.get((sub.student_id || '').toLowerCase());
      const exam = examMap.get(sub.exam_id);
      return (
        (sub.student_id && sub.student_id.toLowerCase().includes(q)) ||
        (student && student.name.toLowerCase().includes(q)) ||
        (exam && exam.name.toLowerCase().includes(q)) ||
        (exam && exam.subject && exam.subject.toLowerCase().includes(q)) ||
        (exam && exam.course_code && exam.course_code.toLowerCase().includes(q))
      );
    });
  }

  const workbook = XLSX.utils.book_new();

  // Master Sheet 1: All Filtered Database Submissions
  const masterData = filteredSubmissions.map(sub => {
    const matchedStudent = rosterMap.get((sub.student_id || '').toLowerCase());
    const matchedExam = examMap.get(sub.exam_id);
    const examName = matchedExam ? matchedExam.name : 'Unknown Exam';
    const examType = matchedExam?.exam_type || parseExamType(examName);
    const totalItems = matchedExam?.num_items || sub.total_questions || 50;
    const trans = calculateTransmutedGrade(sub.score, totalItems);

    return {
      'Submission ID': sub.id,
      'Exam Title': examName,
      'Exam Type': examType,
      'Course Code': matchedExam?.course_code || 'N/A',
      'Course / Subject': matchedExam?.subject || 'N/A',
      'Section': matchedExam?.section || matchedStudent?.course_section || 'N/A',
      'Academic Year': matchedExam?.academic_year || '2025-2026',
      'Semester': matchedExam?.semester || '1st Semester',
      'Instructor': matchedExam?.instructor_name || 'N/A',
      'Student ID': sub.student_id || 'N/A',
      'Student Full Name': matchedStudent ? matchedStudent.name : 'N/A',
      'Raw Score': sub.score,
      'Total Items': totalItems,
      'Equiv Percentage': `${trans.percentage}%`,
      'Transmuted Grade': trans.grade,
      'Status': trans.status,
      'Remarks': trans.remarks,
      'Graded Date': new Date(sub.created_at).toLocaleString()
    };
  });

  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  wsMaster['!cols'] = [
    { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 28 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 16 },
    { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 22 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsMaster, 'Master Submissions DB');

  // Sheet 2: Database Summary per Examination with Complete Metadata
  const examSummaries = filteredExams.map(exam => {
    const examSubs = filteredSubmissions.filter(s => s.exam_id === exam.id);
    const subCount = examSubs.length;
    const scores = examSubs.map(s => s.score);
    const totalItems = exam.num_items || 50;
    const avg = subCount > 0 ? Number((scores.reduce((a, b) => a + b, 0) / subCount).toFixed(2)) : 0;
    const maxScore = subCount > 0 ? Math.max(...scores) : 0;
    const minScore = subCount > 0 ? Math.min(...scores) : 0;
    const passCount = examSubs.filter(s => calculateTransmutedGrade(s.score, totalItems).status === 'Passed').length;
    const passRate = subCount > 0 ? `${Math.round((passCount / subCount) * 100)}%` : '0%';

    return {
      'Exam ID': exam.id,
      'Exam Title': exam.name,
      'Exam Type': exam.exam_type || parseExamType(exam.name),
      'Course Code': exam.course_code || 'N/A',
      'Subject': exam.subject || 'N/A',
      'Section': exam.section || 'N/A',
      'Academic Year': exam.academic_year || '2025-2026',
      'Semester': exam.semester || '1st Semester',
      'Instructor': exam.instructor_name || 'N/A',
      'Total Items': totalItems,
      'Passing Score Benchmark': exam.passing_score || 'N/A',
      'Total Scanned Submissions': subCount,
      'Average Score': avg,
      'Highest Score': maxScore,
      'Lowest Score': minScore,
      'Passed Candidates': passCount,
      'Pass Rate': passRate,
      'Created Date': new Date(exam.created_at).toLocaleDateString()
    };
  });

  const wsExamSummary = XLSX.utils.json_to_sheet(examSummaries);
  wsExamSummary['!cols'] = [
    { wch: 14 }, { wch: 32 }, { wch: 18 }, { wch: 14 }, { wch: 28 },
    { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 12 },
    { wch: 22 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 18 }, { wch: 14 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsExamSummary, 'Exams Directory Summary');

  // Optional Grouping Sheets by Exam Type (e.g., Preliminary, Midterm, Pre-Final, Final)
  if (options.groupBy === 'exam_type') {
    const types = ['Preliminary', 'Midterm', 'Pre-Final', 'Final'];
    types.forEach(type => {
      const typeSubs = masterData.filter(row => row['Exam Type'].toLowerCase().includes(type.toLowerCase()));
      if (typeSubs.length > 0) {
        const wsType = XLSX.utils.json_to_sheet(typeSubs);
        XLSX.utils.book_append_sheet(workbook, wsType, `${type} Submissions`);
      }
    });
  }

  // Sheet 3: Student Roster Directory & Academic History
  const studentSummaries = roster.map(student => {
    const studentSubs = filteredSubmissions.filter(s => (s.student_id || '').toLowerCase() === student.student_id.toLowerCase());
    const count = studentSubs.length;
    const avg = count > 0 ? Number((studentSubs.reduce((a, b) => a + b.score, 0) / count).toFixed(2)) : 0;
    const sampleTotal = studentSubs.length > 0 ? studentSubs[0].total_questions : 50;

    return {
      'Student ID': student.student_id,
      'Student Name': student.name,
      'Course & Section': student.course_section || 'N/A',
      'Email': student.email || 'N/A',
      'Exams Completed': count,
      'Overall Average Score': count > 0 ? `${avg} / ${sampleTotal} (${Math.round(50 + (avg / sampleTotal * 50))}%)` : 'No submissions'
    };
  });

  const wsStudents = XLSX.utils.json_to_sheet(studentSummaries);
  wsStudents['!cols'] = [
    { wch: 16 }, { wch: 25 }, { wch: 18 }, { wch: 25 }, { wch: 18 }, { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsStudents, 'Student Roster Directory');

  const dateStr = new Date().toISOString().split('T')[0];
  const typeTag = options.examTypeFilter && options.examTypeFilter !== 'All' ? `_${options.examTypeFilter}` : '';
  const fileName = `Teacher_Database_Report${typeTag}_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports CHED-Compliant Master Grade Sheet to .xlsx file (Legacy / Compat)
 */
export function exportCHEDGradeSheet(
  examName: string,
  submissions: Submission[],
  roster: StudentRosterEntry[] = [],
  exam?: Exam
) {
  const rosterMap = new Map<string, StudentRosterEntry>();
  roster.forEach(r => rosterMap.set(r.student_id.toLowerCase(), r));

  const totalItems = exam?.num_items || 50;

  const headerRows = buildExaminationMetadataHeader(exam);

  const studentData = submissions.map(sub => {
    const matched = rosterMap.get((sub.student_id || '').toLowerCase());
    const trans = calculateTransmutedGrade(sub.score, sub.total_questions || totalItems);

    return {
      'Student ID': sub.student_id || 'N/A',
      'Student Full Name': matched ? matched.name : 'N/A',
      'Course & Section': matched?.course_section || exam?.section || 'N/A',
      'Course Code': exam?.course_code || 'N/A',
      'Subject Title': exam?.subject || examName,
      'Exam Type': exam?.exam_type || parseExamType(examName),
      'Raw Score': sub.score,
      'Total Items': sub.total_questions || totalItems,
      'Equiv Percentage': `${trans.percentage}%`,
      'Transmuted Grade': trans.grade,
      'Status': trans.status,
      'Remarks': trans.remarks,
      'Graded Date': new Date(sub.created_at).toLocaleString()
    };
  });

  const worksheet = XLSX.utils.json_to_sheet([...headerRows, { 'METRIC / FIELD': '--- OFFICIAL GRADES ---', 'VALUE': '----------------------------------------' }, ...studentData]);
  worksheet['!cols'] = [
    { wch: 16 }, { wch: 25 }, { wch: 18 }, { wch: 14 }, { wch: 28 },
    { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 },
    { wch: 12 }, { wch: 22 }, { wch: 22 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CHED Grade Sheet');

  const fileName = `${examName.replace(/[^a-zA-Z0-9]/g, '_')}_CHED_Grades.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

/**
 * Exports OBE Item Analysis Report to .xlsx file
 */
export function exportItemAnalysisExcel(
  examName: string,
  answerKey: Record<string, string>,
  submissions: Submission[],
  exam?: Exam
) {
  const itemAnalysis = calculateItemAnalysis(answerKey, submissions);
  const headerRows = buildExaminationMetadataHeader(exam);

  const exportData = itemAnalysis.map(row => ({
    'Question #': `Q${row.question_number}`,
    'Key Option': row.correct_answer,
    'Correct Responses': row.correct_count,
    'Total Scanned': row.total_responses,
    'Difficulty Index (P)': row.difficulty_index,
    'Difficulty Rating': row.difficulty_category,
    'Discrimination Index (D)': row.discrimination_index,
    'Discrimination Rating': row.discrimination_category,
    'A Count': row.distractor_counts.A,
    'B Count': row.distractor_counts.B,
    'C Count': row.distractor_counts.C,
    'D Count': row.distractor_counts.D,
    'E Count': row.distractor_counts.E,
    'Empty/Blank': row.distractor_counts.empty
  }));

  const worksheet = XLSX.utils.json_to_sheet([...headerRows, { 'METRIC / FIELD': '--- OBE ITEM ANALYSIS ---', 'VALUE': '----------------------------------------' }, ...exportData]);
  worksheet['!cols'] = [
    { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 20 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
    { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 }
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Item Analysis');

  const fileName = `${examName.replace(/[^a-zA-Z0-9]/g, '_')}_Item_Analysis.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
