# Cambios en el PDF de Boleta de Calificaciones

**Archivo modificado:** `backend/controllers/pdfReport.controller.js`

## Cambios realizados (23 jul 2026)

### 1. Nuevo diseño del PDF
- Encabezado MINED (Ministerio de Educación)
- Celdas con borde usando función `drawCell()`
- Información general (sede, servicio educativo, plan de estudios)
- Cuadro de asistencias
- Tabla de módulos con escala 1-5
- Tabla de materias básicas con 4 periodos
- Evaluaciones actitudinales integradas
- Pie de página con timestamp SIGES

### 2. Cuadro de asistencias (traído de BD)
- Query a tabla `attendance` con estados: `presente`, `justificado`, `ausente`
- Valores dinámicos en vez de hardcodeados

### 3. NF de Módulos (escala 1-5)
- Usa `mg.nivel_logro` directamente de la BD
- Escala calculada en `moduleGrade.controller.js`:
  - 5 = Promedio >= 9.0
  - 4 = Promedio >= 7.0
  - 3 = Promedio >= 5.0
  - 2 = Promedio >= 3.0
  - 1 = Promedio < 3.0

### 4. Fix NaN en Materias Básicas
- Función `toNum()` para convertir valores de forma segura
- Manejo de `null`, `undefined`, valores no numéricos

### 5. Fix Resultado en Materias Básicas
- Ahora muestra 'Aprobado' cuando nfVal >= 6
- Muestra 'Reprobado' cuando nfVal < 6
- Muestra '-' cuando no hay notas

## Pendiente
- [ ] Revisar otros ajustes del PDF
- [ ] Verificar funcionamiento completo
