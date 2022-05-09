import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { ProductInfoPage } from './product-info.page';
import { ProductInfoPageRoutingModule } from './product-info-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ProductInfoPageRoutingModule,
  ],
  declarations: [ProductInfoPage],
})
export class ProductInfoPageModule {}
