# Implementation Plan: Cuadrícula de Carga Masiva de Notas

## Overview

Reemplazar el ingreso alumno por alumno en el apartado Notas por una cuadrícula general con todos los alumnos de la sección: celdas editables para Nota1/Nota2/Nota3/Rec/Ref, promedio calculado en vivo, y un guardado en lote único.

Especificación: `SPEC-cuadricula-notas.md`.

## Architecture Decisions

1. **Fórmula compartida** — Extraer la fórmula de promedio (35/35/30 + override de recuperación) a `backend/utils/gradeAverage.js` para que el endpoint individual y el batch no la dupliquen.
2. **Endpoint batch con upsert** — `POST /api/grades/batch` inserta o actualiza por clave única (student_id, subject_id, period_id). Los registros sin ningún valor en las 5 columnas se ignoran: un campo vacío no sobrescribe datos existentes.
3. **Cuadrícula reutiliza el GET de alumnos** — Se mantiene el filtrado actual (año, periodo, materia, sección) y se enriquece cada fila con la nota existente si la hay.
4. **Backward compatible** — El formulario individual (editar/nuevo alumno) permanece intacto.

## Task List

### Phase 1: Backend - fórmula compartida
- [ ] Task A: Crear `backend/utils/gradeAverage.js` (fórmula extraída) y delegar en `createOrUpdateGrade`

### Phase 2: Backend - endpoint de lote
- [ ] Task B: `createOrUpdateGradesBatch` + ruta `POST /api/grades/batch`

### Checkpoint: Backend
- [ ] Upsert funciona con roles correctos; 401/400 verificados.

### Phase 3: Frontend - cuadrícula editable
- [ ] Task C: Cuadrícula general en `frontend/src/pages/Grades.jsx` con guardado en lote

### Checkpoint: Completo
- [ ] Build y lint pasan; flujo e2e verificado.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extraer la fórmula rompe el promedio actual | Med | Refactorizar y comparar resultado con el cálculo previo sin cambios de comportamiento |
| Cuadrícula grande lenta | Bajo | Solo se renderiza bajo filtros de periodo+materia+sección; sin paginación si la sección es pequeña |
| Guardado vacío borra notas | Med | Los registros sin valores se descartan en backend antes del upsert |

## Open Questions

- Ninguna pendiente.
