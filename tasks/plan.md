# Implementation Plan: Apartado Alumnos Reprobados

## Overview

Agregar el apartado **Alumnos Reprobados** al sistema INJU. Al ejecutar el Cierre del Sistema, cada alumno activo con promedio final < 6.0 queda registrado en una nueva tabla `reprobados` y **repite el grado** (no es promovido, permanece en el mismo grado/sección). Se añade una página React con la lista histórica por año académico, filtros y borrado manual para director/subdirector.

Especificación: `SPEC-alumnos-reprobados.md`.

## Architecture Decisions

1. **Cálculo del promedio reutilizado** — Extraer la lógica de cálculo del promedio final (que hoy vive en `calculateFinalAverage` de `grade.controller.js`) a un utilitario compartido `utils/finalAverage.js`, para que el cierre lo reutilice sin duplicar código.
2. **Nueva tabla `reprobados`** — Registro por alumno y año académico (clave única `student_id + academic_year_id`), guardando grado, sección y promedio final en el momento del cierre. No modifica las tablas existentes.
3. **Integración transaccional en el cierre** — Dentro de la transacción existente de `closeSystem`, se agrega una rama "reprobado". Los aprobados conservan su comportamiento actual (promovido/egresado).
4. **Backward compatible** — Si no hay notas registradas para un alumno, se considera reprobado con promedio 0 (el director puede eliminarlo/corregirlo desde el apartado).

## Task List

### Phase 1: Base de datos
- [ ] Task 1: Agregar tabla `reprobados` a `backend/db/init.js`

### Phase 2: Backend - utilitario y endpoints
- [ ] Task 2: Crear utilitario `backend/utils/finalAverage.js` (extraído del cálculo de `grade.controller.js`)
- [ ] Task 3: Crear `backend/controllers/reprobado.controller.js` (GET lista + DELETE)
- [ ] Task 4: Crear `backend/routes/reprobado.routes.js` y montarla en `server.js`

### Checkpoint: Backend base listo
- [ ] La tabla se crea con `db:init`, los endpoints responden con los roles correctos.

### Phase 3: Backend - integración con el cierre
- [ ] Task 5: Modificar `closeSystem` para detectar reprobados, no promoverlos y registrarlos

### Checkpoint: Cierre
- [ ] Al cerrar, un alumno con promedio < 6 queda reprobado (no promovido) y registrado.

### Phase 4: Frontend
- [ ] Task 6: Crear página `frontend/src/pages/AlumnosReprobados.jsx` (lista + filtros + eliminar)
- [ ] Task 7: Agregar ruta en `App.jsx` y enlace en `Sidebar.jsx`

### Checkpoint: Completo
- [ ] Build y lint pasan; flujo end-to-end verificado manualmente.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Extraer el cálculo de promedio rompe `calculateFinalAverage` | Med | Refactorizar con cuidado y probar el endpoint existente tras el cambio |
| Cierre con muchos alumnos puede ser lento (cálculo por alumno) | Bajo | Se mantiene dentro de la transacción existente; el usuario aceptó el modo directo automático |
| Caso "sin notas": alumno se marca reprobado con 0 | Bajo | Documentado; el director puede eliminar/corregir desde el apartado |

## Open Questions

- Ninguna pendiente (decisiones aprobadas en `SPEC-alumnos-reprobados.md`).
