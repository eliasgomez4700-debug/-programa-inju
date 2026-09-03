# Todo: Apartado Alumnos Reprobados

Plan: `plan.md`

## Phase 1: Base de datos

- [ ] Task 1: Agregar tabla `reprobados` a `backend/db/init.js`
  - Acceptance: existe `CREATE TABLE IF NOT EXISTS reprobados` con student_id, academic_year_id, grado, seccion_id, promedio_final y clave única (student_id, academic_year_id).
  - Verify: `npm run db:init --prefix backend` crea la tabla sin errores; `SHOW TABLES` la incluye.
  - Files: `backend/db/init.js`

## Phase 2: Backend - utilitario y endpoints

- [ ] Task 2: Crear utilitario `backend/utils/finalAverage.js`
  - Acceptance: exporta una función que, dado student_id y academic_year_id, devuelve el promedio final y estado, reutilizando la lógica actual de `calculateFinalAverage` (básicas + módulos + override de recovery).
  - Verify: `calculateFinalAverage` en grade.controller.js delega en el utilitario y sigue respondiendo igual.
  - Files: `backend/utils/finalAverage.js`, `backend/controllers/grade.controller.js`

- [ ] Task 3: Crear `backend/controllers/reprobado.controller.js`
  - Acceptance: endpoints `GET` (lista con filtros academic_year_id, grado, seccion_id, search, paginación) y `DELETE /:id` con validación 404.
  - Verify: manual con curl / roles (ver: director/subdirector/secretaria; borrar: director/subdirector).
  - Files: `backend/controllers/reprobado.controller.js`

- [ ] Task 4: Crear `backend/routes/reprobado.routes.js` y montarla en `server.js`
  - Acceptance: ruta `/api/reprobados` configurada con authenticate + authorize según rol.
  - Verify: `GET /api/reprobados` responde 401 sin token y 200 con token válido.
  - Files: `backend/routes/reprobado.routes.js`, `backend/server.js`

## Checkpoint: Backend base listo
- [ ] Tabla creada, endpoints responden con roles correctos.

## Phase 3: Backend - integración con el cierre

- [ ] Task 5: Modificar `closeSystem` para detectar reprobados y no promoverlos
  - Acceptance: alumno con promedio < 6.0 → insert en `reprobados` (año actual), no cambia grado/seccion, academic_records año actual = 'reprobado' con promedio, academic_records año siguiente = 'cursando' mismo grado (si no existe); aprobados/egresados mantienen comportamiento actual.
  - Verify: ejecutar cierre con datos de prueba; alumno reprobado queda listado y conserva grado/sección.
  - Files: `backend/controllers/systemClosure.controller.js`

## Checkpoint: Cierre
- [ ] Alumno reprobado no es promovido y queda registrado.

## Phase 4: Frontend

- [ ] Task 6: Crear página `frontend/src/pages/AlumnosReprobados.jsx`
  - Acceptance: tabla con nombre, apellido, género, grado, sección, promedio, año; filtros (año académico, búsqueda); botón eliminar visible solo a director/subdirector con confirmación.
  - Verify: `npm run build --prefix frontend` y `npm run lint --prefix frontend` sin errores; revisar visualmente.
  - Files: `frontend/src/pages/AlumnosReprobados.jsx`

- [ ] Task 7: Ruta en `App.jsx` y enlace en `Sidebar.jsx`
  - Acceptance: ruta `/alumnos-reprobados` protegida para director/subdirector/secretaria; enlace visible para esos roles.
  - Verify: navegar al apartado con cada rol; acceso denegado a profesor.
  - Files: `frontend/src/App.jsx`, `frontend/src/components/Sidebar.jsx`

## Checkpoint: Completo
- [x] Build y lint pasan.
- [ ] Flujo end-to-end verificado manualmente (requiere ejecutar el Cierre contra la BD real — pendiente de aprobación).
- [x] Revisión de calidad (code-review): aprobada sin issues críticos.
