# BDAP – Dashboard Analytics Platform

Aplicación React con Vite + Tailwind para mostrar KPIs, tablas y gráficos. Incluye autenticación sencilla con JWT simulado, integración con React Query y utilidades de exportación (PDF/Excel/CSV).

## Plataforma BDAP (Business Data Analyst Platform).

## Backend (server)

El backend usa Express + Prisma (SQLite).

1) Instala dependencias del servidor:

	- Ir a `server/` y ejecutar instalación.

2) Configura la base de datos:

	- Copia `server/.env.example` a `server/.env` si quieres personalizar.
	- Empuja el esquema y corre el seed inicial.

3) Ejecuta el servidor en http://localhost:4000

## Frontend

El frontend usa Vite. Durante desarrollo se usa proxy `/api` hacia el backend.

1) Instala dependencias en la raíz.

2) Ejecuta el modo dev en http://localhost:5173

Credenciales de ejemplo:

- admin: `admin@bdap.local` / `admin123`
- analyst: `analyst@bdap.local` / `analyst123`

- Node 18+

## Scripts
- dev: iniciar servidor de desarrollo
- build: compilar para producción
- preview: servir build localmente
- lint: ejecutar ESLint

## Variables de entorno
Crear un archivo `.env` basado en `.env.example`:

```
VITE_API_BASE_URL=/api
```

## Estructura
- `src/auth`: contexto y hook de autenticación
- `src/components`: Layout, NavBar, Sidebar, Charts, Table, etc.
- `src/hooks`: hooks para datos (useApi)
- `src/pages`: páginas (Dashboard, Reports, Login)
- `src/services`: axios apiClient + integraciones
- `src/utils`: exportación a PDF, Excel y CSV

## Desarrollo
1. Instala dependencias
2. Crea `.env`
3. Ejecuta `npm run dev`

## Rutas principales (frontend)

- `/` Dashboard
- `/reports` Lista de reportes
- `/reports/:id` Detalle del reporte (ver/añadir filas)
- `/integrations` Integraciones (GA, Stripe, HubSpot - simuladas)
- `/users` Gestión de usuarios (solo admin)
- `/profile` Perfil del usuario
- `/settings` Ajustes

## Notas
- El token es de demostración y no está firmado (solo para desarrollo). Implementar autenticación real en producción.
- React Query está configurado con `staleTime` de 60s y `retry` mínimo.
