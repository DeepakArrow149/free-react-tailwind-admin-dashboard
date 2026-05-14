# STITCH ERP — Web Client

React-based single-page application for the STITCH ERP apparel manufacturing system.

---

## Tech Stack

| Technology     | Version | Purpose                        |
| -------------- | ------- | ------------------------------ |
| React          | 19      | UI framework                   |
| TypeScript     | ~5.7    | Type safety                    |
| Vite           | 6.1+    | Build tool & dev server        |
| Tailwind CSS   | 4.0     | Utility-first styling          |
| Zustand        | 5.0     | Global state management        |
| React Router   | 7.1     | Client-side routing            |
| Axios          | 1.7     | HTTP client                    |
| React DnD      | 16      | Drag-and-drop (Form Builder)   |
| ApexCharts     | 4.1     | Data visualization             |
| FullCalendar   | 6.1     | Calendar views                 |
| Sonner         | 2.0     | Toast notifications            |

---

## Prerequisites

- **Node.js** >= 20.x
- **npm** >= 10.x
- Running API server at `http://localhost:4000` (see `apps/api-server/`)

---

## Setup

```bash
cd apps/web-client
npm install
```

### Environment Variables

Create `.env` in the `apps/web-client/` directory:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

---

## Development

```bash
npm run dev          # Start Vite dev server with HMR (default: http://localhost:5173)
```

## Build

```bash
npm run build        # TypeScript check + Vite production build → dist/
npm run preview      # Preview the production build locally
```

## Linting & Formatting

```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier formatting
npm run type-check   # TypeScript check without emitting
```

---

## Project Structure

```
src/
├── api/              # Axios instance and API service functions
├── app/              # App-level providers, error boundaries
├── components/       # Shared UI components (Button, Modal, Table, etc.)
├── contexts/         # React context providers
├── core/             # Core utilities, constants
├── hooks/            # Custom React hooks
├── icons/            # SVG icon components
├── layouts/          # Page layouts (Sidebar, Header, Main)
├── modules/          # Feature modules (one per ERP domain)
├── pages/            # Top-level route pages
├── routes/           # Route definitions and guards
├── services/         # Business logic services
├── store/            # Zustand stores
├── theme/            # Tailwind theme configuration
├── types/            # TypeScript type definitions
└── utils/            # Helper utilities
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

---

## ERP Modules

The application includes 14 ERP modules organized under `src/modules/`:

| Module          | Description                                    |
| --------------- | ---------------------------------------------- |
| Master Data     | Buyers, suppliers, materials, styles, colors   |
| Merchandising   | Buyer orders, tech packs, samples              |
| Costing         | BOM costing, CMT, overhead calculations        |
| Planning        | Production planning, capacity, scheduling      |
| Procurement     | Purchase orders, GRN, vendor management        |
| Inventory       | Stock management, transfers, adjustments       |
| Production      | Cut plans, sewing lines, finishing, tracking    |
| Quality         | Inspections, defect tracking, audit reports     |
| Packing         | Packing lists, carton management, barcoding    |
| Export          | Shipping docs, LC management, invoicing        |
| Finance         | Accounts, payments, cost tracking              |
| HRM             | Employee records, attendance, payroll           |
| MIS / Dashboard | KPIs, charts, real-time production metrics     |
| System Admin    | Users, roles, permissions, form builder, AI    |

---

## Authentication

- JWT-based authentication with role-based access control (RBAC)
- Protected routes via `AuthGuard` component
- Token refresh handled automatically via Axios interceptors
- Multi-tenant company context resolved at login

---

## Deployment

For production deployment, the web client is built to static files and served via Nginx. See the root [docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md) for Docker and Nginx configuration details.

---

## License

Proprietary — All rights reserved.
