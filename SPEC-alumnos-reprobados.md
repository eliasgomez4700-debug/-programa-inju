# Spec: Apartado Alumnos Reprobados

## Objective

Crear un nuevo apartado **"Alumnos Reprobados"** en el sistema INJU donde se registran los alumnos que, al momento de ejecutar el Cierre del Sistema, tengan un promedio final menor a 6.0.

Estos alumnos **repiten el grado**: no son promovidos, permanecen en el mismo grado y sección, y quedan registrados en la lista de reprobados del año académico que reprueban.

- **Usuario objetivo:** director, subdirector y secretaria (visualizar); director y subdirector (administrar lista).
- **Éxito:** al ejecutar el cierre, el sistema detecta automáticamente a los reprobados, los registra y no los promueve. El apartado muestra la lista histórica por año académico con su promedio final.

## Decisiones aprobadas (confirmadas con el usuario)

| Pregunta | Decisión |
|---|---|
| ¿Cómo se determina? | Automático por el sistema: promedio final general < 6.0 |
| ¿Qué pasa con el alumno reproducido? | Repite el grado: mismo grado y sección, no promovido |
| ¿Quiénes tienen acceso? | Director, Subdirector y Secretaria |

## Tech Stack

- Backend: Node.js + Express 5 + MySQL (mysql2/promise), ES modules.
- Frontend: React 19 + Vite + React Router.
- Auth: JWT con roles `director`, `subdirector`, `secretaria`, `profesor`.

## Commands

```
Instalar deps:   npm run install:all
BD (crear tabla): npm run db:init --prefix backend
Dev (ambos):     npm run dev
Dev backend:     npm run backend
Dev frontend:    npm run frontend
Build:           npm run build --prefix frontend
Lint:            npm run lint --prefix frontend
```

No hay framework de tests en el proyecto. La verificación será manual + build + lint.

## Project Structure

```
backend/
├── controllers/
│   ├── reprobado.controller.js   → NUEVO (CRUD + lógica de reprobados)
│   ├── systemClosure.controller.js → MODIFICADO (integra reprobados al cierre)
│   └── grade.controller.js        → MODIFICADO (reuso del cálculo de promedio)
├── utils/
│   └── finalAverage.js            → NUEVO (utilitario compartido promedio final)
├── routes/
│   └── reprobado.routes.js        → NUEVO
├── db/init.js                     → MODIFICADO (nueva tabla reprobados)
└── server.js                      → MODIFICADO (montar nueva ruta)
frontend/
└── src/
    ├── pages/AlumnosReprobados.jsx → NUEVO
    ├── App.jsx                     → MODIFICADO (ruta)
    └── components/Sidebar.jsx      → MODIFICADO (enlace)
```

## Modelo de Datos

Nueva tabla `reprobados` (un registro por alumno y año académico):

```sql
CREATE TABLE IF NOT EXISTS reprobados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  academic_year_id INT NOT NULL,
  grado INT NOT NULL,
  seccion_id INT,
  promedio_final DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE,
  FOREIGN KEY (seccion_id) REFERENCES sections(id) ON DELETE SET NULL,
  UNIQUE KEY unique_reprobado (student_id, academic_year_id)
);
```

## Comportamiento del Cierre (backward-compatible, con nueva rama)

En `closeSystem`, para **cada estudiante activo**:

1. **Calcular promedio final** del año a cerrar (reusando la lógica de `calculateFinalAverage`: promedio de materias básicas + módulos, con override de `recovery_grades` cuando `nf > 0`).
2. **Si promedio < 6.0 → reprobado:**
   - Insertar en `reprobados` (año actual, grado, sección, promedio).
   - NO promover: `students.grado` y `students.seccion_id` se mantienen iguales.
   - `students.academic_year_id` pasa al año siguiente (sigue `activo`).
   - `academic_records` año actual → estado `'reprobado'` con promedio_final.
   - `academic_records` año siguiente → estado `'cursando'`, mismo grado (si no existe).
   - **Prioridad sobre egresados**: si un alumno está en el grado máximo y reprobó, repite (no egresa).
3. **Si promedio >= 6.0 → comportamiento actual** (promovido o egresado).

Casos límite:
- **Sin notas registradas** en el año a cerrar → se considera reprobado con promedio 0 (el director puede corregirlo/eliminarlo desde el apartado).
- Alumno en grado máximo que reprueba → repite el grado (no egresa).

Decisiones finales:
- **PDF:** NO se incluye exportación en esta fase.
- **Cálculo:** directo y automático (una sola operación transaccional en el cierre, sin vista previa de confirmación).

## API

```
GET    /api/reprobados                  Lista de reprobados
       Query: academic_year_id, grado, seccion_id, search, page, limit
GET    /api/reprobados/find-average     Calcula promedios finales de todos los
                                        activos del año (para vista previa)  [solo director, subdirector]
DELETE /api/reprobados/:id              Elimina un registro de la lista (corrección manual)
       [solo director, subdirector]
```

Roles: lectura para `director`, `subdirector`, `secretaria`; borrado para `director`, `subdirector`.

## Página React (AlumnosReprobados)

- Lista en tabla: Nombre, Apellido, Género, Grado, Sección, Promedio Final, Año Académico.
- Filtros: por año académico, por sección/grado, búsqueda por nombre.
- Botón "Eliminar" (visible solo a director/subdirector) con confirmación.
- Ruta `/alumnos-reprobados`, enlace en el Sidebar (sección de director/subdirector/secretaria).
- Estilos reutilizando las clases existentes (`table-container`, `badge`, `card`, `alert`).

## Code Style

Misma convención que los controllers existentes (ES modules, `next(err)`, pool):

```js
export const getReprobados = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.*, st.nombre, st.apellido, s.nombre as seccion_nombre, ay.año
       FROM reprobados r
       JOIN students st ON r.student_id = st.id
       LEFT JOIN sections s ON r.seccion_id = s.id
       LEFT JOIN academic_years ay ON r.academic_year_id = ay.id
       WHERE 1=1`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};
```

Convenciones:
- Nombres de tablas/formularios en descriptivo en español (`reprobados`), columnas `snake_case`.
- Rutas bajo `/api/<recurso>`.
- Validar entrada y devolver 400/404 con `{ message }`.
- Frontend con componentes funcionales, hooks (useState/useEffect), llamadas a `API` desde `../api/axios`.

## Testing Strategy

- No existe marco de pruebas en el proyecto; se valida manualmente:
  1. `npm run db:init --prefix backend` crea la tabla.
  2. Cierre del sistema: alumnos con promedio < 6 quedan reprobados (no promovidos), lista poblada.
  3. Route/página visibles según rol.
  4. `npm run build --prefix frontend` y `npm run lint --prefix frontend` sin errores.
- (Pendiente de decisión del usuario si se desea incorporar un framework de tests — see Boundaries).

## Boundaries

- Always:
  - Validar entradas en nuevos endpoints.
  - Mantener transaccional el cierre (rollback si algo falla).
  - Usar parametrización de queries (SQL injection-safe).
- Ask first:
  - Agregar un framework de test al proyecto.
  - Cambiar la escala numérica de aprobación (6.0).
  - Modificar el comportamiento existente de promoción de aprobados.
- Never:
  - Comprometer credenciales/secrets.
  - Promover a un reprobado.
  - Eliminar registros de `academic_records` históricos.

## Success Criteria

- [ ] Ejecutar `npm run db:init` crea la tabla `reprobados`.
- [ ] En el cierre, un alumno con promedio < 6.0 queda registrado en `reprobados`, su `grado`/`seccion_id` no cambian, y su `academic_records` del año queda `reprobado`.
- [ ] Un alumno aprobado sigue promoviéndose/egresando igual que antes.
- [ ] Un alumno en grado máximo que reprueba repite y no egresa.
- [ ] `/api/reprobados` devuelve la lista con filtros y solo para los roles permitidos.
- [ ] La página `AlumnosReprobados` se ve en el Sidebar solo para director/subdirector/secretaria.
- [ ] Director/subdirector pueden eliminar un registro manualmente.
- [ ] `npm run build` y `npm run lint` pasan sin errores.

## Open Questions

- ¿Desea el usuario también un botón para **exportar/imprimir la lista en PDF** (como otras listas del sistema)? (se puede añadir en una fase posterior)
- ¿El calculo del promedio debe **sobrescribir** el estado de `academic_records` de todos los activos al cerrar (consumo puede ser notable con muchos alumnos) o primero mostrar vista previa para confirmar?