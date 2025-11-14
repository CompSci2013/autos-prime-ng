import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from '@angular/core';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ApiService } from '../../../services/api.service';
import { RequestCoordinatorService } from '../../../core/services/request-coordinator.service';
// EXPERIMENT: Swap StateManagementService with VehicleResourceManagementService
// import { StateManagementService } from '../../../core/services/state-management.service';
import { VehicleResourceManagementService } from '../../../core/services/vehicle-resource-management.factory';
import { SearchFilters } from '../../../models/search-filters.model';

/**
 * Field definition for query control dropdown
 */
export interface QueryField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'range' | 'multiselect';
  placeholder?: string;
}

/**
 * Query filter value from dialog
 */
export interface QueryFilter {
  field: string;
  fieldLabel: string;
  type: 'string' | 'number' | 'range' | 'multiselect';
  value?: string | number;
  values?: string[]; // For multiselect
  rangeMin?: number;
  rangeMax?: number;
}

/**
 * Active filter chip for display
 */
export interface FilterChip {
  field: string;
  label: string;
  displayValue: string;
  color: string;
}

@Component({
  selector: 'app-query-control',
  templateUrl: './query-control.component.html',
  styleUrls: ['./query-control.component.scss'],
})
export class QueryControlComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ========== OUTPUTS ==========

  /** Emits when a filter is added */
  @Output() filterAdd = new EventEmitter<QueryFilter>();

  /** Emits when a filter is removed */
  @Output() filterRemove = new EventEmitter<{ field: string; updates: Partial<SearchFilters> }>();

  /** Emits when a highlight is removed */
  @Output() highlightRemove = new EventEmitter<string>();

  /** Emits when all highlights should be cleared */
  @Output() clearHighlights = new EventEmitter<void>();

  // ========== STATE ==========

  /** Active filter chips for display */
  activeFilterChips: FilterChip[] = [];

  /** Active highlight chips for display (separate from filters) */
  activeHighlightChips: FilterChip[] = [];

  /** Available fields for querying */
  queryFields: QueryField[] = [
    {
      key: 'manufacturer',
      label: 'Manufacturer',
      type: 'multiselect',
      placeholder: 'Select manufacturers',
    },
    {
      key: 'model',
      label: 'Model',
      type: 'multiselect',
      placeholder: 'Select models',
    },
    {
      key: 'year',
      label: 'Year',
      type: 'range',
    },
    {
      key: 'body_class',
      label: 'Body Class',
      type: 'multiselect',
      placeholder: 'Select body classes',
    },
    {
      key: 'data_source',
      label: 'Data Source',
      type: 'multiselect',
      placeholder: 'Select data sources',
    },
  ];

  /** Selected field from dropdown */
  selectedField?: string;

  /** Dialog visibility */
  rangeDialogVisible = false;
  stringDialogVisible = false;
  manufacturerDialogVisible = false;
  modelDialogVisible = false;
  bodyClassDialogVisible = false;
  dataSourceDialogVisible = false;

  /** Dialog values */
  rangeMin?: number;
  rangeMax?: number;
  stringValue?: string;
  yearDateRange: Date[] | null = null; // For nz-range-picker (stores Date objects)

  /** Currently selected field definition */
  currentField?: QueryField;

  // Filter data lists (loaded on-demand)
  manufacturerList: string[] = [];
  modelList: string[] = [];
  bodyClassList: string[] = [];
  dataSourceList: string[] = [];
  yearRange: { min: number; max: number } | null = null;

  // Selected values
  selectedManufacturersArray: string[] = [];
  selectedModelsArray: string[] = [];
  selectedBodyClassesArray: string[] = [];
  selectedDataSourcesArray: string[] = [];

  // Temporary staging for dialog selections (before Apply)
  tempSelectedManufacturers: string[] = [];
  tempSelectedModels: string[] = [];
  tempSelectedBodyClasses: string[] = [];
  tempSelectedDataSources: string[] = [];

  // Search functionality
  manufacturerSearchTerm: string = '';
  modelSearchTerm: string = '';
  bodyClassSearchTerm: string = '';
  dataSourceSearchTerm: string = '';
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('modelSearchInput')
  modelSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('bodyClassSearchInput')
  bodyClassSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('dataSourceSearchInput')
  dataSourceSearchInput?: ElementRef<HTMLInputElement>;
  @ViewChild('manufacturerViewport')
  manufacturerViewport?: CdkVirtualScrollViewport;
  @ViewChild('modelViewport') modelViewport?: CdkVirtualScrollViewport;
  @ViewChild('bodyClassViewport') bodyClassViewport?: CdkVirtualScrollViewport;
  @ViewChild('dataSourceViewport')
  dataSourceViewport?: CdkVirtualScrollViewport;

  // RxJS subjects for search
  private manufacturerSearch$ = new Subject<string>();
  private modelSearch$ = new Subject<string>();
  private bodyClassSearch$ = new Subject<string>();
  private dataSourceSearch$ = new Subject<string>();

  // Loading states
  isLoadingManufacturers = false;
  isLoadingModels = false;
  isLoadingBodyClasses = false;
  isLoadingDataSources = false;
  isLoadingYearRange = false;

  // ========== LIFECYCLE ==========

  constructor(
    private apiService: ApiService,
    private requestCoordinator: RequestCoordinatorService,
    // EXPERIMENT: Using VehicleResourceManagementService instead of StateManagementService
    private stateService: VehicleResourceManagementService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Subscribe to filter state changes to display active filter chips
    // AND synchronize internal selection arrays with URL state
    this.stateService.filters$
      .pipe(takeUntil(this.destroy$))
      .subscribe((filters) => {
        this.activeFilterChips = this.buildFilterChips(filters);

        // Sync selection arrays with URL state
        // Parse comma-separated values from URL into arrays
        this.selectedManufacturersArray = filters.manufacturer
          ? filters.manufacturer
              .split(',')
              .map((m) => m.trim())
              .filter((m) => m)
          : [];

        this.selectedModelsArray = filters.model
          ? filters.model
              .split(',')
              .map((m) => m.trim())
              .filter((m) => m)
          : [];

        this.selectedBodyClassesArray = filters.bodyClass
          ? filters.bodyClass
              .split(',')
              .map((m) => m.trim())
              .filter((m) => m)
          : [];

        this.selectedDataSourcesArray = filters.dataSource
          ? filters.dataSource
              .split(',')
              .map((m) => m.trim())
              .filter((m) => m)
          : [];
      });

    // Subscribe to highlight state changes to display active highlight chips
    this.stateService.highlights$
      .pipe(takeUntil(this.destroy$))
      .subscribe((highlights) => {
        this.activeHighlightChips = this.buildHighlightChips(highlights);
      });

    // Set up manufacturer search with debouncing
    this.manufacturerSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.loadManufacturers(searchTerm);
      });

    // Set up model search with debouncing
    this.modelSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        this.loadModels(searchTerm);
      });

    // Set up body class search with debouncing (client-side filtering)
    this.bodyClassSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        // Client-side filtering via computed property (filteredBodyClasses)
        // Just trigger change detection
        this.cdr.detectChanges();
      });

    // Set up data source search with debouncing (client-side filtering)
    this.dataSourceSearch$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        // Client-side filtering via computed property (filteredDataSources)
        // Just trigger change detection
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ========== COMPUTED PROPERTIES ==========

  get filteredManufacturers(): string[] {
    // Server-side filtering now - just return the list
    return this.manufacturerList;
  }

  get filteredModels(): string[] {
    // Server-side filtering now - just return the list
    return this.modelList;
  }

  get filteredBodyClasses(): string[] {
    // Server-side or client-side filtering
    if (!this.bodyClassSearchTerm.trim()) {
      return this.bodyClassList;
    }
    const searchLower = this.bodyClassSearchTerm.toLowerCase();
    return this.bodyClassList.filter((bc) =>
      bc.toLowerCase().includes(searchLower)
    );
  }

  get filteredDataSources(): string[] {
    // Server-side or client-side filtering
    if (!this.dataSourceSearchTerm.trim()) {
      return this.dataSourceList;
    }
    const searchLower = this.dataSourceSearchTerm.toLowerCase();
    return this.dataSourceList.filter((ds) =>
      ds.toLowerCase().includes(searchLower)
    );
  }

  // ========== FIELD SELECTION ==========

  onFieldSelect(fieldKey: string): void {
    const field = this.queryFields.find((f) => f.key === fieldKey);
    if (!field) return;

    this.currentField = field;

    // Load data on-demand based on field type
    if (field.type === 'range') {
      if (field.key === 'year') {
        this.loadYearRange();
        this.rangeMin = undefined;
        this.rangeMax = undefined;
        this.rangeDialogVisible = true;
      }
    } else if (field.type === 'multiselect') {
      // Show appropriate multiselect dialog
      if (field.key === 'manufacturer') {
        this.tempSelectedManufacturers = [...this.selectedManufacturersArray]; // Copy current selections
        this.manufacturerSearchTerm = ''; // Clear search
        this.manufacturerDialogVisible = true;
        this.loadManufacturers(''); // Load with no search filter initially
        // Focus handled by nzAfterOpen lifecycle hook
      } else if (field.key === 'model') {
        this.tempSelectedModels = [...this.selectedModelsArray]; // Copy current selections
        this.modelSearchTerm = ''; // Clear search
        this.modelDialogVisible = true;
        this.loadModels(''); // Load with no search filter initially
        // Focus handled by nzAfterOpen lifecycle hook
      } else if (field.key === 'body_class') {
        this.tempSelectedBodyClasses = [...this.selectedBodyClassesArray]; // Copy current selections
        this.bodyClassSearchTerm = ''; // Clear search
        this.bodyClassDialogVisible = true;
        this.loadBodyClasses(); // Load full list (client-side filtering)
        // Focus handled by nzAfterOpen lifecycle hook
      } else if (field.key === 'data_source') {
        this.tempSelectedDataSources = [...this.selectedDataSourcesArray]; // Copy current selections
        this.dataSourceSearchTerm = ''; // Clear search
        this.dataSourceDialogVisible = true;
        this.loadDataSources(); // Load full list (client-side filtering)
        // Focus handled by nzAfterOpen lifecycle hook
      }
    } else if (field.type === 'string' || field.type === 'number') {
      this.stringValue = undefined;
      this.stringDialogVisible = true;
    }
  }

  // ========== RANGE DIALOG ==========

  /**
   * Called when user changes the year range picker
   * Converts Date objects to year numbers
   */
  onYearRangeChange(dates: Date[] | null): void {
    if (dates && dates.length === 2) {
      this.rangeMin = dates[0] ? dates[0].getFullYear() : undefined;
      this.rangeMax = dates[1] ? dates[1].getFullYear() : undefined;
    } else {
      this.rangeMin = undefined;
      this.rangeMax = undefined;
    }
  }

  onRangeDialogOk(): void {
    if (!this.currentField) return;

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'range',
      rangeMin: this.rangeMin,
      rangeMax: this.rangeMax,
    };

    this.filterAdd.emit(filter);
    this.rangeDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onRangeDialogCancel(): void {
    this.rangeDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.yearDateRange = null; // Clear date picker
  }

  // ========== STRING/NUMBER DIALOG ==========

  onStringDialogOk(): void {
    if (!this.currentField || !this.stringValue) return;

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: this.currentField.type,
      value: this.stringValue,
    };

    this.filterAdd.emit(filter);
    this.stringDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.stringValue = undefined;
  }

  onStringDialogCancel(): void {
    this.stringDialogVisible = false;
    this.selectedField = undefined;
    this.currentField = undefined;
    this.stringValue = undefined;
  }

  // ========== MANUFACTURER MULTI-SELECT DIALOG ==========

  onManufacturerDialogOpened(): void {
    // Use NG-ZORRO lifecycle hook instead of setTimeout
    this.searchInput?.nativeElement?.focus();
  }

  onManufacturerSearchChange(): void {
    // Emit search term to RxJS subject (debouncing handled in ngOnInit)
    this.manufacturerSearch$.next(this.manufacturerSearchTerm);
  }

  clearManufacturerSearch(): void {
    this.manufacturerSearchTerm = '';
    // Emit empty search to trigger reload
    this.manufacturerSearch$.next('');
    // Focus will be maintained on the input element (no setTimeout needed)
    this.searchInput?.nativeElement?.focus();
  }

  toggleManufacturer(manufacturer: string): void {
    const index = this.tempSelectedManufacturers.indexOf(manufacturer);
    if (index === -1) {
      // Add to selection
      this.tempSelectedManufacturers.push(manufacturer);
    } else {
      // Remove from selection
      this.tempSelectedManufacturers.splice(index, 1);
    }
  }

  onManufacturerDialogOk(): void {
    if (!this.currentField) return;

    // Apply temporary selections to actual array
    this.selectedManufacturersArray = [...this.tempSelectedManufacturers];

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: this.selectedManufacturersArray,
    };

    this.filterAdd.emit(filter);
    this.manufacturerDialogVisible = false;
    this.manufacturerSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onManufacturerDialogCancel(): void {
    // Discard temporary selections
    this.tempSelectedManufacturers = [];
    this.manufacturerDialogVisible = false;
    this.manufacturerSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  // ========== MODEL MULTI-SELECT DIALOG ==========

  onModelDialogOpened(): void {
    // Use NG-ZORRO lifecycle hook instead of setTimeout
    this.modelSearchInput?.nativeElement?.focus();
  }

  onModelSearchChange(): void {
    // Emit search term to RxJS subject (debouncing handled in ngOnInit)
    this.modelSearch$.next(this.modelSearchTerm);
  }

  clearModelSearch(): void {
    this.modelSearchTerm = '';
    // Emit empty search to trigger reload
    this.modelSearch$.next('');
    // Focus will be maintained on the input element (no setTimeout needed)
    this.modelSearchInput?.nativeElement?.focus();
  }

  toggleModel(model: string): void {
    const index = this.tempSelectedModels.indexOf(model);
    if (index === -1) {
      // Add to selection
      this.tempSelectedModels.push(model);
    } else {
      // Remove from selection
      this.tempSelectedModels.splice(index, 1);
    }
  }

  onModelDialogOk(): void {
    if (!this.currentField) return;

    // Apply temporary selections to actual array
    this.selectedModelsArray = [...this.tempSelectedModels];

    const filter: QueryFilter = {
      field: this.currentField.key,
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: this.selectedModelsArray,
    };

    this.filterAdd.emit(filter);
    this.modelDialogVisible = false;
    this.modelSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onModelDialogCancel(): void {
    // Discard temporary selections
    this.tempSelectedModels = [];
    this.modelDialogVisible = false;
    this.modelSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  // ========== BODY CLASS MULTI-SELECT DIALOG ==========

  onBodyClassDialogOpened(): void {
    // Use NG-ZORRO lifecycle hook instead of setTimeout
    this.bodyClassSearchInput?.nativeElement?.focus();
  }

  onBodyClassSearchChange(): void {
    // Emit search term to RxJS subject (client-side filtering via computed property)
    this.bodyClassSearch$.next(this.bodyClassSearchTerm);
  }

  clearBodyClassSearch(): void {
    this.bodyClassSearchTerm = '';
    // Emit empty search to trigger filtering update
    this.bodyClassSearch$.next('');
    // Focus will be maintained on the input element
    this.bodyClassSearchInput?.nativeElement?.focus();
  }

  toggleBodyClass(bodyClass: string): void {
    const index = this.tempSelectedBodyClasses.indexOf(bodyClass);
    if (index === -1) {
      // Add to selection
      this.tempSelectedBodyClasses.push(bodyClass);
    } else {
      // Remove from selection
      this.tempSelectedBodyClasses.splice(index, 1);
    }
  }

  onBodyClassDialogOk(): void {
    if (!this.currentField) return;

    // Apply temporary selections to actual array
    this.selectedBodyClassesArray = [...this.tempSelectedBodyClasses];

    const filter: QueryFilter = {
      field: 'bodyClass', // Use camelCase field name expected by SearchFilters
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: this.selectedBodyClassesArray,
    };

    this.filterAdd.emit(filter);
    this.bodyClassDialogVisible = false;
    this.bodyClassSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onBodyClassDialogCancel(): void {
    // Discard temporary selections
    this.tempSelectedBodyClasses = [];
    this.bodyClassDialogVisible = false;
    this.bodyClassSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  // ========== DATA SOURCE MULTI-SELECT DIALOG ==========

  onDataSourceDialogOpened(): void {
    // Use NG-ZORRO lifecycle hook instead of setTimeout
    this.dataSourceSearchInput?.nativeElement?.focus();
  }

  onDataSourceSearchChange(): void {
    // Emit search term to RxJS subject (client-side filtering via computed property)
    this.dataSourceSearch$.next(this.dataSourceSearchTerm);
  }

  clearDataSourceSearch(): void {
    this.dataSourceSearchTerm = '';
    // Emit empty search to trigger filtering update
    this.dataSourceSearch$.next('');
    // Focus will be maintained on the input element
    this.dataSourceSearchInput?.nativeElement?.focus();
  }

  toggleDataSource(dataSource: string): void {
    const index = this.tempSelectedDataSources.indexOf(dataSource);
    if (index === -1) {
      // Add to selection
      this.tempSelectedDataSources.push(dataSource);
    } else {
      // Remove from selection
      this.tempSelectedDataSources.splice(index, 1);
    }
  }

  onDataSourceDialogOk(): void {
    if (!this.currentField) return;

    // Apply temporary selections to actual array
    this.selectedDataSourcesArray = [...this.tempSelectedDataSources];

    const filter: QueryFilter = {
      field: 'dataSource', // Use camelCase field name expected by SearchFilters
      fieldLabel: this.currentField.label,
      type: 'multiselect',
      values: this.selectedDataSourcesArray,
    };

    this.filterAdd.emit(filter);
    this.dataSourceDialogVisible = false;
    this.dataSourceSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  onDataSourceDialogCancel(): void {
    // Discard temporary selections
    this.tempSelectedDataSources = [];
    this.dataSourceDialogVisible = false;
    this.dataSourceSearchTerm = ''; // Clear search
    this.selectedField = undefined;
    this.currentField = undefined;
  }

  // ========== VALIDATION ==========

  isRangeValid(): boolean {
    // At least one value must be set
    if (this.rangeMin === undefined && this.rangeMax === undefined) {
      return false;
    }

    // If both are set, min must be <= max
    if (
      this.rangeMin !== undefined &&
      this.rangeMax !== undefined &&
      this.rangeMin > this.rangeMax
    ) {
      return false;
    }

    return true;
  }

  isStringValid(): boolean {
    return !!this.stringValue && this.stringValue.trim().length > 0;
  }

  // ========== FILTER DATA LOADING (ON-DEMAND WITH CACHING) ==========

  loadManufacturers(searchTerm: string = ''): void {
    this.isLoadingManufacturers = true;
    console.log('Loading manufacturers from API with search:', searchTerm);

    // Create unique cache key based on search term
    const cacheKey = searchTerm
      ? `filters/manufacturers?search=${searchTerm}`
      : 'filters/manufacturers';

    this.requestCoordinator
      .execute(
        cacheKey,
        () => this.apiService.getDistinctManufacturers(searchTerm),
        {
          cacheTime: 300000, // Cache for 5 minutes per search term
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.manufacturerList = response.manufacturers;
          this.isLoadingManufacturers = false;
          console.log('Loaded manufacturers:', this.manufacturerList.length);

          // Trigger change detection and let CDK Virtual Scroll handle viewport updates
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading manufacturers:', error);
          this.isLoadingManufacturers = false;
        },
      });
  }

  loadModels(searchTerm: string = ''): void {
    this.isLoadingModels = true;
    console.log('Loading models from API with search:', searchTerm);

    // Create unique cache key based on search term
    const cacheKey = searchTerm
      ? `filters/models?search=${searchTerm}`
      : 'filters/models';

    this.requestCoordinator
      .execute(cacheKey, () => this.apiService.getDistinctModels(searchTerm), {
        cacheTime: 300000, // Cache for 5 minutes per search term
        deduplication: true,
        retryAttempts: 2,
      })
      .subscribe({
        next: (response) => {
          this.modelList = response.models;
          this.isLoadingModels = false;
          console.log('Loaded models:', this.modelList.length);

          // Trigger change detection and let CDK Virtual Scroll handle viewport updates
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading models:', error);
          this.isLoadingModels = false;
        },
      });
  }

  loadBodyClasses(): void {
    if (this.bodyClassList.length > 0) {
      console.log('Body classes already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingBodyClasses = true;
    console.log('Loading body classes from API...');

    this.requestCoordinator
      .execute(
        'filters/body-classes',
        () => this.apiService.getDistinctBodyClasses(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.bodyClassList = response.body_classes;
          this.isLoadingBodyClasses = false;
          console.log('Loaded body classes:', this.bodyClassList.length);
        },
        error: (error) => {
          console.error('Error loading body classes:', error);
          this.isLoadingBodyClasses = false;
        },
      });
  }

  loadDataSources(): void {
    if (this.dataSourceList.length > 0) {
      console.log('Data sources already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingDataSources = true;
    console.log('Loading data sources from API...');

    this.requestCoordinator
      .execute(
        'filters/data-sources',
        () => this.apiService.getDistinctDataSources(),
        {
          cacheTime: 300000, // Cache for 5 minutes
          deduplication: true,
          retryAttempts: 2,
        }
      )
      .subscribe({
        next: (response) => {
          this.dataSourceList = response.data_sources;
          this.isLoadingDataSources = false;
          console.log('Loaded data sources:', this.dataSourceList.length);
        },
        error: (error) => {
          console.error('Error loading data sources:', error);
          this.isLoadingDataSources = false;
        },
      });
  }

  loadYearRange(): void {
    if (this.yearRange !== null) {
      console.log('Year range already loaded from cache');
      return; // Already loaded
    }

    this.isLoadingYearRange = true;
    console.log('Loading year range from API...');

    this.requestCoordinator
      .execute('filters/year-range', () => this.apiService.getYearRange(), {
        cacheTime: 300000, // Cache for 5 minutes
        deduplication: true,
        retryAttempts: 2,
      })
      .subscribe({
        next: (response) => {
          this.yearRange = response;
          this.isLoadingYearRange = false;
          console.log('Loaded year range:', this.yearRange);
        },
        error: (error) => {
          console.error('Error loading year range:', error);
          this.isLoadingYearRange = false;
        },
      });
  }

  // ========== FILTER CHIPS ==========

  /**
   * Build filter chips from current filter state
   * Transforms filter state into visual chips for display
   */
  private buildFilterChips(filters: SearchFilters): FilterChip[] {
    const chips: FilterChip[] = [];

    // Extract manufacturers and models from modelCombos (if present)
    let manufacturersFromCombos = new Set<string>();
    let modelsFromCombos = new Set<string>();

    if (filters.modelCombos && filters.modelCombos.length > 0) {
      filters.modelCombos.forEach((combo) => {
        if (combo.manufacturer) manufacturersFromCombos.add(combo.manufacturer);
        if (combo.model) modelsFromCombos.add(combo.model);
      });
    }

    // Manufacturer filter (from explicit filter OR modelCombos)
    const manufacturerValue = filters.manufacturer ||
      (manufacturersFromCombos.size > 0 ? Array.from(manufacturersFromCombos).join(', ') : null);

    if (manufacturerValue) {
      chips.push({
        field: 'manufacturer',
        label: 'Manufacturer',
        displayValue: manufacturerValue,
        color: 'blue',
      });
    }

    // Model filter (from explicit filter OR modelCombos)
    const modelValue = filters.model ||
      (modelsFromCombos.size > 0 ? Array.from(modelsFromCombos).join(', ') : null);

    if (modelValue) {
      chips.push({
        field: 'model',
        label: 'Model',
        displayValue: modelValue,
        color: 'cyan',
      });
    }

    // Year range filter
    if (filters.yearMin !== undefined || filters.yearMax !== undefined) {
      const min = filters.yearMin || 'Any';
      const max = filters.yearMax || 'Any';
      chips.push({
        field: 'year',
        label: 'Year',
        displayValue: `${min} - ${max}`,
        color: 'green',
      });
    }

    // Body class filter
    if (filters.bodyClass) {
      chips.push({
        field: 'bodyClass',
        label: 'Body Class',
        displayValue: filters.bodyClass,
        color: 'orange',
      });
    }

    // Data source filter
    if (filters.dataSource) {
      chips.push({
        field: 'dataSource',
        label: 'Data Source',
        displayValue: filters.dataSource,
        color: 'purple',
      });
    }

    return chips;
  }

  /**
   * Build highlight chips from current highlight state
   * Transforms highlight filters into visual chips with distinct styling
   */
  private buildHighlightChips(highlights: any): FilterChip[] {
    const chips: FilterChip[] = [];

    // Year range highlight
    if (highlights.yearMin !== undefined || highlights.yearMax !== undefined) {
      const min = highlights.yearMin || 'Any';
      const max = highlights.yearMax || 'Any';
      chips.push({
        field: 'h_year',
        label: 'Highlight Year',
        displayValue: `${min} - ${max}`,
        color: 'magenta',
      });
    }

    // Manufacturer highlight
    if (highlights.manufacturer) {
      chips.push({
        field: 'h_manufacturer',
        label: 'Highlight Mfr',
        displayValue: highlights.manufacturer,
        color: 'magenta',
      });
    }

    // Body class highlight
    if (highlights.bodyClass) {
      chips.push({
        field: 'h_bodyClass',
        label: 'Highlight Body',
        displayValue: highlights.bodyClass,
        color: 'magenta',
      });
    }

    // Model combos highlight
    if (highlights.modelCombos) {
      chips.push({
        field: 'h_modelCombos',
        label: 'Highlight Models',
        displayValue: highlights.modelCombos,
        color: 'magenta',
      });
    }

    return chips;
  }

  /**
   * Edit an existing filter by reopening its dialog with current values
   * Called when user clicks on a filter chip (not the X button)
   */
  editFilter(field: string): void {
    console.log('Editing filter:', field);

    // NOTE: Defensive check - should not be needed now that click handler is on chip-content only
    // If X button is clicked, this editFilter() should not be called at all
    // const chipExists = this.activeFilterChips.some(chip => chip.field === field);
    // if (!chipExists) {
    //   console.log('Filter chip no longer exists, skipping edit');
    //   return;
    // }

    // Map filter field to dialog type and open with current values pre-populated
    switch (field) {
      case 'manufacturer':
        this.openManufacturerDialog();
        break;

      case 'model':
        this.openModelDialog();
        break;

      case 'year':
        this.openYearDialog();
        break;

      case 'bodyClass':
        this.openBodyClassDialog();
        break;

      case 'dataSource':
        this.openDataSourceDialog();
        break;

      default:
        console.warn('Unknown filter field:', field);
    }
  }

  /**
   * Helper: Open manufacturer dialog with current selections
   */
  private openManufacturerDialog(): void {
    const field = this.queryFields.find((f) => f.key === 'manufacturer');
    if (!field) return;

    this.currentField = field;
    // selectedManufacturersArray is already synced via filters$ subscription
    this.tempSelectedManufacturers = [...this.selectedManufacturersArray];
    this.manufacturerSearchTerm = '';
    this.manufacturerDialogVisible = true;
    this.loadManufacturers('');
  }

  /**
   * Helper: Open model dialog with current selections
   */
  private openModelDialog(): void {
    const field = this.queryFields.find((f) => f.key === 'model');
    if (!field) return;

    this.currentField = field;
    // selectedModelsArray is already synced via filters$ subscription
    this.tempSelectedModels = [...this.selectedModelsArray];
    this.modelSearchTerm = '';
    this.modelDialogVisible = true;
    this.loadModels('');
  }

  /**
   * Helper: Open year range dialog with current values
   */
  private openYearDialog(): void {
    const field = this.queryFields.find((f) => f.key === 'year');
    if (!field) return;

    this.currentField = field;
    const filters = this.stateService.getCurrentFilters();

    // Hydrate year range from current state
    this.rangeMin = filters.yearMin;
    this.rangeMax = filters.yearMax;

    // Convert to Date objects for nz-range-picker
    if (this.rangeMin && this.rangeMax) {
      this.yearDateRange = [
        new Date(this.rangeMin, 0, 1), // Jan 1st of min year
        new Date(this.rangeMax, 0, 1), // Jan 1st of max year
      ];
    } else if (this.rangeMin) {
      this.yearDateRange = [new Date(this.rangeMin, 0, 1), null] as any;
    } else if (this.rangeMax) {
      this.yearDateRange = [null, new Date(this.rangeMax, 0, 1)] as any;
    } else {
      this.yearDateRange = null;
    }

    this.rangeDialogVisible = true;
  }

  /**
   * Helper: Open body class dialog with current selections
   */
  private openBodyClassDialog(): void {
    const field = this.queryFields.find((f) => f.key === 'body_class');
    if (!field) return;

    this.currentField = field;
    // selectedBodyClassesArray is already synced via filters$ subscription
    this.tempSelectedBodyClasses = [...this.selectedBodyClassesArray];
    this.bodyClassSearchTerm = '';
    this.bodyClassDialogVisible = true;
    this.loadBodyClasses();
  }

  /**
   * Helper: Open data source dialog with current selections
   */
  private openDataSourceDialog(): void {
    const field = this.queryFields.find((f) => f.key === 'data_source');
    if (!field) return;

    this.currentField = field;
    // selectedDataSourcesArray is already synced via filters$ subscription
    this.tempSelectedDataSources = [...this.selectedDataSourcesArray];
    this.dataSourceSearchTerm = '';
    this.dataSourceDialogVisible = true;
    this.loadDataSources();
  }

  /**
   * Remove a filter when chip is closed
   * Updates state to remove the filter parameter from URL
   */
  removeFilter(field: string): void {
    console.log('Removing filter:', field);

    // Build update object to clear the filter
    const updates: Partial<SearchFilters> = {};

    if (field === 'manufacturer') {
      updates.manufacturer = undefined;
      // Internal array will be cleared by filters$ subscription
    } else if (field === 'model') {
      updates.model = undefined;
      // Internal array will be cleared by filters$ subscription
    } else if (field === 'year') {
      updates.yearMin = undefined;
      updates.yearMax = undefined;
    } else if (field === 'bodyClass') {
      updates.bodyClass = undefined;
    } else if (field === 'dataSource') {
      updates.dataSource = undefined;
    }

    // Emit event for parent to handle
    // (Parent will update state, which triggers filters$ subscription to sync selection arrays)
    this.filterRemove.emit({ field, updates });
  }

  /**
   * Remove a highlight when chip is closed
   * Emits field name for parent to handle h_* URL parameter removal
   */
  removeHighlight(field: string): void {
    console.log('Removing highlight:', field);
    this.highlightRemove.emit(field);
  }

  /**
   * Clear all highlights
   * Emits event for parent to remove all h_* URL parameters
   */
  onClearAllHighlights(): void {
    console.log('Clearing all highlights');
    this.clearHighlights.emit();
  }
}
