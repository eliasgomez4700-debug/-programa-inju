# Implementation Plan: Cuadrícula de Carga Masiva de Notas de Módulo

## Overview

Replicar en el apartado **Notas de Módulo** el modo cuadrícula ya existente en Notas: con año académico + materia de módulo + sección seleccionados, una tabla con todos los alumnos de la sección y celdas editables para las 9 notas (PREP/EJE/EVAL x3), promedio y nivel de logro en vivo, y guardado en lote con un solo botón.

Especificación: `SPEC-cuadricula-notas-modulo.md`.

## Architecture Decisions

1. **Fórmula compartida** — Extraer los cálculos de promedio y nivel de logro de módulo a `backend/utils/moduleGradeAverage.js`, para que el endpoint individual y el batch no los dupliquen (misma estrategia que `gradeAverage.js` en notas básicas).
2. **Endpoint batch con upsert** — `POST /api/module-grades/batch` inserta o actualiza por clave única `(student_id, subject_id, academic_year_id)`. Los registros sin ningún valor en las 9 columnas se ignoran: un campo vacío no sobrescribe datos existentes.
3. **Cuadrícula reutiliza el GET de alumnos** — Igual patrón que `Grades.jsx`: se mantiene el filtrado actual y se enriquece cada fila con la nota existente si la hay.
4. **Backward compatible** — El formulario individual (editar/nuevo alumno) permanece intacto; la cuadrícula de notas básicas no se toca.

## Task List

### Phase 1: Backend - fórmula compartida
- [ ] Task A: Crear `backend/utils/moduleGradeAverage.js` con la fórmula módulo y delegar en `createOrUpdateModuleGrade`
  - Acceptance: exporta `computeModuleGrade(...)` (promedio y nivel de logro) igual a los cálculos actuales.
  - Verify: `npm test --prefix backend` pasa; el endpoint individual produce idéntico resultado.
  - Files: `backend/utils/moduleGradeAverage.js`, `backend/utils/moduleGradeAverage.test.js`, `backend/controllers/moduleGrade.controller.js`

### Phase 2: Backend - endpoint de lote
- [ ] Task B: `createOrUpdateModuleGradesBatch` + ruta `POST /api/module-grades/batch`
  - Acceptance: `{ registros: [...] }`, ignora registros sin valores, upsert por clave única, calcula promedio/nivel con el util.
  - Verify: 401 sin token; 400 si `registros` no es array; guardado verificado con curl.
  - Files: `backend/controllers/moduleGrade.controller.js`, `backend/routes/moduleGrade.routes.js`

### Checkpoint: Backend
- [ ] Endpoint de lote responde con roles correctos y upsert funciona.

### Phase 3: Frontend - cuadrícula editable
- [ ] Task C: Cuadrícula en `frontend/src/pages/ModuleGrades.jsx`
  - Acceptance: al elegir año + materia de módulo + sección muestra todos los alumnos de la sección con 9 columnas editables (pre-cargadas si existen), promedio y nivel en vivo, botón Guardar en lote; los campos vacíos no envían cambios; el modo individual se conserva.
  - Verify: `npm run build --prefix frontend` y `npm run lint --prefix frontend` sin errores; prueba visual/manual.
  - Files: `frontend/src/pages/ModuleGrades.jsx`

## Checkpoint: Completo
- [ ] Build y lint pasan; flujo e2e verificado sobre BD real.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extraer la fórmula rompe el promedio de módulo | Med | Refactorizar y comparar resultado con el cálculo previo sin cambios de comportamiento |
| Cuadrícula de 9 columnas por alumno + muchos alumnos es ancha | Bajo | `table-container` con scroll horizontal ya existente |
| Guardado vacío borra notas | Med | Los registros sin valores se descartan en backend antes del upsert |

## Open Questions

- Ninguna pendiente.