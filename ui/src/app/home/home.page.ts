import { Component, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import DatalabelsPlugin from 'chartjs-plugin-datalabels';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  meal: string = '';
  mealSubmitted: boolean = false;
  nutrients: any = null;

  
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  // Pie
  public pieChartOptions: ChartConfiguration['options'] = {
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: [['Download', 'Sales'], ['In', 'Store', 'Sales'], 'Mail Sales'],
    datasets: [
      {
        data: [300, 500, 100],
      },
    ],
  };
  public pieChartType: ChartType = 'pie';
  public pieChartPlugins = [DatalabelsPlugin];
  constructor(private http: HttpClient) {}

  submitMeal() {
    setTimeout(() => {
      this.nutrients = {
        carbs: 50,
        fats: 20,
        proteins: 30,
        calories: 400
      };
      this.mealSubmitted = true;
    }, 1000);
    // this.http.post<any>('http://localhost:8000/process_meal/', { text: this.meal })
    //   .subscribe({
    //     next: (response) => {
    //       console.log(response);
    //     },
    //     error: (error) => {
    //       console.error('There was an error!', error);
    //     }
    //   }
    // );
  }
}
