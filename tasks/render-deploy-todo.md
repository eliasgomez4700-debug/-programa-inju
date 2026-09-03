# Todo: Despliegue en Render

Plan: `render-deploy.md`

## Phase 1: Preparación del Código

- [x] Task 1: Modificar `backend/server.js` para servir archivos estáticos
  - Acceptance: Express sirve archivos de `frontend/dist/` y catch-all para React Router
  - Verify: `node backend/server.js` inicia sin errores
  - Files: `backend/server.js`

- [x] Task 2: Actualizar scripts en `package.json`
  - Acceptance: scripts `build` y `start` configurados para Render
  - Verify: `npm run build` completa exitosamente
  - Files: `package.json`

- [x] Task 3: Crear `render.yaml`
  - Acceptance: configuración de infraestructura para Render
  - Verify: archivo existe con configuración correcta
  - Files: `render.yaml`

## Checkpoint: Código listo para Render
- [x] Build funciona localmente
- [x] Servidor sirve frontend y backend

## Phase 2: Configuración en Render

- [ ] Task 4: Crear cuenta en Render (si no existe)
  - Acceptance: cuenta activa en render.com
  - Verify: puedes acceder al dashboard

- [ ] Task 5: Conectar repositorio GitHub
  - Acceptance: repositorio `programa-inju` conectado a Render
  - Verify: Render puede ver el código

- [ ] Task 6: Configurar Web Service
  - Acceptance: servicio creado con:
    - Build Command: `npm install && npm run build`
    - Start Command: `npm start`
  - Verify: Render muestra el servicio

- [ ] Task 7: Configurar Variables de Entorno
  - Acceptance: todas las variables configuradas (ver render-deploy.md)
  - Verify: variables visibles en el dashboard

- [ ] Task 8: Primer deploy
  - Acceptance: deploy completa sin errores
  - Verify: URL de Render muestra la app

## Checkpoint: App desplegada
- [ ] URL de Render funciona
- [ ] Login funciona

## Phase 3: Verificación

- [ ] Task 9: Probar flujo completo
  - Acceptance: login, navegación, API funcionan
  - Verify: usuario puede usar la app

- [ ] Task 10: Verificar conexión a BD
  - Acceptance: datos se guardan en Railway
  - Verify: crear un registro y verlo en la BD

## Checkpoint: Completo
- [ ] App funciona en Render
- [ ] BD funciona en Railway
- [ ] No hay errores en consola

## Notas

- La URL de Render cambiará después del deploy
- Actualizar `CORS_ORIGIN` con la URL real después del deploy
- El primer deploy puede tardar 3-5 minutos
