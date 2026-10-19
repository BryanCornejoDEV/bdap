# BDAP v2.0 – Enterprise Multi-Tenant Business Data & Workplace Platform

Plataforma full-stack empresarial para **analítica financiera multivariable, inteligencia predictiva (Argon AI), seguimiento de Metas/OKRs, tableros operativos Kanban y gobernanza multi-empresa en tiempo real**.

## Stack Tecnológico

- **Frontend**: React 19, Vite 7, Tailwind CSS, TanStack React Query v5, React Router v7, Recharts, Axios
- **Backend**: Node.js + Express, Prisma ORM (SQLite en dev / PostgreSQL en prod), Motor Multi-Tenant con caché aislada en memoria y telemetría de carga por organización, JWT, bcrypt, Zod
- **Exportación & Ingesta**: PDF (`jsPDF` + `autotable`), Excel (`xlsx`), CSV e importación masiva de hojas de cálculo

## Módulos de la Plataforma

1. **Dashboard Ejecutivo Multi-Empresa (`/`)**:
   - Resumen financiero consolidado (Ingresos Brutos, Gastos, Utilidad Neta, Margen %, Órdenes, Clientes y Ticket Promedio).
   - Telemetría de rendimiento del tenant activo (latencia en ms, hit rate de caché) e Índice de Salud Corporativa.
   - Matriz Comparativa Multi-Empresa en tiempo real para directivos que operan múltiples organizaciones simultáneamente.
2. **Inteligencia & Pronósticos IA (`/intelligence`)**:
   - Proyecciones futuras mediante regresión lineal (OLS) con bandas de confianza (±1.28σ) y coeficiente de determinación $R^2$.
   - **Simulador Estratégico "What-If"** interactivo (Precio/Ticket, Volumen de Demanda, Optimización de Costos) con cálculo de impacto neto en utilidad y margen.
   - **Detector Estadístico de Anomalías (Z-Score)** y generación automática de recomendaciones ejecutivas.
3. **Metas & OKRs Corporativos (`/goals`)**:
   - Gestión de objetivos estratégicos por departamento (`Ventas`, `Finanzas`, `Operaciones`, `Marketing`, `Tecnología`, `RRHH`).
   - Vinculación directa con reportes financieros para **sincronización automática en 1 clic** del progreso real.
4. **Tablero Operativo & Proyectos (`/workspace`)**:
   - Gestión ágil del ambiente laboral con vista **Kanban (Backlog, En Ejecución, En Revisión, Completado)** y vista **Lista Ejecutiva**.
   - Control de capacidad en horas estimadas, prioridades y asignación por departamento.
5. **Centro Multi-Empresa & Equipos (`/organizations`)**:
   - Aprovisionamiento instantáneo de nuevas empresas con aislamiento estricto de datos (`x-org-id` + scoping en caché y React Query).
   - Administración de miembros por organización, roles (`owner`, `admin`, `member`), departamentos y planes (`enterprise`, `business`, `starter`).
6. **Auditoría & Trazabilidad de Seguridad (`/audit`)**:
   - Bitácora inmutable de eventos de seguridad, cambios de contexto, importaciones y operaciones por organización, exportable a PDF/Excel/CSV.
7. **Reportes Financieros Enriquecidos (`/reports` y `/reports/:id`)**:
   - Soporte de Ingresos, Gastos/Costos, Utilidad Neta automática, Margen %, Órdenes y Clientes, con edición en línea e importación masiva CSV/Excel.
8. **Paleta de Comandos Global (`Ctrl + K`)**:
   - Navegación instantánea entre módulos, reportes y cambio rápido de empresa desde cualquier pantalla.

## Puesta en marcha (Desarrollo)

Requiere Node 18+.

```bash
# 1. Instalar dependencias
npm install
cd server && npm install && cd ..

# 2. Sincronizar esquema Prisma y poblar las 3 empresas de demostración
npm run db:push
npm run db:seed

# 3. Iniciar Backend en http://localhost:4000
npm run dev:server:watch

# 4. Iniciar Frontend en http://localhost:5173
npm run dev
```

### Credenciales Multi-Empresa de Ejemplo

- **Director Global (3 Empresas: Acme Corp, Globex Latam, Initech Cloud)**: `admin@bdap.local` / `admin123`
- **Lead Analyst (Acme Corp & Globex Latam)**: `analyst@bdap.local` / `analyst123`
- **Operations Manager (Acme Corp & Initech Cloud)**: `ops@bdap.local` / `ops12345`

## Endpoints Principales del API

Todas las rutas (salvo `/api/health` y `/api/auth/login`) requieren `Authorization: Bearer <token>` y validan aislamiento multi-tenant mediante `x-org-id`.

- `GET /api/health`
- `POST /api/auth/login` · `GET /api/auth/me` · `POST /api/auth/switch-org` · `POST /api/auth/change-password`
- `GET|POST /api/organizations` · `GET|PATCH /api/organizations/:id` · `GET|POST|DELETE /api/organizations/:id/members`
- `GET|POST /api/reports` · `GET|PUT|DELETE /api/reports/:id` · `GET|POST|PATCH|DELETE /api/reports/:id/rows` · `POST /api/reports/:id/import`
- `GET /api/intelligence/analyze` — Regresión predictiva, anomalías Z-Score e índice de salud
- `GET|POST /api/goals` · `PATCH|DELETE /api/goals/:id` · `POST /api/goals/:id/sync-report`
- `GET|POST /api/tasks` · `PATCH|DELETE /api/tasks/:id`
- `GET /api/audit` — Bitácora de auditoría por organización
- `GET|POST /api/integrations/...` — Conectores en vivo o simulación para Google Analytics 4, Stripe y HubSpot CRM
