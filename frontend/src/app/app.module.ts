import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

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
    // Angular CDK
    DragDropModule,
    // Shared Module (BaseDataTableComponent, BasePickerComponent)
    SharedModule,
    // PrimeNG Module
    PrimeNgModule,
  ],
  providers: [
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
