# Enterprise React Admin Template — Architecture Guide

## Overview

A production-ready, modular React admin template built on **React 19**, **TypeScript 5.7**, **Vite 6**, **Tailwind CSS v4**, and **Zustand**. Designed for enterprise applications such as ERP systems, planning dashboards, AI inspection tools, garment production management, and analytics platforms.

---

## Folder Structure

```
src/
├── app/                    # Application shell
│   ├── guards/             # Route guards (ProtectedRoute, GuestRoute)
│   ├── pages/              # App-level pages (404, Error)
│   └── router.tsx          # Central route composition
│
├── components/             # Shared component library
│   ├── common/             # PageHeader, PageMeta, ScrollToTop, ComponentCard
│   ├── form/               # Input, Label, Select, Checkbox, Radio, Switch, TextArea
│   ├── table/              # DataTable, Pagination, SearchBar
│   └── ui/                 # Button, Badge, Alert, Avatar, Modal, Dropdown, Loader, Toast, ConfirmationDialog
│
├── core/                   # Core infrastructure (framework-agnostic)
│   ├── api/                # Axios client, route registry, error handler
│   ├── config/             # Environment vars, app config
│   ├── constants/          # App-wide constants
│   ├── hooks/              # Shared hooks (useToggle, useMediaQuery, usePagination, useGoBack)
│   ├── services/           # Token service, storage service
│   └── utils/              # Utility functions (cn, formatNumber, debounce, etc.)
│
├── icons/                  # SVG icon components (from TailAdmin)
│
├── layouts/                # Layout system
│   ├── components/         # Sidebar, Header, Backdrop
│   ├── config/             # Menu config & types (role-based filtering)
│   ├── context/            # SidebarContext
│   ├── DashboardLayout.tsx # Main authenticated layout
│   ├── AuthLayout.tsx      # Split-screen auth layout
│   └── BlankLayout.tsx     # Minimal layout
│
├── modules/                # Feature modules (pluggable)
│   ├── auth/               # Sign in / Sign up
│   ├── dashboard/          # Dashboard home with metrics
│   ├── users/              # User management with DataTable
│   ├── settings/           # App settings with forms
│   └── reports/            # Reports & analytics
│
├── store/                  # Zustand stores
│   ├── authStore.ts        # User auth state
│   └── appStore.ts         # Global app state (loading, title, notifications)
│
├── theme/                  # Theme system
│   ├── ThemeContext.tsx     # Dark/light mode provider
│   └── ThemeToggle.tsx     # Theme toggle component
│
├── types/                  # Global TypeScript type definitions
│   └── index.ts            # Shared types (User, ApiResponse, etc.)
│
├── App.tsx                 # Root component (RouterProvider)
├── main.tsx                # Entry point (providers)
└── index.css               # Tailwind v4 theme config
```

---

## Key Architecture Concepts

### 1. Module System

Each feature is a self-contained module under `src/modules/`:

```
src/modules/<name>/
├── components/       # Module-specific components
├── hooks/            # Module-specific hooks
├── pages/            # Page components
├── services/         # API service functions
├── types/            # Module-specific types
├── routes.tsx        # Lazy-loaded route definitions
└── index.ts          # Barrel export
```

**Adding a new module:**

1. Create the directory structure under `src/modules/<name>/`
2. Define pages in `pages/`
3. Create `routes.tsx` with lazy-loaded route config
4. Export from `index.ts`
5. Import routes in `src/app/router.tsx` and add to the appropriate layout
6. Add menu items in `src/layouts/config/menuConfig.ts`

### 2. Component Library

All shared components follow these conventions:

- **forwardRef** pattern for DOM-level components (Input, Button, etc.)
- **Consistent prop naming**: `variant`, `size`, `color`, `className`
- **cn() utility** for className merging (clsx + tailwind-merge)
- **Barrel exports** from each category index

### 3. API Layer

```typescript
import { api } from '@/core/api';
import { apiRoutes } from '@/core/api';

// Typed API calls
const users = await api.get<User[]>(apiRoutes.users.list);
const user = await api.post<User>(apiRoutes.users.create, data);
```

Features:
- Automatic Bearer token injection
- 401 response → token refresh flow
- Centralized error handling with `handleApiError()`
- All endpoints defined in `apiRoutes`

### 4. State Management (Zustand)

```typescript
import { useAuthStore, useAppStore } from '@/store';

// Auth
const { user, setUser, clearAuth } = useAuthStore();

// App state
const { setGlobalLoading, setPageTitle } = useAppStore();
```

### 5. Dynamic Sidebar

Menu configuration is data-driven via `src/layouts/config/menuConfig.ts`:

```typescript
const menuConfig: MenuSection[] = [
  {
    title: 'Menu',
    items: [
      {
        label: 'Dashboard',
        icon: GridIcon,
        path: '/',
        roles: ['admin', 'user'],  // Role-based visibility
      },
    ],
  },
];
```

Use `filterMenuByRole(menuConfig, userRoles)` for role-based filtering.

### 6. Theme System

- CSS-first approach using Tailwind v4's `@theme` in `index.css`
- Dark mode via `.dark` class on `<html>`
- `ThemeProvider` wraps the app with `useTheme()` hook access
- Design tokens: `--color-brand-*`, `--color-success-*`, `--color-error-*`, etc.

### 7. Authentication

- `ProtectedRoute` — Redirects unauthenticated users to `/auth/signin`; supports role-based access
- `GuestRoute` — Redirects authenticated users away from auth pages
- JWT tokens managed via `tokenService` (localStorage)
- Auth state in `authStore` (Zustand)

### 8. Path Aliases

`@/` maps to `src/` — configured in both `vite.config.ts` and `tsconfig.app.json`:

```typescript
import { Button } from '@/components/ui';
import { api } from '@/core/api';
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|---|---|---|
| `VITE_APP_TITLE` | Application title | Enterprise Admin |
| `VITE_API_BASE_URL` | API base URL | http://localhost:3000/api |
| `VITE_API_TIMEOUT` | Request timeout (ms) | 30000 |
| `VITE_AUTH_TOKEN_KEY` | localStorage key for access token | auth_token |
| `VITE_FEATURE_DARK_MODE` | Enable dark mode toggle | true |
| `VITE_FEATURE_NOTIFICATIONS` | Enable notification system | true |

---

## Production Optimization

- **Code splitting**: All module pages are lazy-loaded via `React.lazy()`
- **Vendor chunking**: React, React DOM, React Router in separate vendor chunk
- **Tree shaking**: ES module imports ensure dead code elimination
- **Suspense boundaries**: `<Loader fullPage />` shown during chunk loads

---

## Extending the Template

### Adding a New Module

```bash
# 1. Create module structure
mkdir -p src/modules/inventory/{pages,components,hooks,services,types}

# 2. Create page, routes, and index
# 3. Import in src/app/router.tsx
# 4. Add to menuConfig.ts for sidebar
```

### Adding UI Components

Place shared components in `src/components/ui/` and export from the barrel file.

### Connecting to a Real API

1. Update `VITE_API_BASE_URL` in `.env`
2. Define endpoints in `src/core/api/apiRoutes.ts`
3. Create service functions in `src/modules/<name>/services/`
4. Replace demo data in pages with API calls

---

## Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 |
| Language | TypeScript 5.7 |
| Build Tool | Vite 6.1 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| State Management | Zustand |
| HTTP Client | Axios |
| Icons | SVG components |
| Charts | ApexCharts |
| Meta Tags | react-helmet-async |
