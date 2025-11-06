import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';

// NG-ZORRO Imports
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTransferModule } from 'ng-zorro-antd/transfer';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzSliderModule } from 'ng-zorro-antd/slider';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { ChipModule } from 'primeng/chip';
import { MessagesModule } from 'primeng/messages';
import { TooltipModule } from 'primeng/tooltip';
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
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzDrawerModule,
    NzTransferModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSpinModule,
    NzAlertModule,
    NzTagModule,
    NzCheckboxModule,
    NzSliderModule,
    // PrimeNG modules
    ButtonModule,
    ChipModule,
    MessagesModule,
    TooltipModule,
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
    // Also export NG-ZORRO modules for convenience
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    ScrollingModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    NzDrawerModule,
    NzTransferModule,
    NzToolTipModule,
    NzEmptyModule,
    NzSpinModule,
    NzAlertModule,
    NzTagModule,
    NzCheckboxModule,
    NzSliderModule,
    // Export PrimeNG modules
    ButtonModule,
    ChipModule,
    MessagesModule,
    TooltipModule,
  ],
})
export class SharedModule {}
