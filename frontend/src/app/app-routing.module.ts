import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { DynamicComponent } from './features/dynamic/dynamic.component';
import { PanelPopoutComponent } from './features/panel-popout/panel-popout.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'discover', component: DiscoverComponent },
  { path: 'dynamic', component: DynamicComponent },
  { path: 'panel/:gridId/:panelId/:type', component: PanelPopoutComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
