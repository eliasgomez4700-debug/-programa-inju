# Spec: Cuadrícula de Carga Masiva de Notas

## Objective

El apartado **Notas** hoy obliga a ingresar notas **alumno por alumno** (formulario individual). Se quiere cambiar a un modo **cuadrícula general** en el que, con el año, periodo y materia seleccionados, aparezca una tabla con **todos los alumnos de la sección** y celdas editables para Nota1, Nota2, Nota3, Rec, Ref + Promedio calculado en vivo, guardándose todo en lote con un solo botón.

Usuario: director, subdirector y profesor (cada uno sobre sus secciones/materias).

Éxito: cargar/modificar notas de toda una sección en una sola vista y un solo guardado, sin navegar alumno por alumno.

## Decisions (aprobadas)

1. **Alcance de la cuadrícula**: al seleccionar año + periodo + materia + sección, la cuadrícula muestra **todos los alumnos activos de esa sección**. Quienes ya tienen notas las ven pre-cargadas (editables); los demás aparecen con celdas vacías.
2. **Campos vacíos al guardar**: los registros sin ningún valor en las 5 columnas se **ignoran**; un campo vacío **no sobrescribe** el valor guardado (evita borrado accidental).
3. **Columnas**: Nota1, Nota2, Nota3, Rec, Ref (editables) + Promedio (calculado en vivo, read-only).
4. **Guardado en lote**: un nuevo endpoint `POST /api/grades/batch` hace upsert (INSERT ... ON DUPLICATE KEY UPDATE) de todos los registros llenos, reutilizando la misma fórmula de promedio (35/35/30 + override de recuperación).

## Tech Stack

- Backend: Node.js + Express 5 + MySQL (mysql2/promise) — ES modules
- Frontend: React 19 + Vite (sin librerías nuevas)

## Commands

```
Build:   npm run build --prefix frontend
Lint:    npm run lint --prefix frontend
Dev:     npm run dev
```

## Project Structure

```
backend/
  controllers/grade.controller.js   → + createOrUpdateGradesBatch (nuevo handler)
  routes/grade.routes.js            → + POST /batch
  utils/gradeAverage.js             → fórmula de promedio extraída y compartida (nuevo)
frontend/
  src/pages/Grades.jsx              → cuadrícula editable en lote
```

## Code Style

- ES modules, named exports en controllers y utils.
- Manejo de errores con `try/catch + next(err)`; respuestas JSON `{ message }`.
- React con hooks (`useState/useEffect`), API axios compartido (`src/api/axios.js`).
- Sin librerías nuevas; estilos con clases CSS existentes (`.card`, `.table-container`, `.btn`, `.filters`).

Fórmula de promedio (extraer a `backend/utils/gradeAverage.js`):

```js
export const computeGradeAverage = (n1, n2, n3, rec, ref) => {
  const regular = (n1 * 0.35) + (n2 * 0.35) + (n3 * 0.30);
  if (regular >= 6) return parseFloat(regular.toFixed(2));
  if ((rec || 0) === 0 && (ref || 0) === 0) return parseFloat(regular.toFixed(2));
  const notaRec = ((rec || 0) + (ref || 0)) / 2;
  if (notaRec >= 6) return 6;
  return parseFloat(notaRec.toFixed(2));
};
```

## Testing Strategy

- Sin suite de tests automatizada en el proyecto: se valida con `npm run build --prefix frontend`, `npm run lint --prefix frontend` y peticiones curl al backend.
- Verificación manual end-to-end sobre BD real (registrar una sección completa en un guardado).

## Boundaries

- Always: reutilizar la fórmula de promedio existente; ignorar registros vacíos en el batch; validar student_id/subject_id/period_id; restringir el batch a los roles que ya pueden crear notas (director, profesor).
- Ask first: cambios de esquema de BD (no se requieren para esta feature), nuevas dependencias.
- Never: comprometer secretos; borrar datos por un guardado vacío; duplicar lógica de promedio.

## Success Criteria

1. Con año + periodo + materia + sección seleccionados, la página muestra la cuadrícula con todos los alumnos de la sección.
2. Cada fila tiene Nota1/Nota2/Nota3/Rec/Ref editables y Promedio calculado en vivo.
3. Un botón **Guardar** persiste en lote; las filas sin valor no envían cambios.
4. Las notas guardadas quedan visibles al recargar y en los reportes/boletas existentes (misma tabla `grades`).
5. `POST /api/grades/batch` responde 401 sin token y 400 si `registros` no es array.
6. Build y lint del frontend pasan sin errores.
7. El modo alumno por alumno (editar/crear individual) sigue funcionando igual.

## Open Questions

- Ninguna pendiente.