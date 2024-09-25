import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MealPageRoutingModule } from './meal-routing.module';

import { MealPage } from './meal.page';
import { NgChartsModule } from 'ng2-charts';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MealPageRoutingModule,
    NgChartsModule,
  ],
  declarations: [MealPage],
})
export class MealPageModule {}
