export const REPORT_PERIODS = 4;

export function computeReportNF(grades) {
  const valid = grades.filter(v => v !== null && v !== undefined && !Number.isNaN(Number(v)));
  if (valid.length === 0) return '-';
  const sum = grades.reduce((acc, v) => acc + (v == null || Number.isNaN(Number(v)) ? 0 : Number(v)), 0);
  return Math.round(sum / REPORT_PERIODS);
}