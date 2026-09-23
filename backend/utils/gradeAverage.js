export const computeGradeAverage = (n1, n2, n3, rec, ref) => {
  const regular = (n1 * 0.35) + (n2 * 0.35) + (n3 * 0.30);
  if (regular >= 6) return parseFloat(regular.toFixed(2));
  if ((rec || 0) === 0 && (ref || 0) === 0) return parseFloat(regular.toFixed(2));
  const notaRec = ((rec || 0) + (ref || 0)) / 2;
  if (notaRec >= 6) return 6;
  return parseFloat(notaRec.toFixed(2));
};