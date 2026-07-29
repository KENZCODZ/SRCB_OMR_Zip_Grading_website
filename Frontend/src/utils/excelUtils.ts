import * as XLSX from 'xlsx';
import type { Submission, StudentRosterEntry, TransmutedGradeResult, ItemAnalysisRow } from '../types';

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
          // Normalize column names
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
 * Exports CHED-Compliant Master Grade Sheet to .xlsx file
 */
export function exportCHEDGradeSheet(
  examName: string,
  submissions: Submission[],
  roster: StudentRosterEntry[] = []
) {
  const rosterMap = new Map<string, StudentRosterEntry>();
  roster.forEach(r => rosterMap.set(r.student_id.toLowerCase(), r));

  const exportData = submissions.map(sub => {
    const matched = rosterMap.get((sub.student_id || '').toLowerCase());
    const trans = calculateTransmutedGrade(sub.score, sub.total_questions || 50);

    return {
      'Student ID': sub.student_id || 'N/A',
      'Student Full Name': matched ? matched.name : 'N/A',
      'Course & Section': matched?.course_section || 'N/A',
      'Raw Score': sub.score,
      'Total Items': sub.total_questions || 50,
      'Equiv Percentage': `${trans.percentage}%`,
      'Transmuted Grade': trans.grade,
      'Status': trans.status,
      'Remarks': trans.remarks,
      'Graded Date': new Date(sub.created_at).toLocaleString()
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  
  // Custom column widths
  worksheet['!cols'] = [
    { wch: 16 }, // Student ID
    { wch: 25 }, // Student Full Name
    { wch: 18 }, // Course & Section
    { wch: 12 }, // Raw Score
    { wch: 12 }, // Total Items
    { wch: 18 }, // Equiv Percentage
    { wch: 18 }, // Transmuted Grade
    { wch: 12 }, // Status
    { wch: 22 }, // Remarks
    { wch: 22 }  // Graded Date
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
  submissions: Submission[]
) {
  const itemAnalysis = calculateItemAnalysis(answerKey, submissions);

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

  const worksheet = XLSX.utils.json_to_sheet(exportData);
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
