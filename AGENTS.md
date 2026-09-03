# Agent Skills - Sistema de Control de Notas INJU

Este proyecto utiliza skills instalados bajo `.opencode/skills/` para garantizar calidad de código y buenas prácticas de ingeniería.

## Stack del Proyecto

- **Backend:** Node.js + Express 5 + MySQL (mysql2/promise)
- **Frontend:** React 19 + Vite + React Router
- **PDF:** PDFKit para boletas de calificaciones
- **Auth:** JWT + bcryptjs
- **Roles:** director, subdirector, secretaria, profesor

## Reglas Core

- Si una tarea coincide con un skill, invócalo con el tool `skill` antes de actuar.
- Los skills están en `.opencode/skills/<skill-name>/SKILL.md`.
- Sigue el workflow del skill estrictamente; no lo apliques parcialmente.
- Nunca saltes pasos requeridos como spec, plan o test cuando un skill lo exija.

## Mapeo de Intención → Skill

| Intención del Usuario | Skill a Usar |
|----------------------|--------------|
| Nueva funcionalidad | `spec-driven-development`, luego `incremental-implementation` y `test-driven-development` |
| Planificación / desglose | `planning-and-task-breakdown` |
| Bug / error / comportamiento inesperado | `debugging-and-error-recovery` |
| Revisión de código | `code-review-and-quality` |
| Refactorización / simplificación | `code-simplification` |
| Diseño de API o interfaz | `api-and-interface-design` |
| Trabajo en UI/React | `frontend-ui-engineering` |
| Seguridad / datos sensibles | `security-and-hardening` |
|-control de versiones | `git-workflow-and-versioning` |

## Estructura del Proyecto

```
PROGRAMA_INJU/
├── backend/
│   ├── controllers/    # 16 controllers (auth, grades, students, etc.)
│   ├── routes/         # 16 rutas API
│   ├── config/db.js    # Conexión MySQL
│   ├── db/init.js      # Inicialización de BD
│   └── server.js       # Express server
├── frontend/
│   └── src/
│       ├── pages/      # 21 páginas React
│       ├── components/ # Layout, Sidebar, PrivateRoute
│       └── api/        # Axios config
└── .opencode/skills/   # Skills de ingeniería
```

## Modelos de Datos Principales

- **users** - Usuarios con roles (director, subdirector, secretaria, profesor)
- **students** - Estudiantes con sección, grado y estado
- **grades** - Notas por materia, periodo (nota1, nota2, nota3, recuperación, promedio)
- **module_grades** - Notas de módulos (preparación, ejecución, evaluación)
- **attendance** - Asistencia diaria (presente, ausente, justificado)
- **attitude_reports** - Evaluaciones actitudinales
- **recovery_grades** - Notas de recuperación

## Convenciones del Proyecto

- Backend usa ES modules (`type: "module"` en package.json)
- Frontend usa Vite con React
- Las rutas API siguen el patrón `/api/<recurso>`
- Los controllers manejan la lógica de negocio
- La BD usa `utf8mb4_unicode_ci` para soporte de caracteres especiales

## Ejecución

Para cada solicitud:

1. Determina si aplica algún skill (incluso con baja probabilidad).
2. Carga el skill con `skill({ name: "<skill-name>" })`.
3. Sigue el workflow del skill exactamente.
4. Solo procede a implementación una vez completados los pasos requeridos.
