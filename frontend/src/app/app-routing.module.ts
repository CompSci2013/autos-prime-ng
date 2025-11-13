import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { DiscoverComponent } from './features/discover/discover.component';
import { DemoComponent } from './features/demo/demo.component';
import { PanelPopoutComponent } from './features/panel-popout/panel-popout.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'discover', component: DiscoverComponent },
  { path: 'demo', component: DemoComponent },
  { path: 'panel/:gridId/:panelId/:type', component: PanelPopoutComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
