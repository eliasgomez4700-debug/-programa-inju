# Spec: Cuadrícula de Carga Masiva de Notas de Módulo

## Objective

El apartado **Notas de Módulo** obliga a ingresar notas **alumno por alumno**. Se quiere replicar el modo **cuadrícula general** ya existente para notas básicas: con año académico, materia de módulo y sección seleccionados, aparece una tabla con **todos los alumnos de la sección** y celdas editables para las 9 notas (Preparación 1/2/3, Ejecución 1/2/3, Evaluación 1/2/3), con **promedio y nivel de logro calculados en vivo**, guardándose todo en lote con un solo botón.

Usuario: director, subdirector y profesor (cada uno sobre sus secciones/materias).

Éxito: cargar/modificar notas de módulo de toda una sección en una sola vista y un solo guardado, sin navegar alumno por alumno.

## Decisions (aprobadas)

1. **Alcance de la cuadrícula**: al seleccionar año académico + materia de módulo + sección, muestra **todos los alumnos activos de esa sección**. Quienes ya tienen notas las ven pre-cargadas (editables); los demás aparecen con celdas vacías.
2. **Columnas**: Preparación (Nota1/Nota2/Nota3), Ejecución (Nota1/Nota2/Nota3), Evaluación (Nota1/Nota2/Nota3) — 9 celdas editables — + Promedio y Nivel de Logro (calculados en vivo, read-only).
3. **Campos vacíos al guardar**: los registros sin ningún valor en las 9 columnas se **ignoran**; un campo vacío **no sobrescribe** el valor guardado (evita borrado accidental). El comportamiento es idéntico a la cuadrícula de notas básicas.
4. **Guardado en lote**: un nuevo endpoint `POST /api/module-grades/batch` hace upsert (antes SELECT + INSERT/UPDATE) por la clave única `(student_id, subject_id, academic_year_id)`, reutilizando los mismos cálculos del endpoint individual: promedio de fase /3, promedio final `PREP*0.25 + EJE*0.50 + EVAL*0.25`, y `nivel_logro` por rango.
5. **Sin cambios de BD ni de la cuadrícula existente de notas básicas.**

## Tech Stack

- Backend: Node.js + Express 5 + MySQL (mysql2/promise) — ES modules
- Frontend: React 19 + Vite (sin librerías nuevas)

## Commands

```
Build:   npm run build --prefix frontend
Lint:    npm run lint --prefix frontend
Test:    npm test --prefix backend
Dev:     npm run dev
```

## Project Structure

```
backend/
  controllers/moduleGrade.controller.js → + createOrUpdateModuleGradesBatch (nuevo handler)
  routes/moduleGrade.routes.js          → + POST /batch
frontend/
  src/pages/ModuleGrades.jsx            → cuadrícula editable en lote
```

## Code Style

- ES modules, named exports en controllers y utils.
- Manejo de errores con `try/catch + next(err)`; respuestas JSON `{ message }`.
- React con hooks (`useState/useEffect`), API axios compartido (`src/api/axios.js`).
- Sin librerías nuevas; estilos con clases CSS existentes (`.card`, `.table-container`, `.btn`, `.filters`).
- Se reutilizan los helpers locales del controller (`calcularPromedioFase`, `obtenerNivelLogro`); sin duplicar lógica.

Fórmula (la misma que ya usa el endpoint individual):

```js
const promPreparacion = ((p1)+(p2)+(p3)) / 3;
const promEjecucion    = ((e1)+(e2)+(e3)) / 3;
const promEvaluacion   = ((v1)+(v2)+(v3)) / 3;
const promedio = (promPreparacion * 0.25 + promEjecucion * 0.50 + promEvaluacion * 0.25);
// nivel_logro: >=9→5, >=7→4, >=5→3, >=3→2, si no 1
```

## Testing Strategy

- Sin suite automatizada para el frontend: se valida con `npm run build --prefix frontend` y `npm run lint --prefix frontend`.
- Backend: se incluye un test unitario `node --test` de la fórmula de promedio/nivel de módulo (extraída a `backend/utils/moduleGradeAverage.js`) para probarla en aislamiento y reutilizarla en el batch.
- Verificación manual end-to-end sobre BD real (guardar una sección completa en un solo guardado y recargar).

## Boundaries

- Always: reutilizar los mismos cálculos del endpoint individual; ignorar registros vacíos en el batch; validar student_id/subject_id/academic_year_id; restringir el batch a los roles que ya pueden crear notas de módulo (director, profesor).
- Ask first: cambios de esquema de BD (no se requieren), nuevas dependencias.
- Never: comprometer secretos; borrar datos por un guardado vacío; duplicar lógica de promedio.

## Success Criteria

1. Con año académico + materia de módulo + sección seleccionados, la página muestra la cuadrícula con todos los alumnos de la sección.
2. Cada fila tiene 9 campos editables (PREP 1/2/3, EJE 1/2/3, EVAL 1/2/3) y Promedio + Nivel de Logro calculados en vivo.
3. Un botón **Guardar** persiste en lote; las filas sin valor no envían cambios.
4. Las notas guardadas quedan visibles al recargar y en los reportes/boletas existentes (misma tabla `module_grades`).
5. `POST /api/module-grades/batch` responde 401 sin token y 400 si `registros` no es array.
6. Build y lint del frontend pasan sin errores.
7. El modo alumno por alumno (editar/crear individual) sigue funcionando igual.
8. La cuadrícula de notas básicas no se modifica.

## Open Questions

- Ninguna pendiente.