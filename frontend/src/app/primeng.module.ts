/**
 * PrimeNG Module
 *
 * Centralizes all PrimeNG component imports for the AUTOS-PrimeNG application.
 * This module will gradually replace NG-ZORRO modules during migration.
 *
 * Import this module in app.module.ts to make PrimeNG components available throughout the app.
 *
 * Migration Status: Phase 1 - Setup
 */

import { NgModule } from '@angular/core';

// PrimeNG Core
import { RippleModule } from 'primeng/ripple';

// Button Components
import { ButtonModule } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';

// Data Display Components
import { TableModule } from 'primeng/table';
import { DataViewModule } from 'primeng/dataview';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { AccordionModule } from 'primeng/accordion';
import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';

// Form Components
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { MultiSelectModule } from 'primeng/multiselect';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { InputSwitchModule } from 'primeng/inputswitch';
import { SliderModule } from 'primeng/slider';
import { SelectButtonModule } from 'primeng/selectbutton';

// Navigation Components
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { TabViewModule } from 'primeng/tabview';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { StepsModule } from 'primeng/steps';
import { PanelMenuModule } from 'primeng/panelmenu';

// Overlay Components
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { SidebarModule } from 'primeng/sidebar';

// Feedback Components
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageModule } from 'primeng/message';
import { MessagesModule } from 'primeng/messages';
import { SkeletonModule } from 'primeng/skeleton';

// Misc Components
import { PaginatorModule } from 'primeng/paginator';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { ScrollPanelModule } from 'primeng/scrollpanel';

// Services
import { ConfirmationService } from 'primeng/api';
import { MessageService } from 'primeng/api';

/**
 * All PrimeNG modules used in the application
 *
 * Organized by category for easy reference:
 * - Core: RippleModule
 * - Buttons: ButtonModule, SplitButtonModule
 * - Data Display: TableModule, DataViewModule, CardModule, etc.
 * - Forms: InputTextModule, DropdownModule, CheckboxModule, etc.
 * - Navigation: MenuModule, MenubarModule, TabViewModule, etc.
 * - Overlays: DialogModule, ToastModule, TooltipModule, etc.
 * - Feedback: ProgressSpinnerModule, MessageModule, etc.
 * - Misc: PaginatorModule, AvatarModule, BadgeModule, etc.
 */
const PRIMENG_MODULES = [
  // Core
  RippleModule,

  // Buttons
  ButtonModule,
  SplitButtonModule,

  // Data Display
  TableModule,
  DataViewModule,
  CardModule,
  PanelModule,
  AccordionModule,
  FieldsetModule,
  DividerModule,
  TagModule,

  // Forms
  InputTextModule,
  InputNumberModule,
  InputTextareaModule,
  DropdownModule,
  MultiSelectModule,
  CheckboxModule,
  RadioButtonModule,
  CalendarModule,
  InputSwitchModule,
  SliderModule,
  SelectButtonModule,

  // Navigation
  MenuModule,
  MenubarModule,
  TabViewModule,
  BreadcrumbModule,
  StepsModule,
  PanelMenuModule,

  // Overlays
  DialogModule,
  ConfirmDialogModule,
  ToastModule,
  TooltipModule,
  OverlayPanelModule,
  SidebarModule,

  // Feedback
  ProgressSpinnerModule,
  ProgressBarModule,
  MessageModule,
  MessagesModule,
  SkeletonModule,

  // Misc
  PaginatorModule,
  AvatarModule,
  BadgeModule,
  ChipModule,
  ScrollPanelModule,
];

@NgModule({
  imports: PRIMENG_MODULES,
  exports: PRIMENG_MODULES,
  providers: [
    ConfirmationService, // For p-confirmDialog
    MessageService,      // For p-toast
  ],
})
export class PrimeNgModule {}
