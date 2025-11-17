# TESTING STRATEGY SPECIFICATION
## Unit Tests, Integration Tests, and E2E Testing
### Branch: experiment/resource-management-service

**Status**: Working Draft
**Date**: 2025-11-15

---

## OVERVIEW

This specification defines the comprehensive testing strategy for the Vehicle Discovery Platform. It covers unit testing, integration testing, end-to-end testing, test organization, mock data patterns, and CI/CD integration.

**Testing Stack**:
- **Unit Tests**: Karma + Jasmine + Angular Testing Utilities
- **E2E Tests**: Playwright (cross-browser testing)
- **Coverage**: Istanbul (Karma coverage reporter)
- **Browsers**: ChromeHeadless (CI), Chrome/Firefox/Edge (local)

**Testing Philosophy**:
- Write tests that document expected behavior
- Favor integration tests over isolated unit tests
- Test user journeys, not implementation details
- Maintain fast feedback loops (< 60 seconds for unit tests)
- Automate critical paths with E2E tests

---

## 1. TESTING PYRAMID

### 1.1 Test Distribution

```
         /\
        /E2E\           10% - E2E Tests (Critical Journeys)
       /------\
      /  INT   \        30% - Integration Tests (Component + Service)
     /----------\
    /   UNIT     \      60% - Unit Tests (Services, Pipes, Guards)
   /--------------\
```

**Target Test Counts** (for complete application):
- **Unit Tests**: ~300 tests (services, pipes, guards, utilities)
- **Integration Tests**: ~150 tests (components with dependencies)
- **E2E Tests**: ~50 tests (7 categories × 7 tests each)

**Total**: ~500 tests

### 1.2 Test Execution Time Targets

| Test Type | Target Time | Maximum Time | Frequency |
|-----------|-------------|--------------|-----------|
| Unit Tests | < 30 seconds | < 60 seconds | On every file save |
| Integration Tests | < 60 seconds | < 120 seconds | On commit |
| E2E Tests (Full Suite) | < 5 minutes | < 10 minutes | On push/PR |
| E2E Tests (Smoke) | < 1 minute | < 2 minutes | On every commit |

---

## 2. UNIT TESTING (KARMA + JASMINE)

### 2.1 Configuration

**File**: `karma.conf.js`

```javascript
module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    browsers: ['ChromeHeadlessCI'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-dev-shm-usage'
        ]
      }
    },
    coverageReporter: {
      dir: './coverage/autos',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' },
        { type: 'lcov' }  // For CI integration
      ]
    },
    singleRun: true  // CI mode
  });
};
```

### 2.2 Service Testing Patterns

#### Basic Service Test

```typescript
describe('RequestCoordinatorService', () => {
  let service: RequestCoordinatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RequestCoordinatorService]
    });
    service = TestBed.inject(RequestCoordinatorService);
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('should execute a simple request', (done) => {
    const mockData = { test: 'data' };
    const requestFn = () => of(mockData);

    service.execute('test-key', requestFn).subscribe(data => {
      expect(data).toEqual(mockData);
      done();
    });
  });
});
```

#### Testing Observables with fakeAsync

```typescript
it('should update loading state during request', fakeAsync(() => {
  const loadingStates: RequestState[] = [];
  const requestFn = () => of({ data: 'test' }).pipe(delay(100));

  service.getLoadingState$('test-key').subscribe(state => {
    loadingStates.push({ ...state });
  });

  service.execute('test-key', requestFn).subscribe();

  tick(50); // Mid-request
  expect(loadingStates.some(s => s.loading === true)).toBe(true);

  tick(100); // After completion
  expect(loadingStates[loadingStates.length - 1].loading).toBe(false);
}));
```

#### Testing HTTP Requests

```typescript
describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  it('should fetch vehicles with filters', () => {
    const mockResponse = {
      results: [{ id: 1, manufacturer: 'Ford' }],
      total: 1
    };

    service.getVehicles({ manufacturer: 'Ford' }).subscribe(data => {
      expect(data.results.length).toBe(1);
      expect(data.results[0].manufacturer).toBe('Ford');
    });

    const req = httpMock.expectOne(req =>
      req.url.includes('/vehicles/details') &&
      req.params.has('manufacturer')
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
```

### 2.3 Component Testing Patterns

#### Simple Component Test

```typescript
describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]  // Allow custom elements
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render navigation and router outlet', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navigation')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
```

#### Component with Service Dependencies

```typescript
describe('DiscoverComponent', () => {
  let component: DiscoverComponent;
  let fixture: ComponentFixture<DiscoverComponent>;
  let mockStateService: jasmine.SpyObj<VehicleResourceManagementService>;

  beforeEach(async () => {
    // Create mock service
    mockStateService = jasmine.createSpyObj('VehicleResourceManagementService', [
      'updateFilters',
      'clearFilters',
      'getCurrentState'
    ]);
    mockStateService.state$ = of({
      filters: {},
      data: null,
      loading: false,
      error: null
    });

    await TestBed.configureTestingModule({
      declarations: [DiscoverComponent],
      providers: [
        { provide: VehicleResourceManagementService, useValue: mockStateService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverComponent);
    component = fixture.componentInstance;
  });

  it('should update filters when filter added', () => {
    const filter = { manufacturer: 'Ford' };
    component.onFilterAdd({ type: 'manufacturer', field: 'manufacturer', value: 'Ford' });

    expect(mockStateService.updateFilters).toHaveBeenCalledWith(
      jasmine.objectContaining(filter)
    );
  });
});
```

#### Testing OnPush Components

```typescript
it('should update view when data changes (OnPush)', () => {
  const fixture = TestBed.createComponent(ResultsTableComponent);
  const component = fixture.componentInstance;
  const cdr = fixture.debugElement.injector.get(ChangeDetectorRef);

  // Trigger data change
  component.data = [{ id: 1, manufacturer: 'Ford' }];
  cdr.markForCheck();  // Required for OnPush
  fixture.detectChanges();

  const rows = fixture.nativeElement.querySelectorAll('tr');
  expect(rows.length).toBe(2);  // Header + 1 data row
});
```

### 2.4 Testing Utilities

#### Mock Data Factories

```typescript
// test-helpers/mock-data.ts
export class MockDataFactory {
  static createVehicleResult(overrides?: Partial<VehicleResult>): VehicleResult {
    return {
      id: 1,
      manufacturer: 'Ford',
      model: 'F-150',
      year: 2020,
      bodyClass: 'Truck',
      dataSource: 'NHTSA',
      count: 100,
      ...overrides
    };
  }

  static createVehicleStatistics(overrides?: Partial<VehicleStatistics>): VehicleStatistics {
    return {
      manufacturerCounts: { Ford: 1500, Chevrolet: 1200 },
      modelCounts: { 'F-150': 500, 'Silverado': 450 },
      yearCounts: { 2020: 800, 2021: 700 },
      bodyClassCounts: { Truck: 1000, Sedan: 800 },
      ...overrides
    };
  }
}
```

#### Test Helpers

```typescript
// test-helpers/component-helpers.ts
export function findByTestId(fixture: ComponentFixture<any>, testId: string): HTMLElement {
  return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}

export function clickButton(fixture: ComponentFixture<any>, testId: string): void {
  const button = findByTestId(fixture, testId);
  button.click();
  fixture.detectChanges();
}

export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## 3. E2E TESTING (PLAYWRIGHT)

### 3.1 Configuration

**File**: `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,  // Serial execution for stability
  retries: process.env.CI ? 2 : 0,
  workers: 1,  // Single worker for debugging

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright/reports' }]
  ],

  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1920, height: 1080 }
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ]
});
```

### 3.2 E2E Test Categories

**Organized by Feature Area**:

1. **Category 1: Basic Filters** (Tests 002-020)
   - Add/remove/clear filters
   - Filter combinations
   - URL state management

2. **Category 2: Pop-Out Lifecycle** (Tests 021-040)
   - Open/close pop-out windows
   - Panel restoration
   - Window positioning

3. **Category 3: Filter-PopOut Interactions** (Tests 041-060)
   - Filter changes in pop-out windows
   - State synchronization
   - BroadcastChannel messaging

4. **Category 4: Highlight Operations** (Tests 061-080)
   - Add/remove highlights
   - Chart updates
   - Highlight persistence

5. **Category 5: Multi-Window Sync** (Tests 081-100)
   - Multiple pop-outs open
   - Concurrent state updates
   - Cross-window consistency

6. **Category 6: URL Persistence** (Tests 101-120)
   - Browser back/forward
   - Bookmark/share URLs
   - Page refresh

7. **Category 7: Errors & Edge Cases** (Tests 121-140)
   - Pop-up blockers
   - Network failures
   - Invalid URL parameters

### 3.3 E2E Test Patterns

#### Basic Filter Test

```typescript
test('should add manufacturer filter', async ({ page }) => {
  await page.goto('/discover');
  await page.waitForLoadState('networkidle');

  // Add filter via URL (simulating Query Control)
  await page.goto('/discover?manufacturer=Ford');
  await page.waitForLoadState('networkidle');

  // Verify URL
  await expect(page).toHaveURL(/manufacturer=Ford/);

  // Verify filter chip appears
  await page.waitForSelector('.filter-chips', { state: 'visible' });
  const chipCount = await page.locator('.filter-chip').count();
  expect(chipCount).toBe(1);

  // Verify results filtered
  const resultsText = await page.locator('.result-count').last().textContent();
  expect(resultsText).toMatch(/\d+\s+result/);
});
```

#### Pop-Out Window Test

```typescript
test('should open and close pop-out window', async ({ page, context }) => {
  await page.goto('/discover');
  await page.waitForLoadState('networkidle');

  // Click pop-out button
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.click('[data-testid="popout-button-model-picker"]')
  ]);

  // Verify pop-out URL
  expect(popup.url()).toContain('/panel/discover/model-picker/picker');

  // Verify placeholder in main window
  await expect(page.locator('.popout-placeholder')).toBeVisible();

  // Close pop-out
  await popup.close();

  // Verify panel restored
  await expect(page.locator('.popout-placeholder')).not.toBeVisible();
  await expect(page.locator('[data-testid="model-picker-panel"]')).toBeVisible();
});
```

#### Multi-Window Synchronization Test

```typescript
test('should sync state across multiple windows', async ({ page, context }) => {
  await page.goto('/discover');

  // Open pop-out
  const [popup] = await Promise.all([
    context.waitForEvent('page'),
    page.click('[data-testid="popout-button-query-control"]')
  ]);

  // Add filter in main window
  await page.goto('/discover?manufacturer=Ford');
  await page.waitForTimeout(500);  // Wait for BroadcastChannel sync

  // Verify filter appears in pop-out
  const popupChipCount = await popup.locator('.filter-chip').count();
  expect(popupChipCount).toBe(1);

  // Add filter in pop-out
  // (Simulated via URL navigation in pop-out)
  await popup.goto('/panel/discover/query-control/query-control?manufacturer=Ford&model=F-150');
  await popup.waitForTimeout(500);

  // Verify main window updated
  await expect(page).toHaveURL(/model=F-150/);
  const mainChipCount = await page.locator('.filter-chip').count();
  expect(mainChipCount).toBe(2);
});
```

### 3.4 Page Object Model (POM)

**Pattern**: Encapsulate page interactions in reusable objects

```typescript
// e2e/page-objects/discover-page.ts
export class DiscoverPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/discover');
    await this.page.waitForLoadState('networkidle');
  }

  async addManufacturerFilter(manufacturer: string) {
    await this.page.goto(`/discover?manufacturer=${manufacturer}`);
    await this.page.waitForLoadState('networkidle');
  }

  async clearAllFilters() {
    await this.page.click('button:has-text("Clear All")');
    await this.page.waitForLoadState('networkidle');
  }

  async getFilterChipCount(): Promise<number> {
    return await this.page.locator('.filter-chip').count();
  }

  async getResultsCount(): Promise<number> {
    const text = await this.page.locator('.result-count').last().textContent();
    const match = text?.match(/(\d+)\s+result/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async popOutPanel(panelId: string): Promise<Page> {
    const [popup] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.page.click(`[data-testid="popout-button-${panelId}"]`)
    ]);
    return popup;
  }
}

// Usage in tests
test('should filter results', async ({ page }) => {
  const discoverPage = new DiscoverPage(page);
  await discoverPage.goto();
  await discoverPage.addManufacturerFilter('Ford');

  const chipCount = await discoverPage.getFilterChipCount();
  expect(chipCount).toBe(1);
});
```

---

## 4. INTEGRATION TESTING

### 4.1 Component + Service Integration

```typescript
describe('DiscoverComponent + VehicleResourceManagementService (Integration)', () => {
  let component: DiscoverComponent;
  let fixture: ComponentFixture<DiscoverComponent>;
  let stateService: VehicleResourceManagementService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        HttpClientTestingModule,
        RouterTestingModule
      ],
      declarations: [DiscoverComponent],
      providers: [
        VehicleResourceManagementService,
        UrlStateService,
        RequestCoordinatorService,
        // ... all real services
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverComponent);
    component = fixture.componentInstance;
    stateService = TestBed.inject(VehicleResourceManagementService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should fetch data when filter added', fakeAsync(() => {
    fixture.detectChanges();

    // Add filter
    component.onFilterAdd({
      type: 'manufacturer',
      field: 'manufacturer',
      value: 'Ford'
    });

    tick();

    // Expect HTTP request
    const req = httpMock.expectOne(req =>
      req.url.includes('/vehicles/details') &&
      req.params.has('manufacturer')
    );
    req.flush({
      results: [{ id: 1, manufacturer: 'Ford' }],
      total: 1
    });

    tick();

    // Verify state updated
    const state = stateService.getCurrentState();
    expect(state.data?.results.length).toBe(1);
    expect(state.filters.manufacturer).toBe('Ford');
  }));
});
```

### 4.2 State Management Integration

```typescript
describe('URL-First State Management (Integration)', () => {
  let urlState: UrlStateService;
  let stateService: VehicleResourceManagementService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule.withRoutes([
        { path: 'discover', component: DummyComponent }
      ])],
      providers: [
        UrlStateService,
        VehicleResourceManagementService,
        // ... other services
      ]
    });

    urlState = TestBed.inject(UrlStateService);
    stateService = TestBed.inject(VehicleResourceManagementService);
    router = TestBed.inject(Router);
  });

  it('should sync URL → State → Components', fakeAsync(() => {
    // Navigate with URL parameters
    router.navigate(['/discover'], {
      queryParams: { manufacturer: 'Ford', year: '2020' }
    });
    tick();

    // Verify state updated
    const state = stateService.getCurrentState();
    expect(state.filters.manufacturer).toBe('Ford');
    expect(state.filters.year).toBe('2020');

    // Verify URL reflects state
    expect(router.url).toContain('manufacturer=Ford');
    expect(router.url).toContain('year=2020');
  }));
});
```

---

## 5. MOCK DATA & TEST FIXTURES

### 5.1 Mock API Responses

```typescript
// test-fixtures/api-responses.ts
export const MOCK_VEHICLE_RESULTS: VehicleResult[] = [
  {
    id: 1,
    manufacturer: 'Ford',
    model: 'F-150',
    year: 2020,
    bodyClass: 'Truck',
    dataSource: 'NHTSA',
    count: 500
  },
  {
    id: 2,
    manufacturer: 'Chevrolet',
    model: 'Silverado',
    year: 2020,
    bodyClass: 'Truck',
    dataSource: 'NHTSA',
    count: 450
  }
];

export const MOCK_STATISTICS: VehicleStatistics = {
  manufacturerCounts: {
    'Ford': 1500,
    'Chevrolet': 1200,
    'Toyota': 1100
  },
  modelCounts: {
    'F-150': 500,
    'Silverado': 450,
    'Camry': 400
  },
  yearCounts: {
    '2020': 800,
    '2021': 700,
    '2022': 600
  },
  bodyClassCounts: {
    'Truck': 1000,
    'Sedan': 800,
    'SUV': 700
  }
};

export const MOCK_MANUFACTURER_MODEL_COMBOS = [
  { manufacturer: 'Ford', model: 'F-150', count: 500 },
  { manufacturer: 'Ford', model: 'Mustang', count: 300 },
  { manufacturer: 'Chevrolet', model: 'Silverado', count: 450 }
];
```

### 5.2 Test Builders

```typescript
// test-helpers/builders/filter-builder.ts
export class FilterBuilder {
  private filters: Partial<SearchFilters> = {};

  withManufacturer(manufacturer: string): this {
    this.filters.manufacturer = manufacturer;
    return this;
  }

  withModel(model: string): this {
    this.filters.model = model;
    return this;
  }

  withYearRange(min: number, max: number): this {
    this.filters.yearMin = min;
    this.filters.yearMax = max;
    return this;
  }

  build(): SearchFilters {
    return this.filters as SearchFilters;
  }
}

// Usage
const filters = new FilterBuilder()
  .withManufacturer('Ford')
  .withModel('F-150')
  .withYearRange(2020, 2022)
  .build();
```

---

## 6. TESTING COMPLEX FEATURES

### 6.1 Drag-Drop Testing

**Unit Test** (Mock DragEvent):

```typescript
it('should reorder panels on drop', () => {
  const initialOrder = ['panel-1', 'panel-2', 'panel-3'];
  component.panels = initialOrder.map(id => ({ id, title: id }));

  // Simulate drag event
  const event = {
    previousIndex: 0,
    currentIndex: 2,
    item: { data: 'panel-1' }
  } as CdkDragDrop<any>;

  component.onPanelDrop(event);

  expect(component.panels.map(p => p.id)).toEqual(['panel-2', 'panel-3', 'panel-1']);
});
```

**E2E Test** (Playwright):

```typescript
test('should reorder panels via drag-drop', async ({ page }) => {
  await page.goto('/discover');

  // Get initial order
  const initialOrder = await page.locator('.panel-title').allTextContents();

  // Drag first panel to third position
  const panel1 = page.locator('.panel').first();
  const panel3 = page.locator('.panel').nth(2);

  await panel1.dragTo(panel3);

  // Verify new order
  const newOrder = await page.locator('.panel-title').allTextContents();
  expect(newOrder).not.toEqual(initialOrder);
  expect(newOrder[2]).toBe(initialOrder[0]);
});
```

### 6.2 Pop-Out Window Testing

**Focus**: BroadcastChannel communication, window lifecycle

```typescript
describe('PopOutContextService', () => {
  let service: PopOutContextService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [PopOutContextService]
    });
    service = TestBed.inject(PopOutContextService);
    router = TestBed.inject(Router);
  });

  it('should detect pop-out mode from URL', () => {
    // Mock router URL
    spyOnProperty(router, 'url', 'get').and.returnValue('/panel/discover/panel-1/picker');

    expect(service.isInPopOut()).toBe(true);
  });

  it('should send messages via BroadcastChannel', () => {
    const channelSpy = jasmine.createSpyObj('BroadcastChannel', ['postMessage', 'close']);
    spyOn(window, 'BroadcastChannel' as any).and.returnValue(channelSpy);

    service.initializeAsPopOut('test-panel');
    service.sendMessage({ type: 'TEST', payload: { data: 'test' } });

    expect(channelSpy.postMessage).toHaveBeenCalledWith({
      type: 'TEST',
      payload: { data: 'test' }
    });
  });
});
```

### 6.3 Chart Rendering Testing

**Challenge**: Plotly.js is heavy and async

```typescript
describe('PlotlyHistogramComponent', () => {
  let component: PlotlyHistogramComponent;
  let fixture: ComponentFixture<PlotlyHistogramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PlotlyHistogramComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PlotlyHistogramComponent);
    component = fixture.componentInstance;
  });

  it('should render chart when data provided', fakeAsync(() => {
    const mockStats: VehicleStatistics = {
      manufacturerCounts: { Ford: 100, Chevrolet: 80 }
    };

    component.statistics = mockStats;
    component.selectedField = 'manufacturer';
    fixture.detectChanges();

    tick(1000);  // Wait for Plotly rendering

    // Verify Plotly.newPlot was called
    const plotlyDiv = fixture.nativeElement.querySelector('.plotly-chart');
    expect(plotlyDiv).toBeTruthy();
    expect(plotlyDiv.data).toBeDefined();  // Plotly attaches data to div
  }));
});
```

**Alternative**: Test chart data transformation separately

```typescript
describe('ManufacturerChartDataSource', () => {
  let dataSource: ManufacturerChartDataSource;

  beforeEach(() => {
    dataSource = new ManufacturerChartDataSource();
  });

  it('should transform statistics to chart data', () => {
    const stats: VehicleStatistics = {
      manufacturerCounts: { Ford: 100, Chevrolet: 80, Toyota: 60 }
    };

    const chartData = dataSource.transform(stats, {}, null, 800);

    expect(chartData).toBeDefined();
    expect(chartData.data[0].x).toEqual(['Ford', 'Chevrolet', 'Toyota']);
    expect(chartData.data[0].y).toEqual([100, 80, 60]);
    expect(chartData.data[0].type).toBe('bar');
  });
});
```

---

## 7. CODE COVERAGE

### 7.1 Coverage Targets

**By File Type**:

| File Type | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| Services | 80% | 90% |
| Components | 70% | 85% |
| Pipes | 90% | 100% |
| Guards | 90% | 100% |
| Interceptors | 80% | 95% |
| Utilities | 85% | 95% |

**Overall**: 75% minimum, 85% target

### 7.2 Coverage Reports

**Generate Coverage**:

```bash
ng test --code-coverage --watch=false
```

**Output**:
- HTML report: `coverage/autos/index.html`
- LCOV format: `coverage/autos/lcov.info` (for CI)
- Text summary: Console output

**Example Output**:

```
=============================== Coverage summary ===============================
Statements   : 78.5% ( 1234/1572 )
Branches     : 72.3% ( 456/631 )
Functions    : 81.2% ( 234/288 )
Lines        : 77.8% ( 1156/1486 )
================================================================================
```

### 7.3 Coverage Enforcement (CI)

```yaml
# .gitlab-ci.yml or .github/workflows/test.yml
test:
  script:
    - npm run test:coverage
    - npm run test:coverage:check
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
```

```json
// package.json
{
  "scripts": {
    "test:coverage": "ng test --code-coverage --watch=false",
    "test:coverage:check": "node scripts/check-coverage.js"
  }
}
```

```javascript
// scripts/check-coverage.js
const coverage = require('../coverage/autos/coverage-summary.json');
const { total } = coverage;

const threshold = 75;

if (total.lines.pct < threshold) {
  console.error(`Coverage ${total.lines.pct}% is below threshold ${threshold}%`);
  process.exit(1);
}

console.log(`✅ Coverage ${total.lines.pct}% meets threshold ${threshold}%`);
```

---

## 8. CI/CD INTEGRATION

### 8.1 Pipeline Stages

```yaml
stages:
  - build
  - test
  - e2e
  - deploy

build:
  stage: build
  script:
    - npm ci
    - ng build --configuration production
  artifacts:
    paths:
      - dist/

test:unit:
  stage: test
  script:
    - npm run test:coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/autos/cobertura-coverage.xml

test:e2e:smoke:
  stage: test
  script:
    - npm run e2e:smoke  # Quick smoke tests only
  retry: 2

test:e2e:full:
  stage: e2e
  script:
    - npm run e2e:full
  retry: 2
  only:
    - main
    - develop
```

### 8.2 Test Commands

```json
{
  "scripts": {
    "test": "ng test",
    "test:once": "ng test --watch=false",
    "test:coverage": "ng test --code-coverage --watch=false",
    "test:headless": "ng test --watch=false --browsers=ChromeHeadlessCI",

    "e2e": "playwright test",
    "e2e:smoke": "playwright test --grep '@smoke'",
    "e2e:full": "playwright test",
    "e2e:ui": "playwright test --ui",
    "e2e:debug": "playwright test --debug",
    "e2e:report": "playwright show-report playwright/reports"
  }
}
```

### 8.3 Test Parallelization

**Unit Tests**: Run in parallel by default (Karma)

**E2E Tests**: Configure workers

```typescript
// playwright.config.ts
export default defineConfig({
  workers: process.env.CI ? 2 : 1,  // 2 workers on CI
  fullyParallel: true  // Enable parallel execution
});
```

**Grouping Tests** (for stability):

```typescript
// e2e/category-1-basic-filters.spec.ts
test.describe.configure({ mode: 'serial' });  // Run tests in this file serially

test.describe('Category 1: Basic Filters', () => {
  // Tests run one after another
});
```

---

## 9. TESTING BEST PRACTICES

### 9.1 General Principles

1. **Arrange-Act-Assert Pattern**:
```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const input = 'test';
  const expected = 'TEST';

  // Act: Execute the code under test
  const result = service.transform(input);

  // Assert: Verify the result
  expect(result).toBe(expected);
});
```

2. **One Assertion Per Test** (when possible):
```typescript
// Good
it('should return uppercase string', () => {
  expect(service.toUpperCase('test')).toBe('TEST');
});

it('should trim whitespace', () => {
  expect(service.toUpperCase('  test  ')).toBe('TEST');
});

// Avoid (unless related)
it('should transform string', () => {
  expect(service.toUpperCase('test')).toBe('TEST');
  expect(service.toLowerCase('TEST')).toBe('test');  // Different concern
});
```

3. **Descriptive Test Names**:
```typescript
// Good
it('should return empty array when no filters applied', () => {});
it('should throw error when invalid date provided', () => {});
it('should cache result for 5 minutes after first request', () => {});

// Bad
it('should work', () => {});
it('test filter', () => {});
```

4. **Test Isolation**:
```typescript
// Each test should be independent
beforeEach(() => {
  // Reset state before each test
  TestBed.resetTestingModule();
  service = new MyService();
});
```

### 9.2 What to Test

**✅ DO Test**:
- Public API methods
- Component outputs (events)
- State changes
- Error handling
- Edge cases (null, undefined, empty arrays)
- Integration between components and services

**❌ DON'T Test**:
- Private methods (test through public API)
- Framework internals (Angular, PrimeNG)
- Third-party libraries (Plotly.js)
- Getters/setters (unless complex logic)
- Trivial code (auto-generated, obvious)

### 9.3 Flaky Test Prevention

**Common Causes**:
- Race conditions (async timing)
- Shared state between tests
- External dependencies (network, time)
- Non-deterministic data (random, Date.now())

**Solutions**:

```typescript
// Bad: Race condition
it('should update after 1 second', (done) => {
  service.delayedUpdate();
  setTimeout(() => {
    expect(service.value).toBe('updated');
    done();
  }, 1000);  // What if it takes 1001ms?
});

// Good: Use fakeAsync
it('should update after 1 second', fakeAsync(() => {
  service.delayedUpdate();
  tick(1000);
  expect(service.value).toBe('updated');
}));

// Bad: Shared state
let sharedData = [];
it('test 1', () => {
  sharedData.push('item');  // Affects test 2
});

// Good: Isolated state
let localData: string[];
beforeEach(() => {
  localData = [];
});

// Bad: Real date
it('should format date', () => {
  const now = new Date();  // Changes every run
});

// Good: Fixed date
it('should format date', () => {
  const fixedDate = new Date('2025-11-15');
});
```

---

## 10. FUTURE ENHANCEMENTS

### 10.1 Visual Regression Testing

**Tool**: Percy, Chromatic, or Playwright screenshots

```typescript
test('should match screenshot', async ({ page }) => {
  await page.goto('/discover');
  await expect(page).toHaveScreenshot('discover-page.png');
});
```

### 10.2 Performance Testing

**Tool**: Lighthouse CI

```yaml
lighthouse:
  script:
    - npm install -g @lhci/cli
    - lhci autorun
  artifacts:
    reports:
      lhci: ./lhci-reports
```

### 10.3 Accessibility Testing

**Tool**: axe-core + Playwright

```typescript
test('should have no accessibility violations', async ({ page }) => {
  await page.goto('/discover');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toHaveLength(0);
});
```

### 10.4 Mutation Testing

**Tool**: Stryker Mutator

```bash
npm install --save-dev @stryker-mutator/core
npx stryker run
```

Verifies that tests actually catch bugs (not just code coverage).

---

## SUMMARY

This testing strategy provides:

- ✅ **Comprehensive Coverage**: Unit, integration, and E2E tests
- ✅ **Fast Feedback**: < 60 seconds for unit tests
- ✅ **Automated Testing**: CI/CD integration with coverage enforcement
- ✅ **Test Organization**: 7 E2E categories covering all features
- ✅ **Mock Data Patterns**: Reusable fixtures and builders
- ✅ **Complex Feature Testing**: Drag-drop, pop-outs, charts, state management
- ✅ **Best Practices**: AAA pattern, isolation, descriptive names
- ✅ **Coverage Targets**: 75% minimum, 85% target

**Key Testing Files**:
- Unit tests: `*.spec.ts` (co-located with source)
- E2E tests: `e2e/category-*.spec.ts`
- Configuration: `karma.conf.js`, `playwright.config.ts`
- Page objects: `e2e/page-objects/`
- Test helpers: `test-helpers/`, `test-fixtures/`

**Total Test Count**: ~500 tests across all categories
**Execution Time**: < 10 minutes for full suite

**End of Specification**
