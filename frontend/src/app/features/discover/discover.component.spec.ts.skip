import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiscoverComponent } from './discover.component';
import { StateManagementService } from '../../core/services/state-management.service';
import { BehaviorSubject } from 'rxjs';
import { SearchFilters, ManufacturerModelSelection } from '../../models';
import { NO_ERRORS_SCHEMA } from '@angular/core';

describe('DiscoverComponent - URL-First State Management', () => {
  let component: DiscoverComponent;
  let fixture: ComponentFixture<DiscoverComponent>;
  let mockStateService: jasmine.SpyObj<StateManagementService>;
  let filtersSubject: BehaviorSubject<SearchFilters>;

  beforeEach(async () => {
    // Create filters subject
    filtersSubject = new BehaviorSubject<SearchFilters>({
      page: 1,
      size: 20,
    });

    // Create mock state service
    mockStateService = jasmine.createSpyObj('StateManagementService', [
      'updateFilters',
      'resetFilters',
      'getCurrentFilters',
    ]);

    // Add observable property
    Object.defineProperty(mockStateService, 'filters$', {
      get: () => filtersSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      declarations: [DiscoverComponent],
      providers: [{ provide: StateManagementService, useValue: mockStateService }],
      schemas: [NO_ERRORS_SCHEMA], // Suppress child component errors
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverComponent);
    component = fixture.componentInstance;
  });

  describe('Initialization', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should subscribe to state filters on init', () => {
      fixture.detectChanges(); // Trigger ngOnInit

      expect(component.currentFilters).toBeDefined();
    });

    it('should initialize with empty picker selections', () => {
      fixture.detectChanges();

      expect(component.pickerInitialSelections).toEqual([]);
    });

    it('should have clear trigger counter at 0', () => {
      expect(component.pickerClearTrigger).toBe(0);
    });
  });

  describe('URL-First Principle: Hydration from State', () => {
    it('should hydrate picker selections from URL state on init', () => {
      const urlFilters: SearchFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
        ],
      };

      filtersSubject.next(urlFilters);
      fixture.detectChanges();

      expect(component.pickerInitialSelections).toEqual(urlFilters.modelCombos!);
      expect(component.currentFilters).toEqual(urlFilters);
    });

    it('should update picker selections when URL changes (browser back)', (done) => {
      fixture.detectChanges();

      // Initial state
      const initialFilters: SearchFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      };
      filtersSubject.next(initialFilters);

      setTimeout(() => {
        expect(component.pickerInitialSelections).toEqual([{ manufacturer: 'Ford', model: 'F-150' }]);

        // Simulate browser back button (URL changed)
        const previousFilters: SearchFilters = {
          modelCombos: [{ manufacturer: 'Chevrolet', model: 'Corvette' }],
        };
        filtersSubject.next(previousFilters);

        setTimeout(() => {
          expect(component.pickerInitialSelections).toEqual([
            { manufacturer: 'Chevrolet', model: 'Corvette' },
          ]);
          done();
        }, 10);
      }, 10);
    });

    it('should clear picker selections when URL has no models', (done) => {
      // Start with selections
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });
      fixture.detectChanges();

      setTimeout(() => {
        expect(component.pickerInitialSelections.length).toBe(1);

        // Clear URL (browser back to page with no selections)
        filtersSubject.next({ page: 1, size: 20 });

        setTimeout(() => {
          expect(component.pickerInitialSelections).toEqual([]);
          done();
        }, 10);
      }, 10);
    });

    it('should maintain reference equality when creating array copy', () => {
      const models: ManufacturerModelSelection[] = [{ manufacturer: 'Ford', model: 'F-150' }];

      filtersSubject.next({ modelCombos: models });
      fixture.detectChanges();

      // Should be a new array (spread operator)
      expect(component.pickerInitialSelections).not.toBe(models);
      expect(component.pickerInitialSelections).toEqual(models);
    });
  });

  describe('User Interactions: Picker Selection Change', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should update state when user selects models', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Chevrolet', model: 'Camaro' },
      ];

      component.onPickerSelectionChange(selections);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selections,
      });
    });

    it('should remove modelCombos when selection is empty', () => {
      component.onPickerSelectionChange([]);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: undefined, // undefined means remove from URL
      });
    });

    it('should handle single selection', () => {
      const selection: ManufacturerModelSelection[] = [{ manufacturer: 'Ford', model: 'F-150' }];

      component.onPickerSelectionChange(selection);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selection,
      });
    });

    it('should handle multiple selections', () => {
      const selections: ManufacturerModelSelection[] = [
        { manufacturer: 'Ford', model: 'F-150' },
        { manufacturer: 'Ford', model: 'Mustang' },
        { manufacturer: 'Chevrolet', model: 'Corvette' },
      ];

      component.onPickerSelectionChange(selections);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selections,
      });
    });
  });

  describe('User Interactions: Clear All', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should increment clear trigger counter', () => {
      const initialTrigger = component.pickerClearTrigger;

      component.onClearAll();

      expect(component.pickerClearTrigger).toBe(initialTrigger + 1);
    });

    it('should call resetFilters on state service', () => {
      component.onClearAll();

      expect(mockStateService.resetFilters).toHaveBeenCalled();
    });

    it('should increment trigger multiple times for rapid clears', () => {
      component.onClearAll();
      expect(component.pickerClearTrigger).toBe(1);

      component.onClearAll();
      expect(component.pickerClearTrigger).toBe(2);

      component.onClearAll();
      expect(component.pickerClearTrigger).toBe(3);
    });
  });

  describe('Computed Properties', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should indicate no active filters when modelCombos empty', () => {
      component.currentFilters = { page: 1, size: 20 };

      expect(component.hasActiveFilters).toBe(false);
    });

    it('should indicate active filters when modelCombos present', () => {
      component.currentFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      };

      expect(component.hasActiveFilters).toBe(true);
    });

    it('should count zero selections when no modelCombos', () => {
      component.currentFilters = {};

      expect(component.selectionCount).toBe(0);
    });

    it('should count selections correctly', () => {
      component.currentFilters = {
        modelCombos: [
          { manufacturer: 'Ford', model: 'F-150' },
          { manufacturer: 'Chevrolet', model: 'Corvette' },
          { manufacturer: 'Ford', model: 'Mustang' },
        ],
      };

      expect(component.selectionCount).toBe(3);
    });

    it('should handle single selection count', () => {
      component.currentFilters = {
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      };

      expect(component.selectionCount).toBe(1);
    });
  });

  describe('URL-First Principle: State Flow Cycle', () => {
    it('should complete full state cycle: user action → URL → hydration', (done) => {
      fixture.detectChanges();

      // 1. User selects models (component emits to state service)
      const selections: ManufacturerModelSelection[] = [{ manufacturer: 'Ford', model: 'F-150' }];
      component.onPickerSelectionChange(selections);

      expect(mockStateService.updateFilters).toHaveBeenCalledWith({
        modelCombos: selections,
      });

      // 2. Simulate state service updating URL and emitting new state
      filtersSubject.next({
        modelCombos: selections,
        page: 1,
        size: 20,
      });

      // 3. Component re-hydrates from state
      setTimeout(() => {
        expect(component.pickerInitialSelections).toEqual(selections);
        expect(component.currentFilters.modelCombos).toEqual(selections);
        done();
      }, 10);
    });

    it('should handle clear cycle: clear → URL → hydration', (done) => {
      // Start with selections
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
      });
      fixture.detectChanges();

      // User clicks clear
      component.onClearAll();

      expect(mockStateService.resetFilters).toHaveBeenCalled();
      expect(component.pickerClearTrigger).toBe(1);

      // Simulate state service clearing URL
      filtersSubject.next({ page: 1, size: 20 });

      setTimeout(() => {
        expect(component.pickerInitialSelections).toEqual([]);
        expect(component.hasActiveFilters).toBe(false);
        done();
      }, 10);
    });
  });

  describe('Cleanup', () => {
    it('should complete destroy subject on ngOnDestroy', () => {
      fixture.detectChanges();

      const destroySpy = jasmine.createSpy('complete');
      (component as any).destroy$.subscribe({ complete: destroySpy });

      component.ngOnDestroy();

      expect(destroySpy).toHaveBeenCalled();
    });

    it('should unsubscribe from filters on destroy', () => {
      fixture.detectChanges();

      const initialSubscriptions = filtersSubject.observers.length;
      component.ngOnDestroy();

      // Should unsubscribe (takeUntil pattern)
      expect(filtersSubject.observers.length).toBeLessThan(initialSubscriptions);
    });

    it('should not process filter updates after destroy', (done) => {
      fixture.detectChanges();
      const initialSelections = [...component.pickerInitialSelections];

      component.ngOnDestroy();

      filtersSubject.next({
        modelCombos: [{ manufacturer: 'New', model: 'Model' }],
      });

      setTimeout(() => {
        // Should not update after destroy
        expect(component.pickerInitialSelections).toEqual(initialSelections);
        done();
      }, 10);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined modelCombos gracefully', () => {
      filtersSubject.next({ page: 1, size: 20 });
      fixture.detectChanges();

      expect(component.pickerInitialSelections).toEqual([]);
      expect(component.selectionCount).toBe(0);
    });

    it('should handle rapid filter changes', (done) => {
      fixture.detectChanges();

      filtersSubject.next({ modelCombos: [{ manufacturer: 'A', model: '1' }] });
      filtersSubject.next({ modelCombos: [{ manufacturer: 'B', model: '2' }] });
      filtersSubject.next({ modelCombos: [{ manufacturer: 'C', model: '3' }] });

      setTimeout(() => {
        // Should have latest state
        expect(component.pickerInitialSelections).toEqual([{ manufacturer: 'C', model: '3' }]);
        done();
      }, 50);
    });

    it('should preserve other filter properties when updating modelCombos', () => {
      filtersSubject.next({
        modelCombos: [{ manufacturer: 'Ford', model: 'F-150' }],
        yearMin: 1960,
        yearMax: 1980,
        page: 2,
      });
      fixture.detectChanges();

      expect(component.currentFilters.yearMin).toBe(1960);
      expect(component.currentFilters.yearMax).toBe(1980);
      expect(component.currentFilters.page).toBe(2);
    });
  });
});
