import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { EditFormComponent } from './edit-form/edit-form.component'
//declarations  i app.module

const routes: Routes = [
  { path: 'editform', component: EditFormComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
