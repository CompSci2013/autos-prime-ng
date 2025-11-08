import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { MessagesModule } from 'primeng/messages';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { PickListModule } from 'primeng/picklist';
import { SidebarModule } from 'primeng/sidebar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BaseDataTableComponent } from './components/base-data-table/base-data-table.component';
import { ColumnManagerComponent } from './components/column-manager/column-manager.component';
import { PlotlyHistogramComponent } from './components/plotly-histogram/plotly-histogram.component';
import { StaticParabolaChartComponent } from './components/static-parabola-chart/static-parabola-chart.component';
import { BasePickerComponent } from './components/base-picker/base-picker.component';
// New chart components (refactored from plotly-histogram)
import { BaseChartComponent } from './components/base-chart/base-chart.component';
import { ManufacturerChartComponent } from './components/manufacturer-chart/manufacturer-chart.component';
import { ModelsChartComponent } from './components/models-chart/models-chart.component';
import { YearChartComponent } from './components/year-chart/year-chart.component';
import { BodyClassChartComponent } from './components/body-class-chart/body-class-chart.component';

@NgModule({
  declarations: [
    BaseDataTableComponent,
    ColumnManagerComponent,
    PlotlyHistogramComponent,
    StaticParabolaChartComponent,
    BasePickerComponent,
    // New chart components
    BaseChartComponent,
    ManufacturerChartComponent,
    ModelsChartComponent,
    YearChartComponent,
    BodyClassChartComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    ScrollingModule,
    // PrimeNG modules
    ButtonModule,
    ChipModule,
    MessagesModule,
    TooltipModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DropdownModule,
    TableModule,
    PickListModule,
    SidebarModule,
    ProgressSpinnerModule,
  ],
  exports: [
    // Export our components
    BaseDataTableComponent,
    ColumnManagerComponent,
    PlotlyHistogramComponent,
    StaticParabolaChartComponent,
    BasePickerComponent,
    // New chart components
    BaseChartComponent,
    ManufacturerChartComponent,
    ModelsChartComponent,
    YearChartComponent,
    BodyClassChartComponent,
    // Export Angular modules for convenience
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    ScrollingModule,
    // Export PrimeNG modules
    ButtonModule,
    ChipModule,
    MessagesModule,
    TooltipModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DropdownModule,
    TableModule,
    PickListModule,
    SidebarModule,
    ProgressSpinnerModule,
  ],
})
export class SharedModule {}
