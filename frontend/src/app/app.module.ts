import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { GridsterModule } from 'angular-gridster2';

// NG-ZORRO imports
import { NZ_I18N, en_US } from 'ng-zorro-antd/i18n';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';

// Import icon definitions
import {
  HomeOutline,
  SearchOutline,
  ExperimentOutline,
  DragOutline,
  CaretRightOutline,
  CaretDownOutline,
  SettingOutline,
  ReloadOutline,
  FilterOutline,
  UpOutline,
  DownOutline,
  CloseCircleOutline,
  CloseOutline,
  InboxOutline,
  ExportOutline,
  LineChartOutline,
} from '@ant-design/icons-angular/icons';

// Register icons
const icons = [
  HomeOutline,
  SearchOutline,
  ExperimentOutline,
  DragOutline,
  CaretRightOutline,
  CaretDownOutline,
  SettingOutline,
  ReloadOutline,
  FilterOutline,
  UpOutline,
  DownOutline,
  CloseCircleOutline,
  CloseOutline,
  InboxOutline,
  ExportOutline,
  LineChartOutline,
];

// Angular CDK
import { DragDropModule } from '@angular/cdk/drag-drop';

// Shared Module (contains BaseDataTableComponent, BasePickerComponent)
import { SharedModule } from './shared/shared.module';

// PrimeNG Module (centralized PrimeNG imports for migration)
import { PrimeNgModule } from './primeng.module';

// Core Services - Error Handling
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { GlobalErrorHandler } from './core/services/global-error-handler.service';

// Picker Configurations
import { PickerConfigService } from './core/services/picker-config.service';
import { ALL_PICKER_CONFIGS } from './config/picker-configs';

// Feature components
import { DiscoverComponent } from './features/discover/discover.component';
import { ResultsTableComponent } from './features/results/results-table/results-table.component';
import { HomeComponent } from './features/home/home.component';
import { NavigationComponent } from './core/navigation/navigation.component';
import { PanelPopoutComponent } from './features/panel-popout/panel-popout.component';
import { QueryControlComponent } from './features/filters/query-control/query-control.component';

/**
 * Factory function to initialize picker configurations
 * Registers all picker configs with PickerConfigService at app startup
 */
export function initializePickerConfigs(pickerConfigService: PickerConfigService): () => void {
  return () => {
    console.log('[AppModule] Registering picker configurations...');
    pickerConfigService.registerConfigs(ALL_PICKER_CONFIGS);
    console.log(
      `[AppModule] Registered ${ALL_PICKER_CONFIGS.length} picker configurations:`,
      pickerConfigService.getConfigIds()
    );
  };
}

@NgModule({
  declarations: [
    AppComponent,
    DiscoverComponent,
    ResultsTableComponent,
    HomeComponent,
    NavigationComponent,
    PanelPopoutComponent,
    QueryControlComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    HttpClientModule,
    AppRoutingModule,
    // NG-ZORRO modules
    NzTableModule,
    NzCheckboxModule,
    NzToolTipModule,
    NzIconModule.forRoot(icons),
    NzEmptyModule,
    NzTagModule,
    NzSpinModule,
    NzRateModule,
    NzAlertModule,
    NzCollapseModule,
    NzButtonModule,
    NzMenuModule,
    NzTabsModule,
    NzSelectModule,
    NzModalModule,
    NzNotificationModule,
    NzDatePickerModule,
    // Angular CDK
    DragDropModule,
    // Grid Layout
    GridsterModule,
    // Shared Module (BaseDataTableComponent, BasePickerComponent)
    SharedModule,
    // PrimeNG Module (will gradually replace NG-ZORRO during migration)
    PrimeNgModule,
  ],
  providers: [
    { provide: NZ_I18N, useValue: en_US },
    // Global Error Handler
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    // HTTP Error Interceptor
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
  /**
   * Constructor - Register picker configurations at app startup
   */
  constructor(pickerConfigService: PickerConfigService) {
    // Initialize picker configurations immediately
    initializePickerConfigs(pickerConfigService)();
  }
}
