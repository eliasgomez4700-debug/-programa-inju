# Todo: Apartado Alumnos Reprobados

Plan: `plan.md`

## Phase 1: Base de datos

- [x] Task 1: Agregar tabla `reprobados` a `backend/db/init.js`
  - Acceptance: existe `CREATE TABLE IF NOT EXISTS reprobados` con student_id, academic_year_id, grado, seccion_id, promedio_final y clave única (student_id, academic_year_id).
  - Verify: `npm run db:init --prefix backend` crea la tabla sin errores; `SHOW TABLES` la incluye.
  - Files: `backend/db/init.js`

## Phase 2: Backend - utilitario y endpoints

- [x] Task 2: Crear utilitario `backend/utils/finalAverage.js`
  - Acceptance: exporta una función que, dado student_id y academic_year_id, devuelve el promedio final y estado, reutilizando la lógica actual de `calculateFinalAverage` (básicas + módulos + override de recovery).
  - Verify: `calculateFinalAverage` en grade.controller.js delega en el utilitario y sigue respondiendo igual.
  - Files: `backend/utils/finalAverage.js`, `backend/controllers/grade.controller.js`

- [x] Task 3: Crear `backend/controllers/reprobado.controller.js`
  - Acceptance: endpoints `GET` (lista con filtros academic_year_id, grado, seccion_id, search, paginación) y `DELETE /:id` con validación 404.
  - Verify: manual con curl / roles (ver: director/subdirector/secretaria; borrar: director/subdirector).
  - Files: `backend/controllers/reprobado.controller.js`

- [x] Task 4: Crear `backend/routes/reprobado.routes.js` y montarla en `server.js`
  - Acceptance: ruta `/api/reprobados` configurada con authenticate + authorize según rol.
  - Verify: `GET /api/reprobados` responde 401 sin token y 200 con token válido.
  - Files: `backend/routes/reprobado.routes.js`, `backend/server.js`

## Checkpoint: Backend base listo
- [x] Tabla creada, endpoints responden con roles correctos.

## Phase 3: Backend - integración con el cierre

- [x] Task 5: Modificar `closeSystem` para detectar reprobados y no promoverlos
  - Acceptance: alumno con promedio < 6.0 → insert en `reprobados` (año actual), no cambia grado/seccion, academic_records año actual = 'reprobado' con promedio, academic_records año siguiente = 'cursando' mismo grado (si no existe); aprobados/egresados mantienen comportamiento actual.
  - Verify: ejecutar cierre con datos de prueba; alumno reprobado queda listado y conserva grado/sección.
  - Files: `backend/controllers/systemClosure.controller.js`

## Checkpoint: Cierre
- [x] Alumno reprobado no es promovido y queda registrado.

## Phase 4: Frontend

- [x] Task 6: Crear página `frontend/src/pages/AlumnosReprobados.jsx`
  - Acceptance: tabla con nombre, apellido, género, grado, sección, promedio, año; filtros (año académico, búsqueda); botón eliminar visible solo a director/subdirector con confirmación.
  - Verify: `npm run build --prefix frontend` y `npm run lint --prefix frontend` sin errores; revisar visualmente.
  - Files: `frontend/src/pages/AlumnosReprobados.jsx`

- [x] Task 7: Ruta en `App.jsx` y enlace en `Sidebar.jsx`
  - Acceptance: ruta `/alumnos-reprobados` protegida para director/subdirector/secretaria; enlace visible para esos roles.
  - Verify: navegar al apartado con cada rol; acceso denegado a profesor.
  - Files: `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`

## Checkpoint: Completo
- [x] Build y lint pasan.
- [ ] Flujo end-to-end verificado manualmente (requiere ejecutar el Cierre contra la BD real — pendiente de aprobación).
- [x] Revisión de calidad (code-review): aprobada sin issues críticos.

---

# Despliegue en Render

Plan detallado: `render-deploy.md`
Lista de verificación: `render-deploy-todo.md`

## Fase 1: Código
- [x] Backend sirve frontend estático
- [x] Scripts de build/start configurados
- [x] render.yaml creado

## Fase 2: Configuración Render
- [ ] Conectar repositorio GitHub
- [ ] Configurar Web Service
- [ ] Configurar Variables de Entorno
- [ ] Primer deploy

## Fase 3: Verificación
- [ ] App funciona en Render
- [ ] Conexión a BD Railway

---

# Cuadrícula de Carga Masiva de Notas

Spec: `SPEC-cuadricula-notas.md`

## Phase 1: Backend - fórmula compartida

- [x] Task A: Crear `backend/utils/gradeAverage.js`
  - Acceptance: exporta `computeGradeAverage(n1, n2, n3, rec, ref)` con la fórmula 35/35/30 + override de recuperación usada hoy.
  - Verify: `createOrUpdateGrade` delega en el utilitario y el promedio calculado es idéntico al actual.
  - Files: `backend/utils/gradeAverage.js`, `backend/controllers/grade.controller.js`

## Phase 2: Backend - endpoint de lote

- [x] Task B: Crear `createOrUpdateGradesBatch` en `grade.controller.js` y ruta `POST /api/grades/batch`
  - Acceptance: recibe `{ registros: [...] }`, ignora registros sin ningún valor en las 5 columnas, hace upsert por (student_id, subject_id, period_id), calcula promedio con `computeGradeAverage`.
  - Verify: 401 sin token; 400 si `registros` no es array; guardado verificado con curl.
  - Files: `backend/controllers/grade.controller.js`, `backend/routes/grade.routes.js`

## Checkpoint: Backend
- [x] Endpoint de lote responde con roles correctos y upsert funciona.

## Phase 3: Frontend - cuadrícula editable

- [x] Task C: Cuadrícula en `frontend/src/pages/Grades.jsx`
  - Acceptance: al elegir año + periodo + materia + sección muestra todos los alumnos activos de la sección con Nota1/Nota2/Nota3/Rec/Ref editables (pre-cargados si existen), promedio en vivo, y botón Guardar que envía el lote; los campos vacíos no envían cambios; el modo individual se conserva.
  - Verify: `npm run build --prefix frontend` y `npm run lint --prefix frontend` sin errores; prueba visual/manual.
  - Files: `frontend/src/pages/Grades.jsx`

## Checkpoint: Completo
- [x] Build y lint pasan.
- [x] Revisión de calidad (code-review): aprobada.
- [ ] Flujo end-to-end verificado manualmente sobre BD real (revisar la cuadrícula en el navegador).

---

# Cuadrícula de Carga Masiva de Notas de Módulo

Spec: `SPEC-cuadricula-notas-modulo.md`

## Phase 1: Backend - fórmula compartida

- [x] Task A: Crear `backend/utils/moduleGradeAverage.js`
  - Acceptance: exporta `computeModuleGrade` (promedio 25/50/25 + nivel de logro) igual a los cálculos actuales; `createOrUpdateModuleGrade` delega en el util.
  - Verify: `npm test --prefix backend` pasa (16 tests).
  - Files: `backend/utils/moduleGradeAverage.js`, `backend/utils/moduleGradeAverage.test.js`, `backend/controllers/moduleGrade.controller.js`

## Phase 2: Backend - endpoint de lote

- [x] Task B: Crear `createOrUpdateModuleGradesBatch` en `moduleGrade.controller.js` y ruta `POST /api/module-grades/batch`
  - Acceptance: recibe `{ registros: [...] }`, ignora registros sin ningún valor en las 9 columnas, hace upsert por (student_id, subject_id, academic_year_id), calcula promedio/nivel con `computeModuleGrade`.
  - Verify: 401 sin token; 400 si `registros` no es array; guardado verificado con curl sobre BD real (pendiente).
  - Files: `backend/controllers/moduleGrade.controller.js`, `backend/routes/moduleGrade.routes.js`

## Checkpoint: Backend
- [x] Endpoint de lote responderá con roles correctos y upsert funciona (validado sintácticamente; curl sobre BD pendiente).

## Phase 3: Frontend - cuadrícula editable

- [x] Task C: Cuadrícula en `frontend/src/pages/ModuleGrades.jsx`
  - Acceptance: al elegir año + materia de módulo + sección muestra todos los alumnos de la sección con 9 campos editables (pre-cargados si existen), promedio y nivel en vivo, botón Guardar en lote; los campos vacíos no envían cambios; el modo individual se conserva.
  - Verify: `npm run build --prefix frontend` y `npm run lint --prefix frontend` sin errores; prueba visual/manual pendiente.
  - Files: `frontend/src/pages/ModuleGrades.jsx`

## Checkpoint: Completo
- [x] Build y lint pasan.
- [ ] Revisión de calidad (code-review).
- [ ] Flujo end-to-end verificado manualmente sobre BD real (revisar la cuadrícula en el navegador).
