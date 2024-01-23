import { Component, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  nutrients: { carbs: number; fats: number; proteins: number; calories: number; summary: string } = { carbs: 0, fats: 0, proteins: 0, calories: 0 , summary: ''};

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public pieChartOptions: ChartConfiguration['options'] = {
    borderColor: window.getComputedStyle(document.documentElement).getPropertyValue('--theme-primary'),
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 20,
          boxWidth: 10,
          boxHeight: 10,
          color: window.getComputedStyle(document.documentElement).getPropertyValue('--theme-primary'),
          font: {
            size: 15,
            weight: 'bold',
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed) {
              label += context.parsed + 'g';
            }
            return label;
          },
          title: items => (''),
        },
        displayColors: false,
      },
    },
  };
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Carbs', 'Fats', 'Proteins'],
    datasets: [
      {
        data: [],
        backgroundColor: [
          window.getComputedStyle(document.documentElement).getPropertyValue('--theme-accent'),
          window.getComputedStyle(document.documentElement).getPropertyValue('--theme-secondary'),
          window.getComputedStyle(document.documentElement).getPropertyValue('--theme-tertiary'),
        ],
      },
    ],
  };
  public pieChartType: ChartType = 'pie';

  constructor(private http: HttpClient) {}

  submitMeal() {
    this.http.post<any>('http://localhost:8000/process_meal/', { text: this.meal })
      .subscribe({
        next: (response) => {
          this.nutrients = response;
          this.mealSubmitted = true;
          this.updateChartData();
        },
        error: (error) => {
          console.error('There was an error!', error);
        }
      }
    );
  }

  private updateChartData() {
    if (this.nutrients) {
      this.pieChartData.datasets[0].data = [this.nutrients.carbs, this.nutrients.fats, this.nutrients.proteins];
    }
  }
}
