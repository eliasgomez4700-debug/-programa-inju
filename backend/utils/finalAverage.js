export const computeFinalAverage = async (db, student_id, academic_year_id) => {
  const [periods] = await db.query(
    'SELECT id FROM periods WHERE academic_year_id = ?', [academic_year_id]
  );
  const periodIds = periods.map(p => p.id);

  const allSubjects = [];

  if (periodIds.length > 0) {
    const placeholders = periodIds.map(() => '?').join(',');
    const [basicGrades] = await db.query(
      `SELECT g.subject_id, s.nombre as subject_nombre, s.tipo as subject_tipo, AVG(g.promedio) as promedio_anual
      FROM grades g
      JOIN subjects s ON g.subject_id = s.id
      WHERE g.student_id = ? AND g.period_id IN (${placeholders})
      GROUP BY g.subject_id`,
      [student_id, ...periodIds]
    );
    allSubjects.push(...basicGrades);
  }

  const [moduleGrades] = await db.query(
    `SELECT mg.subject_id, s.nombre as subject_nombre, s.tipo as subject_tipo, mg.promedio as promedio_anual
    FROM module_grades mg
    JOIN subjects s ON mg.subject_id = s.id
    WHERE mg.student_id = ? AND mg.academic_year_id = ?`,
    [student_id, academic_year_id]
  );
  allSubjects.push(...moduleGrades);

  if (allSubjects.length === 0) {
    return { materias: [], promedio_general: 0, estado_final: 'reprobado' };
  }

  const subjectIds = allSubjects.map(s => s.subject_id);
  if (subjectIds.length > 0) {
    const ph = subjectIds.map(() => '?').join(',');
    const [recoveryMap] = await db.query(
      `SELECT subject_id, nf, estado FROM recovery_grades
       WHERE student_id = ? AND subject_id IN (${ph}) AND academic_year_id = ?`,
      [student_id, ...subjectIds, academic_year_id]
    );
    const recMap = new Map(recoveryMap.map(r => [r.subject_id, r]));

    for (const sub of allSubjects) {
      const recGrade = recMap.get(sub.subject_id);
      if (recGrade && recGrade.nf > 0) {
        sub.promedio_anual = parseFloat(recGrade.nf);
        sub.estado = recGrade.estado === 'aprobado' ? 'Aprobado' : 'Reprobado';
      } else {
        sub.estado = sub.promedio_anual >= 6.0 ? 'Aprobado' : 'Reprobado';
      }
    }
  }

  let sumTotal = 0;
  for (const sub of allSubjects) {
    sumTotal += parseFloat(sub.promedio_anual);
  }
  const promedioGeneral = parseFloat((sumTotal / allSubjects.length).toFixed(2));
  const estadoFinal = promedioGeneral >= 6.0 ? 'aprobado' : 'reprobado';

  return {
    materias: allSubjects,
    promedio_general: promedioGeneral,
    estado_final: estadoFinal,
  };
};
