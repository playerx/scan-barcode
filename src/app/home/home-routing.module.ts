import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { EmailVerificationPage } from '../email-verification/email-verification.page';
import { HomePage } from './home.page';

const routes: Routes = [
  {
    path: '',
    component: HomePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes), IonicModule, FormsModule],
  declarations: [EmailVerificationPage],
  exports: [RouterModule],
})
export class HomePageRoutingModule {}
