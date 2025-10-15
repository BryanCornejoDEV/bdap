# BDAP – Dashboard Analytics Platform

Aplicación React con Vite + Tailwind para mostrar KPIs, tablas y gráficos. Incluye autenticación sencilla con JWT simulado, integración con React Query y utilidades de exportación (PDF/Excel/CSV).

## Requisitos
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

## Notas
- El token es de demostración y no está firmado (solo para desarrollo). Implementar autenticación real en producción.
- React Query está configurado con `staleTime` de 60s y `retry` mínimo.
