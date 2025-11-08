import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PopOutContextService } from '../../core/services/popout-context.service';
import { StateManagementService } from '../../core/services/state-management.service';
import { SearchFilters } from '../../models/search-filters.model';

/**
 * Generic pop-out window container component
 *
 * This component is intentionally panel-agnostic. It only:
 * 1. Extracts panel metadata from route (gridId, panelId, panelType)
 * 2. Initializes PopOutContextService for communication
 * 3. Renders the appropriate component based on panelType
 *
 * All panel-specific logic lives in the individual components.
 * Components detect pop-out mode via PopOutContextService and handle
 * their own state synchronization.
 */
@Component({
  selector: 'app-panel-popout',
  templateUrl: './panel-popout.component.html',
  styleUrls: ['./panel-popout.component.scss']
})
export class PanelPopoutComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Panel metadata from route
  gridId!: string;
  panelId!: string;
  panelType!: string;

  // Current filters from state (for passing to picker)
  currentFilters: SearchFilters = {};

  constructor(
    private route: ActivatedRoute,
    private popOutContext: PopOutContextService,
    private stateService: StateManagementService
  ) {}

  ngOnInit(): void {
    // Get panel info from route params
    this.route.params.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.gridId = params['gridId'];
      this.panelId = params['panelId'];
      this.panelType = params['type'];

      console.log(`[PanelPopout] Initialized: ${this.panelType} (${this.panelId})`);

      // Initialize pop-out context for child components
      this.popOutContext.initializeAsPopOut(this.panelId);

      // Listen for messages from main window and sync to StateManagementService
      this.popOutContext.messages$.pipe(
        takeUntil(this.destroy$)
      ).subscribe(message => {
        this.handleMessage(message);
      });
    });

    // Subscribe to state filters for passing to picker
    this.stateService.filters$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filters => {
      console.log('[PanelPopout] Filters updated:', filters);
      this.currentFilters = filters;
    });
  }

  private handleMessage(message: any): void {
    console.log('[PanelPopout] Received message:', message.type);

    switch (message.type) {
      case 'STATE_UPDATE':
        // Sync full state from main window
        if (message.state) {
          console.log('[PanelPopout] Syncing state from main window');
          this.stateService.syncStateFromExternal(message.state);
        }
        break;

      default:
        console.log('[PanelPopout] Unknown message type:', message.type);
    }
  }

  /**
   * Handle filterAdd event from QueryControl component
   * Send message to main window via BroadcastChannel
   */
  onFilterAdd(filter: any): void {
    console.log('[PanelPopout] Filter added in popout:', filter);
    this.popOutContext.sendMessage({
      type: 'FILTER_ADD',
      payload: filter
    });
  }

  /**
   * Handle filterRemove event from QueryControl component
   * Send message to main window via BroadcastChannel
   */
  onFilterRemove(event: { field: string; updates: any }): void {
    console.log('[PanelPopout] Filter removed in popout:', event.field);
    this.popOutContext.sendMessage({
      type: 'FILTER_REMOVE',
      payload: event
    });
  }

  get panelTitle(): string {
    switch (this.panelType) {
      case 'picker':
        return 'Model Picker (Single)';
      case 'dual-picker':
        return 'Model Picker (Dual Checkbox)';
      case 'results':
        return 'Vehicle Results';
      case 'plotly-charts':
        return 'Interactive Charts (Plotly)';
      case 'query-control':
        return 'Query Control';
      case 'static-parabola':
        return 'Static Parabola Chart';
      case 'manufacturer-chart':
        return 'Manufacturer Chart';
      case 'year-chart':
        return 'Year Chart';
      case 'models-chart':
        return 'Models Chart';
      case 'body-class-chart':
        return 'Body Class Chart';
      default:
        return 'Panel';
    }
  }

  closeWindow(): void {
    window.close();
  }

  ngOnDestroy(): void {
    this.popOutContext.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }
}
