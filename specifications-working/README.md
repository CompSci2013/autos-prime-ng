# Vehicle Discovery Platform - Specification Documents
## Working Directory - Subject to Refinement

**Project**: AUTOS Prime-NG Frontend
**Branch**: `experiment/resource-management-service`
**Date Started**: 2025-11-15
**Status**: Work in Progress

---

## PURPOSE

This directory contains comprehensive specification documents for the Vehicle Discovery Platform. These specifications are designed to enable a development team to rebuild the application from scratch without access to the original source code.

**Target Audience**:
- Angular developers implementing the frontend
- Backend developers implementing the API
- Product managers understanding feature requirements
- QA engineers creating test plans
- Technical writers creating documentation

---

## DOCUMENT STATUS

| # | Document | Status | Completeness | Last Updated |
|---|----------|--------|--------------|--------------|
| 01 | Architectural Analysis | ✅ Complete | 100% | 2025-11-15 |
| 02 | API Contracts & Data Models | ⚠️ Needs Expansion | 20% | 2025-11-15 |
| 03 | Discover Feature Specification | ✅ Complete | 100% | 2025-11-15 |
| 04 | State Management Specification | ✅ Complete | 100% | 2025-11-15 |
| 05 | Data Visualization Components | ✅ Complete | 100% | 2025-11-15 |
| 06 | Filter & Picker Components | ✅ Complete | 100% | 2025-11-15 |
| 07 | Pop-Out Window System | ✅ Complete | 100% | 2025-11-15 |
| 08 | Non-Functional Requirements | ✅ Complete | 100% | 2025-11-15 |
| 09 | Testing Strategy | ✅ Complete | 100% | 2025-11-15 |

---

## COMPLETED SPECIFICATIONS

### 01 - Architectural Analysis (73 KB)

**File**: `01-architectural-analysis.md`

**Covers**:
- Overall application architecture
- Technology stack (Angular 14, PrimeNG, Plotly.js)
- Project structure and organization
- 20 components, 12 services, 5 data models
- URL-first state management pattern
- Routing structure
- API integration patterns
- Unique features (pop-out windows, drag-drop, config-driven)
- Build & deployment
- Performance characteristics
- Security considerations
- Known issues & technical debt

**Key Sections** (20 total):
1. Project Structure
2. Application Type & Purpose
3. Major Features/Modules
4. Technology Stack
5. Architectural Patterns
6. Routing Structure
7. Core Services
8. Data Models
9. API Integration
10. Unique/Notable Features
11. Build & Deployment
12. Testing Strategy
13. Code Organization
14. Development Workflow
15. Known Issues
16. Performance
17. Scalability
18. Migration Path (NG-ZORRO → PrimeNG)
19. Summary Table
20. Conclusions

**Use Cases**:
- Understanding overall system design
- Planning development team structure
- Technology stack decisions
- Architecture review
- Onboarding new developers

---

### 02 - API Contracts & Data Models (⚠️ Needs Expansion)

**File**: `02-api-contracts-data-models.md`

**Status**: Placeholder created but needs full content from exploration

**Covers**:
- ApiService method signatures
- All REST API endpoints
- Request parameter specifications
- Response type structures
- Data model interfaces
- Filter model specifications
- URL parameter mappings
- API adapter implementations
- Error handling patterns
- Environment configuration

**Key Endpoints Documented**:
1. `/manufacturer-model-combinations` - Paginated manufacturer/model list
2. `/vehicles/details` - Main vehicle search with filtering
3. `/vehicles/{id}/instances` - VIN instances for vehicle
4. `/vins` - All VINs with filtering
5. `/filters/{fieldName}` - Dynamic filter options

**Data Models Documented**:
- VehicleResult
- VehicleInstance
- VehicleStatistics
- SearchFilters
- HighlightFilters
- ManufacturerModelSelection
- API response structures

**Use Cases**:
- Backend API implementation
- API contract validation
- Frontend-backend integration
- API documentation
- Testing API endpoints

**⚠️ NOTE**: This file is currently a placeholder and needs full content from exploration results.

---

### 03 - Discover Feature Specification

**File**: `03-discover-feature-specification.md`

**Covers**:
- DiscoverComponent architecture
- 7-panel system configuration
- Drag-drop implementation (Angular CDK)
- Pop-out window system (MOVE semantics)
- State persistence (localStorage)
- BroadcastChannel communication
- Filter management
- Panel lifecycle
- Styling and theming
- User flows
- Error handling
- Integration points

**Panel Specifications**:
1. Query Control Panel
2. Model Picker Panel (Single Select)
3. Dual Checkbox Picker Panel
4. Base Dual Picker Panel (Experimental)
5. VIN Browser Panel
6. Vehicle Results Panel
7. Interactive Charts Panel

**Key Features Documented**:
- Panel drag-drop reordering
- Pop-out windows with auto-restore
- State synchronization across windows
- localStorage persistence
- Material Red theming
- Visual feedback (drag preview, placeholders)

**Use Cases**:
- Implementing the main discovery page
- Understanding panel system
- Pop-out window implementation
- Testing drag-drop functionality
- UX/UI design reference

---

### 04 - State Management Specification (62 KB)

**File**: `04-state-management-specification.md`

**Covers**:
- ResourceManagementService<TFilters, TData> generic architecture (660 lines)
- Complete API documentation for all public methods
- VehicleResourceManagementService factory implementation
- UrlStateService (434 lines) - URL parameter management
- FilterUrlMapperService - bidirectional filter-to-URL mapping
- RequestCoordinatorService (265 lines) - 3-layer request processing
- Adapter interfaces (FilterUrlMapper, ApiAdapter, CacheKeyBuilder)
- 8 detailed state flow diagrams
- Observable patterns and RxJS operators
- Pop-out window state synchronization
- URL-first design principle
- Error handling and retry logic
- Implementation guide with examples

**Use Cases**:
- Understanding URL-first state management
- Implementing generic resource management
- Setting up caching and deduplication
- Pop-out window state synchronization
- Migrating from legacy state management

---

### 05 - Data Visualization Components

**File**: `05-data-visualization-components.md`

**Covers**:
- BaseDataTableComponent<T> - complete generic table API
- Two operating modes: standalone vs. managed (by picker/results)
- TableDataSource interface and implementations
- ColumnManagerComponent - drag-drop column management
- BaseChartComponent + ChartDataSource composition pattern
- 4 concrete chart implementations (Manufacturer, Models, Year, BodyClass)
- PlotlyHistogramComponent (legacy 970-line component)
- BasePickerDataSource<T> - client/server pagination
- PickerConfig system - configuration-driven declarative pickers
- Observable patterns for data updates
- Pop-out window support
- Performance optimization (OnPush, virtual scrolling)

**Use Cases**:
- Building data tables with sorting/filtering/pagination
- Creating new chart visualizations
- Implementing configuration-driven pickers
- Managing table columns
- Understanding chart composition pattern

---

### 06 - Filter & Picker Components

**File**: `06-filter-picker-components.md`

**Covers**:
- QueryControlComponent - dialog-based filter creation
- 5 filter types (Manufacturer, Model, Year, Body Class, Data Source)
- BasePickerComponent - configuration-driven selection table
- URL hydration flow (pendingHydration → hydrateSelections)
- Selection state management (Set<string> for O(1) lookups)
- DualCheckboxPickerComponent - tri-state hierarchical selection
- Parent checkbox logic (unchecked/checked/indeterminate)
- Bulk selection (select/deselect all models for manufacturer)
- BaseDualPickerComponent - experimental config-driven dual picker
- Picker configuration examples (VIN picker, manufacturer-model picker)
- External filters support (auto-selection from Query Control)
- Integration patterns (Query Control + Picker)
- Pop-out mode (BroadcastChannel messaging)

**Use Cases**:
- Implementing filter dialogs
- Creating new picker components
- Understanding tri-state checkbox logic
- URL-based selection hydration
- Filter and picker integration

---

### 07 - Pop-Out Window System

**File**: `07-popout-window-system.md`

**Covers**:
- MOVE semantics architecture (panel disappears from main window)
- PopOutContextService - detection and BroadcastChannel messaging
- Main window orchestration (DiscoverComponent popOutPanel())
- Pop-out window container (PanelPopoutComponent routing)
- BroadcastChannel implementation (per-panel channels)
- URL-first in pop-outs (critical fix - each window watches own URL)
- Highlight preservation in syncStateFromExternal()
- Message protocol (9 message types documented)
- Window close detection (500ms polling)
- Error handling (pop-up blockers, communication failures)
- Browser compatibility (BroadcastChannel support)
- Testing considerations (unit + E2E)
- Performance optimizations (polling, message throttling)
- Future enhancements (drag to pop-out, multi-monitor positioning)

**Use Cases**:
- Implementing pop-out window feature
- Understanding BroadcastChannel messaging
- Pop-out state synchronization
- Multi-window dashboard support

---

### 08 - Non-Functional Requirements

**File**: `08-non-functional-requirements.md`

**Covers**:
- Performance requirements (bundle size, load time, runtime)
- Bundle size budgets (5MB warning, 10MB error)
- Load time targets (< 3s FCP, < 4s TTI)
- Browser compatibility (.browserslistrc - Chrome, Firefox, Edge, Safari)
- Accessibility (WCAG 2.1 Level AA compliance)
- Keyboard navigation, screen reader support, color contrast
- Security requirements (HTTPS, CSP, XSS/CSRF protection)
- Authentication/authorization (JWT, RBAC)
- Scalability & capacity (100 concurrent users, data volume limits)
- Caching strategy (frontend + backend)
- Error handling standards (HTTP error categorization, retry logic)
- Global error handler (ChunkLoadError detection)
- Logging & monitoring (console logging, performance metrics)
- Code quality standards (TypeScript strict mode, ESLint, Prettier)
- API performance SLAs (response time targets by endpoint)
- Testing requirements (code coverage targets)

**Use Cases**:
- Setting performance budgets
- Ensuring accessibility compliance
- Implementing security measures
- Planning scalability
- Establishing quality standards

---

### 09 - Testing Strategy

**File**: `09-testing-strategy.md`

**Covers**:
- Testing pyramid (60% unit, 30% integration, 10% E2E)
- Unit testing (Karma + Jasmine + Angular Testing Utilities)
- Service testing patterns (HttpTestingController, fakeAsync, tick)
- Component testing (TestBed, mocks, OnPush handling)
- E2E testing (Playwright configuration)
- 7 E2E test categories (Basic Filters, Pop-Out Lifecycle, etc.)
- Test patterns (Arrange-Act-Assert, Page Object Model)
- Testing complex features (drag-drop, pop-outs, charts, state)
- Mock data factories and test helpers
- Integration testing (component + service)
- Code coverage targets (75% minimum, 85% target)
- CI/CD integration (pipeline stages, test commands)
- Test parallelization strategies
- Best practices (isolation, descriptive names, flaky test prevention)
- Future enhancements (visual regression, performance, accessibility, mutation testing)

**Use Cases**:
- Writing unit tests for services and components
- Creating E2E test scenarios
- Understanding test organization
- Setting up CI/CD pipeline
- Achieving code coverage targets

---

## DOCUMENT CONVENTIONS

### Status Indicators

- ✅ **Complete**: Specification is comprehensive and ready for implementation
- 🚧 **In Progress**: Actively being written
- ⏸️ **Planned**: Scheduled but not yet started
- ❌ **Blocked**: Waiting on dependencies

### Document Structure

Each specification follows this structure:

1. **Header**: Title, branch, status, date
2. **Overview**: Purpose and scope
3. **Key Features**: Highlights
4. **Detailed Specification**: Implementation details
5. **Integration Points**: How it connects to other components
6. **User Flows**: Common usage scenarios
7. **Error Handling**: Edge cases
8. **Testing Considerations**: What to test
9. **Future Enhancements**: Potential improvements

### Code Examples

- TypeScript interfaces with JSDoc comments
- Component templates (HTML)
- Styling examples (SCSS)
- Configuration objects
- API request/response examples

---

## HOW TO USE THESE SPECIFICATIONS

### For Frontend Developers

1. **Start with**: `01-architectural-analysis.md` for overall understanding
2. **Refer to**: `02-api-contracts-data-models.md` for API integration
3. **Implement**: Using feature-specific specs (e.g., `03-discover-feature-specification.md`)
4. **Follow**: Code organization and naming conventions from architectural analysis
5. **Test**: Using patterns from testing strategy document

### For Backend Developers

1. **Start with**: `02-api-contracts-data-models.md` for API requirements
2. **Reference**: Data models and response structures
3. **Implement**: Endpoints matching exact specifications
4. **Validate**: Request/response formats match examples
5. **Test**: Using API contract tests

### For Product Managers

1. **Read**: Feature specifications for user-facing functionality
2. **Review**: User flows for UX understanding
3. **Validate**: Requirements match business needs
4. **Plan**: Using feature completeness indicators

### For QA Engineers

1. **Start with**: Feature specifications
2. **Create test plans**: Based on user flows
3. **Test edge cases**: From error handling sections
4. **Validate**: Non-functional requirements
5. **Automate**: Using E2E test scenarios

---

## REFINEMENT PROCESS

These are **working specifications** that will be refined through:

1. **Technical Review**: Architecture and implementation validation
2. **Business Review**: Feature and requirement validation
3. **Developer Feedback**: Practicality and completeness
4. **Gap Analysis**: Missing information identification
5. **Iterative Updates**: Continuous improvement

---

## QUESTIONS OR FEEDBACK

For questions, clarifications, or feedback on these specifications:

1. **Missing Information**: Note which spec and what's missing
2. **Unclear Requirements**: Flag ambiguous sections
3. **Technical Errors**: Identify inaccuracies
4. **Additional Context Needed**: Request more detail

---

## VERSION HISTORY

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2025-11-15 | Initial specifications created (01-03) | Claude |
| 1.0 | 2025-11-15 | Complete specification set (04-09) | Claude |

---

## SPECIFICATION STATISTICS

**Total Specifications**: 9 documents
**Total Size**: ~248 KB (excluding README)
**Completion Status**: 8 complete, 1 needs expansion

**Size Breakdown**:
- 01 - Architectural Analysis: 72 KB
- 02 - API Contracts & Data Models: 837 bytes (needs expansion)
- 03 - Discover Feature: 9.3 KB
- 04 - State Management: 61 KB
- 05 - Data Visualization: 21 KB
- 06 - Filter & Picker: 15 KB
- 07 - Pop-Out Window System: 16 KB
- 08 - Non-Functional Requirements: 22 KB
- 09 - Testing Strategy: 32 KB

**Coverage**:
- ✅ Architecture & Design
- ⚠️ API Contracts (placeholder only)
- ✅ Feature Specifications
- ✅ State Management
- ✅ UI Components
- ✅ Pop-Out Windows
- ✅ Quality Standards
- ✅ Testing Strategy

---

## NOTES

- All specifications are based on the `experiment/resource-management-service` branch
- The application is undergoing NG-ZORRO → PrimeNG migration
- The state management system is transitioning from StateManagementService to ResourceManagementService
- Some legacy patterns may exist in the codebase during migration
- **Document 02 (API Contracts)** needs full expansion from codebase exploration

---

**Last Updated**: 2025-11-15
**Status**: Complete (8/9 specifications ready for implementation)
**Next Steps**: Expand API Contracts specification with full endpoint documentation
