export const computeModulePhaseAverage = (n1, n2, n3) => {
  return ((parseFloat(n1) || 0) + (parseFloat(n2) || 0) + (parseFloat(n3) || 0)) / 3;
};

export const computeModuleLevel = (notaFinal) => {
  if (notaFinal >= 9.0) return 5;
  if (notaFinal >= 7.0) return 4;
  if (notaFinal >= 5.0) return 3;
  if (notaFinal >= 3.0) return 2;
  return 1;
};

export const computeModuleGrade = ({
  preparacion_nota1, preparacion_nota2, preparacion_nota3,
  ejecucion_nota1, ejecucion_nota2, ejecucion_nota3,
  evaluacion_nota1, evaluacion_nota2, evaluacion_nota3
}) => {
  const promPreparacion = computeModulePhaseAverage(preparacion_nota1, preparacion_nota2, preparacion_nota3);
  const promEjecucion = computeModulePhaseAverage(ejecucion_nota1, ejecucion_nota2, ejecucion_nota3);
  const promEvaluacion = computeModulePhaseAverage(evaluacion_nota1, evaluacion_nota2, evaluacion_nota3);
  const promedio = parseFloat((promPreparacion * 0.25 + promEjecucion * 0.50 + promEvaluacion * 0.25).toFixed(2));
  return {
    promedio,
    nivel_logro: computeModuleLevel(promedio),
    promPreparacion,
    promEjecucion,
    promEvaluacion
  };
};