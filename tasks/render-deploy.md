# Plan de Despliegue: Render + Railway

## Overview

Desplegar la aplicación completa (backend + frontend) en **Render**, manteniendo la base de datos en **Railway**.

## Arquitectura

```
Usuario → Render (backend + frontend) → Railway (base de datos MySQL)
```

## Decisiones

1. **Backend y frontend en un solo servicio** - Render sirve tanto la API como los archivos estáticos del frontend
2. **BD en Railway** - No migrar la base de datos, solo conectar
3. **Build unificado** - Un solo script instala dependencias y construye el frontend

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `package.json` | Scripts `build` y `start` para Render |
| `backend/server.js` | Servir archivos estáticos de `frontend/dist/` |
| `render.yaml` | Configuración de infraestructura |

## Variables de Entorno en Render

| Variable | Valor |
|----------|-------|
| `DB_HOST` | `hayabusa.proxy.rlwy.net` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | `NfAnkTQQhyWSBVQMVxVoOWwppKoXjcLB` |
| `DB_NAME` | `railway` |
| `DB_PORT` | `52112` |
| `JWT_SECRET` | `inju_jwt_secret_k9x2mP7vQ3wL8nR5tY6jF4dH1bC0sAeUg` |
| `JWT_EXPIRES_IN` | `8h` |
| `CORS_ORIGIN` | `https://TU-APP-EN-RENDER.onrender.com` |
| `NODE_ENV` | `production` |

## Verificación

1. Build exitoso: `npm run build`
2. Servidor inicia: `npm start`
3. Frontend accesible en la URL de Render
4. Login funciona correctamente
5. API responde peticiones
