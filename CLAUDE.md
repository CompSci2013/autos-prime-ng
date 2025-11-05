# AUTOS-PrimeNG Application - Claude Onboarding Reference

**Path:** `/home/odin/projects/autos-prime-ng/CLAUDE.md`
**Created:** 2025-11-05
**Updated:** 2025-11-05
**Purpose:** Complete reference for Claude to rapidly understand and develop the AUTOS-PrimeNG application (PrimeNG implementation)

---

## Table of Contents

1. [Infrastructure Overview](#infrastructure-overview)
2. [Application Architecture](#application-architecture)
3. [Container Images](#container-images)
4. [Data Pipeline](#data-pipeline)
5. [Backend API](#backend-api)
6. [Frontend Application](#frontend-application)
7. [Development Workflows](#development-workflows)
8. [Deployment Procedures](#deployment-procedures)
9. [Quick Start Commands](#quick-start-commands)
10. [Troubleshooting](#troubleshooting)
11. [Documentation](#documentation)
12. [Claude Session Guidelines](#claude-session-guidelines)

---

## Infrastructure Overview

### Cluster Configuration

```yaml
Infrastructure: Halo Labs Kubernetes Cluster
Distribution: K3s
Nodes:
  - Loki (192.168.0.110): Control plane, Ubuntu 24.04.3
  - Thor (192.168.0.244): Worker node with NVIDIA GPU, Ubuntu 24.04.3
Network: 192.168.0.0/24
DNS: Internal via /etc/hosts (*.minilab domain)
Container Runtime: containerd (K3s) + Podman (builds)
```

### AUTOS-PrimeNG Project Location

```bash
Thor: /home/odin/projects/autos-prime-ng/
├── backend/              # Node.js + Express API (shared with original AUTOS)
├── frontend/             # Angular 14 application (PrimeNG UI)
├── data/scripts/         # Elasticsearch data loading (shared)
├── k8s/                  # Kubernetes manifests
└── docs/                 # Project documentation
    ├── design/           # Design documents (milestones)
    ├── snapshots/        # Analysis snapshots
    ├── technical-debt/   # Known limitations and future work
    ├── state-management-guide.md
    └── state-management-refactoring-plan-part1.md
```

### Kubernetes Resources

```yaml
Namespace: autos-prime-ng
Access URL: http://autos-prime-ng.minilab
Backend Service: autos-prime-ng-backend.autos-prime-ng.svc.cluster.local:3000
Frontend Service: autos-prime-ng-frontend.autos-prime-ng.svc.cluster.local:80
Data Store: elasticsearch.data.svc.cluster.local:9200 (shared with original AUTOS)
Index: autos-unified (shared with original AUTOS)
```

---

## Application Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                AUTOS-PrimeNG ARCHITECTURE                    │
│                                                              │
│  Browser (http://autos-prime-ng.minilab)                    │
│       │                                                      │
│       ├─> Angular Frontend (port 80)                        │
│       │   ├── PrimeNG UI Library                            │
│       │   ├── URL-driven state (query parameters)           │
│       │   ├── StateManagementService + RouteStateService    │
│       │   ├── RequestCoordinatorService (deduplication)     │
│       │   └── localStorage (UI preferences only)            │
│       │                                                      │
│       └─> Backend API (port 3000)                           │
│           ├── Express.js REST API                           │
│           ├── Vehicle search & details                      │
│           └── Elasticsearch queries                         │
│                                                              │
│  Data Store: Elasticsearch (shared with original AUTOS)     │
│       └── Index: autos-unified (100,000 records)            │
└─────────────────────────────────────────────────────────────┘
```

### State Management Architecture

**URL as Single Source of Truth:**

- All query state (filters, sort, page) lives in URL query parameters
- Components hydrate from URL on initialization
- State changes update URL, triggering re-hydration
- Supports: bookmarking, sharing, browser back/forward

**Two Storage Layers:**

1. **URL (Query State)** - Shareable, bookmarkable

   - Selected model combinations
   - Active filters (year range, body class, etc.)
   - Sort column and direction
   - Current page and page size

2. **localStorage (UI Preferences)** - Per-browser, not shareable
   - Column order (user's preferred arrangement)
   - Column visibility (which columns shown/hidden)
   - Default page size preference
   - Panel collapse states

**Services:**

- `RouteStateService` - Low-level URL parameter management
- `StateManagementService` - High-level business logic, triggers API calls
- `RequestCoordinatorService` - Request deduplication, caching, retry logic
- `TableStatePersistenceService` - localStorage for table UI preferences

---

## Container Images

### Frontend Images

```yaml
Development Image: localhost/autos-prime-ng-frontend:dev
  Base: node:18-alpine
  Port: 4201 (4200 reserved for original AUTOS dev container)
  Features: Hot Module Reload (HMR), live reload
  Use: VS Code development only

Production Image: localhost/autos-prime-ng-frontend:prod-v1.0.0
  Base: nginx:alpine
  Port: 80
  Features: Optimized build, static serving, PrimeNG components
  Use: Kubernetes deployment
  Versioning: Release tags (prod-vX.Y.Z)
```

**⚠️ CRITICAL: Frontend Deployment Tag Sync**

The frontend production image tag **must match** `k8s/frontend-deployment.yaml` line 26:
```yaml
image: localhost/autos-prime-ng-frontend:prod-v1.0.0
```

**Deployment procedure:**
1. Build image: `podman build -f Dockerfile.prod -t localhost/autos-prime-ng-frontend:prod .`
2. Re-tag to match deployment YAML: `podman tag localhost/autos-prime-ng-frontend:prod localhost/autos-prime-ng-frontend:prod-v1.0.0`
3. Export: `podman save localhost/autos-prime-ng-frontend:prod-v1.0.0 -o autos-prime-ng-frontend-prod-v1.0.0.tar`
4. Import to K3s: `sudo k3s ctr images import autos-prime-ng-frontend-prod-v1.0.0.tar`
5. Restart: `kubectl rollout restart deployment/autos-prime-ng-frontend -n autos-prime-ng`

**Note:** Frontend uses release tags (`prod-v1.0.0`), not semantic versioning from package.json.

### Backend Images

```yaml
Current Version: localhost/autos-prime-ng-backend:v1.4.1
  Base: node:18-alpine
  Port: 3000
  Features: Express API, Elasticsearch client (shared backend with original AUTOS)
  Versioning: Semantic (major.minor.patch) from package.json
```

**Backend Deployment:**
Backend version automatically syncs with `backend/package.json` version field.
Deployment YAML (`k8s/backend-deployment.yaml`) references `localhost/autos-prime-ng-backend:v1.4.1`.

**Note:** Backend code is shared with original AUTOS; only image names differ for deployment isolation.

---

## Data Pipeline

### Elasticsearch Index: autos-unified

**Document Structure:**

```json
{
  "manufacturer": "Ford",
  "model": "F-150",
  "year": 2020,
  "body_class": "Pickup",
  "data_source": "NHTSA",
  "vehicle_id": "unique-hash",
  "make_model_year": "Ford|F-150|2020",
  "instance_count": 25000
}
```

**Key Fields:**

- `make_model_year`: Composite key for grouping
- `instance_count`: How many VINs match this combination
- VIN instances: Generated on-demand (not stored)

**VIN Generation (On-Demand):**

- Quantity: Based on instance_count
- State: Geographic weighting (CA 15%, TX 8%, FL 7%, etc.)
- Color: Period-appropriate (pre-1970 vs post-1970 palettes)
- Value: Calculated from condition + mileage + options

**No VINs Stored in Elasticsearch** - All generated on-demand per request

### Environment Variables

**Defined in:** `k8s/backend-deployment.yaml`

```yaml
ELASTICSEARCH_URL: http://elasticsearch.data.svc.cluster.local:9200
ELASTICSEARCH_INDEX: autos-unified
NODE_ENV: production
PORT: 3000
```

---

## Backend API

### Current Version: v1.4.1

**Base URL:** `http://autos.minilab/api` (proxied) or `http://localhost:3000` (dev)

### Endpoints

#### GET /api/search/manufacturer-model-counts

```typescript
Query Params: None
Response: {
  manufacturers: Array<{
    manufacturer: string;
    models: Array<{
      model: string;
      count: number;
    }>;
  }>;
}
```

#### GET /api/search/vehicle-details

```typescript
Query Params:
  models: string               // "Ford:F-150,Chevrolet:Corvette"
  page: number                 // 1-indexed
  size: number                 // 10, 20, 50, 100
  manufacturer?: string        // Filter
  model?: string              // Filter
  yearMin?: number            // Filter
  yearMax?: number            // Filter
  bodyClass?: string          // Filter
  dataSource?: string         // Filter
  sortBy?: string             // Column key
  sortOrder?: 'asc' | 'desc'  // Sort direction

Response: {
  results: VehicleResult[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}
```

#### GET /api/search/vehicle-instances/:vehicleId

```typescript
Path Params:
  vehicleId: string

Query Params:
  count?: number  // Default: 5, Max: 100

Response: {
  vehicle_id: string;
  instances: VehicleInstance[];
}
```

---

## Frontend Application

### Technology Stack

```yaml
Framework: Angular 14
CLI Version: @angular/cli@14
Package Manager: npm
Development Port: 4201 (hot reload) - Port 4200 reserved for original AUTOS
Production Port: 80 (nginx)
UI Library: PrimeNG (Enterprise-grade Angular UI components)
State Management: URL-driven with RxJS
```

### Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   └── services/
│   │   │       ├── route-state.service.ts
│   │   │       ├── state-management.service.ts
│   │   │       └── request-coordinator.service.ts
│   │   ├── features/
│   │   │   ├── discover/
│   │   │   │   └── discover.component.ts        # Main container
│   │   │   ├── picker/
│   │   │   │   └── manufacturer-model-table-picker/
│   │   │   │       └── *.component.ts           # Picker table
│   │   │   └── results/
│   │   │       └── vehicle-results-table/
│   │   │           └── *.component.ts           # Results + VIN expansion
│   │   ├── models/
│   │   │   ├── search-filters.model.ts
│   │   │   ├── vehicle.model.ts
│   │   │   └── vehicle-result.model.ts
│   │   ├── services/
│   │   │   └── api.service.ts                    # HTTP client
│   │   └── shared/                                # [Milestone 003]
│   │       ├── shared.module.ts                   # [IMPLEMENTED]
│   │       ├── components/
│   │       │   ├── base-data-table/               # [IMPLEMENTED]
│   │       │   │   ├── base-data-table.component.ts
│   │       │   │   ├── base-data-table.component.html
│   │       │   │   └── base-data-table.component.scss
│   │       │   └── column-manager/                # [IMPLEMENTED]
│   │       │       ├── column-manager.component.ts
│   │       │       ├── column-manager.component.html
│   │       │       └── column-manager.component.scss
│   │       ├── models/
│   │       │   ├── table-column.model.ts          # [IMPLEMENTED]
│   │       │   ├── table-data-source.model.ts     # [IMPLEMENTED]
│   │       │   └── index.ts
│   │       └── services/
│   │           └── table-state-persistence.service.ts  # [IMPLEMENTED]
│   └── environments/
│       ├── environment.ts                        # Dev: http://localhost:3000
│       └── environment.prod.ts                   # Prod: /api (proxied)
├── Dockerfile                                    # Default (same as Dockerfile.prod)
├── Dockerfile.dev                                # Dev container (Node.js)
├── Dockerfile.prod                               # Prod container (nginx)
├── nginx.conf                                    # Production nginx config
└── package.json
```

### Component Hierarchy

```
AppComponent
├── NavigationComponent
└── RouterOutlet
    ├── DiscoverComponent (main container)
    │   ├── ManufacturerModelTablePickerComponent
    │   │   ├── DUAL MODE: Tree + Table + Multi-select
    │   │   └── Emits: modelCombos[]
    │   └── VehicleResultsTableComponent
    │       ├── Displays: Vehicle search results
    │       ├── Expandable: VIN instances per vehicle
    │       └── Status: READY FOR MIGRATION to BaseDataTable
    └── WorkshopComponent ( builder interface)
```

### Workshop Page Implementation

**Status:** âœ… FULLY IMPLEMENTED (Experimental Feature)

**Route:** `/workshop`

**Purpose:** Drag-and-drop customizable workspace

**Key Features:**

- **Grid Layout:** @katoid/angular-grid-layout (12-column grid)
- **Panels:**
  - Manufacturer-Model Picker (collapsible)
  - Vehicle Results Table (collapsible)
- **Persistence:** Layout saved to localStorage (`autos-workshop-layout`)
- **State Integration:** Full StateManagementService integration
- **Drag Conflict Resolution:** Prevents grid drag from interfering with table column reordering

**Technical Implementation:**

- Grid configuration: 12 cols, 50px row height, 16px gap
- Default layout: Picker (12×16), Results (12×14)
- Dynamic drag enable/disable using Renderer2
- CDK drag event listeners for column vs grid drag coordination

```

Also update the component hierarchy diagram to show Workshop as implemented:
```

AppComponent
├── NavigationComponent
└── RouterOutlet
├── HomeComponent (landing page with feature cards)
├── DiscoverComponent (traditional layout)
│ ├── ManufacturerModelTablePickerComponent
│ └── VehicleResultsTableComponent
└── WorkshopComponent âœ… (experimental grid layout)
├── ktd-grid (drag/drop layout system)
│ ├── Picker Panel (nz-collapse)
│ │ └── ManufacturerModelTablePickerComponent
│ └── Results Panel (nz-collapse)
│ └── VehicleResultsTableComponent

### State Management Flow

**URL → Component Hydration:**

```
1. User navigates to URL with query params
2. RouteStateService.getQueryParam() reads URL
3. StateManagementService.filters$ emits current state
4. Component subscribes and hydrates from state
5. Component displays UI based on state
```

**User Interaction → URL Update:**

```
1. User interacts with UI (filter, sort, page)
2. Component emits event to parent
3. Parent calls StateManagementService.updateFilters()
4. StateManagementService.syncStateToUrl() updates URL
5. StateManagementService.fetchVehicleData() triggers API
6. RequestCoordinatorService deduplicates/caches request
7. URL change triggers hydration cycle (step 1 above)
```

---

## Development Workflows

### Complete Environment Rebuild

For detailed tear-down and rebuild procedures, see:

**📄 [Developer Environment Setup Procedure](developer-environment.md)**

This operational guide covers:
- Complete cleanup of containers and images (Podman + K3s)
- Backend rebuild and deployment (with version management)
- Frontend production build and K3s deployment
- Development container setup (with HMR)
- Verification checklists and troubleshooting

**Use when:** Starting fresh, recovering from issues, or onboarding new developers

---

### Frontend Development Workflow

**Development Mode (Recommended):**

```bash
# 1. Start dev container with HMR
cd /home/odin/projects/autos-prime-ng/frontend
podman run -d \
  --name autos-prime-ng-frontend-dev \
  -p 4201:4201 \
  -v ./:/app:z \
  localhost/autos-prime-ng-frontend:dev

# 2. Edit files (VS Code Remote-SSH to Thor)
# Changes auto-reload via HMR

# 3. View at http://192.168.0.244:4201
```

**Production Build (When Ready to Deploy):**

```bash
# 1. Build production image
cd /home/odin/projects/autos-prime-ng/frontend
podman build -f Dockerfile.prod -t localhost/autos-prime-ng-frontend:prod .

# 2. Save as tar
podman save -o autos-prime-ng-frontend-prod.tar localhost/autos-prime-ng-frontend:prod

# 3. Import to K3s
sudo k3s ctr images import autos-prime-ng-frontend-prod.tar

# 4. Verify import
sudo k3s ctr images list | grep autos-prime-ng-frontend

# 5. Deploy to Kubernetes (rolling update)
kubectl apply -f k8s/frontend-deployment.yaml
kubectl rollout status deployment/autos-prime-ng-frontend -n autos-prime-ng
```

### Backend Development Workflow

**Version Increment → Build → Deploy:**

```bash
# 1. Increment version in package.json
cd /home/odin/projects/autos-prime-ng/backend
# Edit package.json: "version": "1.2.6"

# 2. Build image with new version
VERSION=$(node -p "require('./package.json').version")
podman build -t localhost/autos-prime-ng-backend:v${VERSION} .

# 3. Save as tar
podman save -o autos-prime-ng-backend-v${VERSION}.tar localhost/autos-prime-ng-backend:v${VERSION}

# 4. Import to K3s
sudo k3s ctr images import autos-prime-ng-backend-v${VERSION}.tar

# 5. Update deployment manifest
# Edit k8s/backend-deployment.yaml: image: localhost/autos-prime-ng-backend:v1.2.6

# 6. Apply to cluster
kubectl apply -f k8s/backend-deployment.yaml
kubectl rollout status deployment/autos-prime-ng-backend -n autos-prime-ng
```

---

## Development Best Practices

### Container Management

- **Always use `:z` flag** on volume mounts (SELinux systems)
- **Check container status** before execing: `podman ps | grep autos`
- **Clean up stopped containers** regularly: `podman container prune`
- **Use `--rm` flag** for one-off containers (data loader)

### Image Versioning

- **Increment version** in package.json before building backend
- **Tag images semantically:** v1.2.1 (major.minor.patch)
- **Keep tar archives** in backend directory for rollback
- **Verify imports:** Always check `sudo k3s ctr images list` after import
- **Use descriptive tags for frontend:** `:prod`, `:prod-v2`, etc.

### Development Cycle Summary

- **Edit files** (VS Code Remote-SSH to Thor)
- **See changes** (HMR in dev container OR rebuild backend)
- **Test thoroughly** (Dev frontend + K8s backend)
- **Build production** (Only when ready to deploy)
- **Deploy to K8s** (Rolling update, zero downtime)

---

## Documentation

### Structure

```
docs/
├── design/                                    # Design documents
│   ├── milestone-003-base-table-design.md     # BaseDataTable specification
│   ├── panel-popout-architecture.md           # Pop-out panels with state sync
│   ├── plugin-picker-architecture.md          # Plugin-based picker system (DRAFT)
│   └── [future milestones]
├── snapshots/                                 # Point-in-time analysis
│   └── [analysis snapshots]
├── technical-debt/                            # Known limitations and future work
│   └── vin-count-sorting.md                   # VIN Count client-side sort limitation
├── state-management-guide.md                  # State management patterns
└── state-management-refactoring-plan-part1.md # Professional-grade patterns
```

### Key Documents

#### 1. State Management & Component Hydration Guide

**File:** `docs/state-management-guide.md`

**Purpose:** Complete reference for state management patterns and component hydration

**Topics Covered:**

- URL-as-single-source-of-truth architecture
- `RouteStateService` and `StateManagementService` integration
- Component hydration strategies (input-based, idempotent)
- Storage layer separation (URL vs localStorage)
- Data flow patterns
- Implementation examples
- Testing scenarios
- Best practices (DO/DON'T patterns)

**When to Reference:**

- Implementing new components that interact with state
- Adding new table components (especially with Milestone 003)
- Debugging hydration issues
- Code review for state management patterns
- Onboarding new developers

#### 2. State Management Refactoring Plan (Part 1)

**File:** `docs/state-management-refactoring-plan-part1.md`

**Purpose:** Elevate AUTOS to professional/enterprise-grade state management

**Topics Covered:**

- **Phase 1: Loading State Coordination**
  - RequestCoordinatorService (implemented)
  - Request deduplication and caching
  - Retry logic with exponential backoff
- **Phase 2: Error Boundary Pattern** (not yet implemented)
  - Global error handler
  - Centralized error categorization
  - User-friendly notifications
- **Phase 3: Centralized Action Pattern** (not yet implemented)
  - Observable state changes
  - Audit trail
  - Debugging support

**When to Reference:**

- Understanding RequestCoordinatorService usage
- Implementing error handling patterns
- Planning advanced state management features

#### 3. Milestone 003 - Base Table Design

**File:** `docs/design/milestone-003-base-table-design.md`

**Purpose:** Complete design specification for reusable `BaseDataTableComponent`

**Current Status:** ✅ **MILESTONE COMPLETE** - All core objectives achieved (v2.0.0)

- ✅ BaseDataTableComponent created (~300 lines)
- ✅ TableColumn, TableDataSource, TableQueryParams models
- ✅ TableStatePersistenceService
- ✅ Composition pattern with ng-template slots
- ✅ ColumnManagerComponent (~210 lines) - FULLY IMPLEMENTED with drawer UI, nz-transfer, search/filter
- ✅ SharedModule exporting both BaseDataTable and ColumnManager
- ✅ VehicleDataSourceAdapter (84 lines) - Clean adapter pattern
- ✅ ResultsTableComponent (240 lines) - Pattern proven in production (Workshop, popouts)
- ⏸️ VehicleResultsTable migration (OPTIONAL - legacy component stable on Discover page)

**Topics Covered:**

- Problem statement and objectives
- Design decisions (composition, ng-template slots, column visibility)
- Architecture overview
- Component structure and interfaces
- Feature requirements (column reordering, visibility, filtering, sorting, pagination)
- Data models (TableColumn, TableDataSource, TableQueryParams)
- Implementation plan (18 steps across 4 phases)
- Testing strategy
- Migration path for VehicleResultsTableComponent

**Implementation Status:**

- **Phase 1 (Steps 1-5):** ✅ COMPLETE - Foundation created
- **Phase 2 (Steps 6-10):** ✅ COMPLETE - BaseDataTable + ColumnManager fully implemented
- **Phase 3 (Steps 11-15):** ✅ COMPLETE - VehicleDataSourceAdapter + ResultsTableComponent in production
- **Phase 4 (Steps 16-18):** ✅ COMPLETE - Comprehensive testing and documentation

**When to Reference:**

- Creating new table components using BaseDataTable pattern
- Understanding table architecture patterns
- Optionally migrating VehicleResultsTableComponent on Discover page
- Adding features to BaseDataTableComponent or ColumnManagerComponent

#### 4. Panel Pop-Out Architecture

**File:** `docs/design/panel-popout-architecture.md`

**Purpose:** Complete design specification for panel pop-out feature with bidirectional state synchronization

**Current Status:** ✅ **FULLY IMPLEMENTED** (feature/cross-grid branch)

**Topics Covered:**

- Problem statement (MOVE vs COPY semantics, state synchronization)
- Architecture design (main window as single source of truth)
- MOVE semantics implementation (panel removal/restoration)
- Bidirectional BroadcastChannel communication
- Cross-window state synchronization
- Data flow diagrams
- Implementation details (PanelPopoutService, PanelPopoutComponent)
- Testing scenarios

**Key Principles:**

1. **Main Window Owns All State**
   - Main window's URL is single source of truth
   - Pop-out window's URL is irrelevant
   - All state updates flow through main window's StateManagementService

2. **MOVE Semantics**
   - Panel removed from grid when popped out
   - Panel restored to original location when pop-out closes
   - Persistence across page refreshes

3. **Bidirectional Communication**
   - Pop-out sends user actions to main window via BroadcastChannel
   - Main window updates state and broadcasts back to all pop-outs
   - No direct state updates from pop-out components

**When to Reference:**

- Understanding pop-out panel architecture
- Debugging cross-window communication issues
- Adding new message types for state synchronization
- Extending pop-out functionality to other panels
- Onboarding developers to multi-window features

#### 5. Plugin Picker Architecture

**File:** `docs/design/plugin-picker-architecture.md`

**Purpose:** Design specification for true plugin-based picker system

**Current Status:** ✅ **DESIGN COMPLETE** (DRAFT - awaiting implementation approval)

**Topics Covered:**

- Problem statement (ApiService coupling)
- Dual-mode API configuration (ApiService method vs Direct HTTP)
- Direct HTTP call support for external APIs
- Backward compatibility strategy
- Implementation plan (4 phases)
- Examples (Engine picker, Sound System picker, External API picker)
- Migration path from ApiService to HTTP mode
- Testing strategy

**Key Innovation:**

Add new picker = Create ONE config file (no ApiService changes needed!)

```typescript
// New approach: Direct HTTP in config
api: {
  http: {
    method: 'GET',
    endpoint: '/engines',
    baseUrl: 'https://parts-api.com/api'  // Optional external API
  },
  paramMapper: (params) => ({ /* ... */ }),
  responseTransformer: (response) => ({ /* ... */ })
}
```

**Backward Compatible:**

Existing pickers using `api.method` continue to work unchanged.

**When to Reference:**

- Adding new pickers to the application
- Integrating external APIs
- Understanding picker configuration system
- Migrating from ApiService-based to HTTP-based pickers
- Planning multi-domain picker implementations (engines, sound systems, wheels, etc.)

#### 6. Analysis Snapshots

**Directory:** `docs/snapshots/`

**Purpose:** Capture point-in-time analysis and decisions for major milestones

**Content:**

- Problem analysis
- Design exploration
- Decision rationale
- Trade-offs considered
- Implementation notes

**When to Create:**

- After completing a major milestone
- When making significant architectural decisions
- To document lessons learned
- For future reference and onboarding

#### 7. Technical Debt

**Directory:** `docs/technical-debt/`

**Purpose:** Document known limitations, workarounds, and proper solutions for future implementation

**VIN Count Sorting (vin-count-sorting.md):**

**Status:** Known Limitation - Client-side sort workaround implemented (v1.6.2)

**Current Behavior:**
- VIN Count column displays and sorts correctly
- Sorting only affects current page (20 results), not all 4,887 vehicles
- Sort state persists in URL but data doesn't reflect global sort

**Root Cause:**
- `instance_count` is computed after main query from separate `autos-vins` index
- Cannot sort server-side without fetching all vehicles (expensive)
- Client-side sort implemented as temporary solution

**Proper Solutions (documented in file):**
1. **Precompute counts** - Add `instance_count` to `autos-unified` documents during data loading
2. **Include VIN arrays** - Embed VIN instances in API response, eliminate lazy-loading
3. **Hybrid approach** - Combine both for optimal UX

**When to Address:**
- Planning data pipeline work
- User requests improved sorting functionality
- Optimizing API response patterns

**Related Code:**
- Backend: `elasticsearchService.js:422-466`, `vehicleController.js:124-142`
- Frontend: `base-data-table.component.ts:569-596`, `results-table.component.ts:107-119`

### Documentation Best Practices

1. **Version Control:** All documentation lives in Git alongside code
2. **Living Documents:** Update docs when implementation deviates from design
3. **Cross-References:** Link related documents (design → implementation → testing)
4. **Snapshots:** Create snapshots at major milestones for historical reference
5. **Keep Current:** Review and update CLAUDE.md with each significant change

---

## Claude Session Guidelines

### Context Management (REQUIRED)

**Context warnings must be included periodically during all sessions.**

**Frequency:**

- Every instruction during step-by-step implementations
- Every 3-5 messages during design/analysis work
- Always when crossing threshold boundaries

**Format:** `Context warning: Approximately X% remaining.`

**Thresholds:**

- **Green (>50%):** Optional mention unless in instruction mode
- **Yellow (30-50%):** Include warning with percentage
- **Orange (20-30%):** Bold warning: "Approaching token limit"
- **Red (<20%):** Critical warning: "⚠️ CRITICAL: Approximately X% remaining."

**Session Start:**
When beginning any implementation or complex task, acknowledge that context tracking is enabled.

---

## Quick Start Commands

### Check Cluster Status

```bash
kubectl get pods -n autos-prime-ng
kubectl get svc -n autos-prime-ng
kubectl logs -n autos-prime-ng deployment/autos-prime-ng-backend --tail=50
kubectl logs -n autos-prime-ng deployment/autos-prime-ng-frontend --tail=50
```

### Restart Services

```bash
kubectl rollout restart deployment/autos-prime-ng-backend -n autos-prime-ng
kubectl rollout restart deployment/autos-prime-ng-frontend -n autos-prime-ng
```

### Access Services

```bash
# Frontend
curl http://autos-prime-ng.minilab

# Backend health
curl http://autos-prime-ng.minilab/api/health

# Backend manufacturer counts
curl http://autos-prime-ng.minilab/api/search/manufacturer-model-counts
```

### Development Container Management

```bash
# Start dev frontend
podman run -d --name autos-prime-ng-frontend-dev -p 4201:4201 \
  -v /home/odin/projects/autos-prime-ng/frontend:/app:z \
  localhost/autos-prime-ng-frontend:dev

# Stop dev frontend
podman stop autos-prime-ng-frontend-dev
podman rm autos-prime-ng-frontend-dev

# View logs
podman logs -f autos-prime-ng-frontend-dev
```

---

## Troubleshooting

### Frontend Not Loading

```bash
# Check pod status
kubectl get pods -n autos-prime-ng

# Check logs
kubectl logs -n autos-prime-ng deployment/autos-prime-ng-frontend

# Common issues:
# 1. Image not imported: sudo k3s ctr images list | grep autos-prime-ng-frontend
# 2. Wrong image tag in deployment
# 3. ConfigMap not applied
```

### Backend API Errors

```bash
# Check backend logs
kubectl logs -n autos-prime-ng deployment/autos-prime-ng-backend --tail=100

# Check Elasticsearch connectivity
kubectl exec -n autos-prime-ng deployment/autos-prime-ng-backend -- \
  curl http://elasticsearch.data.svc.cluster.local:9200/_cluster/health

# Common issues:
# 1. Elasticsearch not running
# 2. Index missing (check logs for "index_not_found_exception")
# 3. Environment variables incorrect
```

### Image Import Issues

```bash
# Verify image exists locally
podman images | grep autos-prime-ng

# Verify import succeeded
sudo k3s ctr images list | grep autos-prime-ng

# Re-import if needed
sudo k3s ctr images import autos-prime-ng-frontend-prod.tar

# Check image name matches deployment
kubectl get deployment autos-prime-ng-frontend -n autos-prime-ng -o yaml | grep image
```

---

## Changelog

### 2025-11-05 (v1.0.0) - AUTOS-PrimeNG Initial Fork

- **Created AUTOS-PrimeNG Repository** - New PrimeNG-based implementation
  - Forked from AUTOS main branch (commit 23ab55a)
  - Replaced NG-ZORRO with PrimeNG UI library
  - Updated all paths from `/home/odin/projects/autos/` to `/home/odin/projects/autos-prime-ng/`
  - Changed namespace from `autos` to `autos-prime-ng`
  - Updated image names: `autos-prime-ng-frontend` and `autos-prime-ng-backend`
  - Changed dev port from 4200 to 4201 (preserving 4200 for original AUTOS)
  - Shared backend and Elasticsearch with original AUTOS
  - Updated all documentation (CLAUDE.md, developer-environment.md)
  - Removed obsolete documentation files

### 2025-11-05 (v1.6.2) - Original AUTOS Project

- **VIN Count Column Implementation** - Added VIN instance counts to results table
  - Backend v1.6.2: VIN count aggregation from `autos-vins` index
  - Frontend prod-v1.1.3: VIN Count column with client-side sorting
  - New field: `instance_count` in VehicleResult model
  - Client-side sort workaround for computed fields
- **Technical Debt Documentation** - Established technical debt tracking
  - Created `docs/technical-debt/` directory
  - Added `vin-count-sorting.md` documenting client-side sort limitation
  - Updated CLAUDE.md Documentation section with Technical Debt reference
  - Documented proper solutions for future implementation (precompute counts, embed VIN arrays)
- **BaseDataTable Enhancement** - Added client-side sorting capability
  - New `clientSideSort?: boolean` field in TableColumn model
  - `sortTableDataClientSide()` method for in-place sorting
  - Auto re-applies sort on data load/hydration for persistence
  - URL state sync for client-side sorts

### 2025-11-02 (v1.6.1)

- **Container Versioning Documentation** - Clarified frontend/backend versioning schemes
  - Documented frontend release tag versioning (`prod-v1.1.3`)
  - Added critical warning about tag sync with deployment YAML
  - Included step-by-step frontend deployment procedure
  - Clarified backend semantic versioning from package.json
  - Fixed production deployment issue (wrong image tag)

### 2025-11-02 (v1.6.0)

- **Documentation Consolidation** - Streamlined project documentation
  - Archived obsolete deployment guide (2025-10-11) with deprecation notice
  - Established CLAUDE.md as single authoritative reference
  - Separated operational procedures (developer-environment.md) from reference
  - Added cross-references between CLAUDE.md and developer-environment.md
  - Updated backend version to v1.4.1 throughout documentation
  - Created docs/archive/ directory for historical documents
  - Eliminated 70% content duplication across three documents
  - Clear documentation hierarchy: Reference (CLAUDE.md) → Procedures (developer-environment.md) → History (archive/)

### 2025-10-26 (v1.4.0)

- **Added Panel Pop-Out Feature** (feature/cross-grid branch)
  - Complete design document: `docs/design/panel-popout-architecture.md`
  - MOVE semantics: panels removed from grid when popped out, restored on close
  - Bidirectional BroadcastChannel state synchronization
  - Main window URL remains single source of truth
  - Pop-out windows don't update their own state
  - Supports multi-monitor workflows
- **Implemented N-Grid Architecture**
  - Refactored from hardcoded left/right grids to array-based system
  - GridConfig model for unlimited grid support
  - Map-based GridTransferService
  - Dynamic grid rendering with *ngFor
- **Added PanelPopoutService and PanelPopoutComponent**
  - Window lifecycle management
  - Cross-window message handling
  - State persistence across page refreshes
  - Automatic panel restoration on pop-out failure
- **Updated CLAUDE.md Documentation section**
  - Added Panel Pop-Out Architecture reference
  - Updated documentation structure
  - Added key principles and when-to-reference guidance

### 2025-10-26 (v1.5.0)

- **Closed Milestone 003 as COMPLETE** - all core objectives achieved
  - Pattern fully implemented: BaseDataTableComponent + ColumnManagerComponent + VehicleDataSourceAdapter
  - ResultsTableComponent deployed in production (Workshop page, popouts)
  - 60% code reduction demonstrated (593 → 240 lines)
  - Comprehensive test coverage in place
  - Legacy VehicleResultsTableComponent migration marked as OPTIONAL
- **Updated milestone design doc** to v2.0.0 (COMPLETE status)
- **Updated CLAUDE.md** to reflect all phases complete

### 2025-10-26 (v1.4.0)

- **Reconciled CLAUDE.md with actual codebase** - corrected outdated implementation status
  - ColumnManagerComponent: NOW MARKED AS IMPLEMENTED (was incorrectly marked as NOT IMPLEMENTED)
  - Milestone 003 Phase 2: NOW COMPLETE (all 10 steps including ColumnManager)
  - SharedModule structure: Updated to show all components as IMPLEMENTED
- **Confirmed actual remaining work:**
  - Phase 3: VehicleResultsTable migration (NOT STARTED)
  - Phase 4: Polish and optimization (TODO)
- **Updated changelog** to reflect correct implementation timeline

### 2025-10-18 (v1.3.0)

- **Updated Milestone 003 status** to reflect implementation progress
  - BaseDataTableComponent: IMPLEMENTED
  - ColumnManagerComponent: IMPLEMENTED (created Oct 18, not reflected in this doc version)
  - VehicleResultsTable migration: NOT STARTED
- **Added RequestCoordinatorService** to architecture overview
- **Updated documentation section** with state-management-refactoring-plan-part1.md reference
- **Added implementation status** tracking for Milestone 003 phases
- **Clarified storage layers** (URL for query state, localStorage for UI preferences)
- **Updated project structure** to show implemented vs not-implemented components

### 2025-10-16 (v1.2.0)

- **Added Documentation section** with complete structure
- Added reference to `docs/state-management-guide.md`
- Added reference to `docs/design/milestone-003-base-table-design.md`
- Added `shared/` module structure to frontend project tree (Milestone 003)
- Added NG-ZORRO UI library to technology stack
- Clarified state management architecture (URL-driven with RxJS)
- Updated Table of Contents to include Documentation section

### 2025-10-14 (v1.1.0)

- **Production frontend deployed** for the first time
- Updated `frontend-deployment.yaml` to use `localhost/autos-frontend:prod`
- Added production frontend build and deployment procedures
- Clarified development vs production workflows
- Added troubleshooting for frontend image issues
- Updated architecture diagrams to reflect production deployment

### 2025-10-13 (v1.0.0)

- Initial document creation
- Backend v1.2.5 documented as current production version
- Frontend development workflow documented
- Data pipeline and API endpoints documented

---

**Last Updated:** 2025-11-05
**Maintained By:** Claude (with odin)
**Version:** 1.0.0 (AUTOS-PrimeNG)
**Forked From:** AUTOS v1.6.2 (NG-ZORRO implementation)

---

**END OF AUTOS-PRIMENG APPLICATION REFERENCE DOCUMENT**

This document should be read at the start of every new Claude session to ensure rapid understanding and immediate productivity on the AUTOS-PrimeNG project.
