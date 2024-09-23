import { Component, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  meal: string = '';
  mealSubmitted: boolean = false;
  nutrients: {
    carbs: number;
    fats: number;
    proteins: number;
    calories: number;
    summary: string;
  } = { carbs: 0, fats: 0, proteins: 0, calories: 0, summary: '' };
  isLoading: boolean = false;
  errorMessage: string = '';
  showErrorPopover: boolean = false;

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public pieChartOptions: ChartConfiguration['options'] = {
    borderColor: window
      .getComputedStyle(document.documentElement)
      .getPropertyValue('--theme-primary'),
    plugins: {
      legend: {
        display: false,
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
          title: (items) => '',
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
          window
            .getComputedStyle(document.documentElement)
            .getPropertyValue('--theme-accent'),
          window
            .getComputedStyle(document.documentElement)
            .getPropertyValue('--theme-secondary'),
          window
            .getComputedStyle(document.documentElement)
            .getPropertyValue('--theme-tertiary'),
        ],
      },
    ],
  };
  public pieChartType: ChartType = 'pie';

  constructor(private http: HttpClient, private router: Router) {}

  submitMeal(event: Event): void {
    this.isLoading = true;
    event.preventDefault();
    this.http
      .post<any>('https://fa-macroschat.azurewebsites.net/api/process_meal?', {
        text: this.meal,
      })
      .subscribe({
        next: async (response) => {
          if (response.error) {
            this.errorMessage = response.error;
            this.showErrorPopover = true;
            this.isLoading = false;
          } else {
            this.nutrients = response;
            this.mealSubmitted = true;
            this.updateChartData();
            this.isLoading = false;

            try {
              await addDoc(collection(db, 'meals'), {
                prompt: this.meal,
                carbs: this.nutrients.carbs,
                fats: this.nutrients.fats,
                proteins: this.nutrients.proteins,
                calories: this.nutrients.calories,
                summary: this.nutrients.summary,
                timestamp: new Date().toISOString(),
              });
            } catch (e) {}
          }
        },
        error: (error) => {
          this.errorMessage = 'An unexpected error occurred. Please try again.';
          this.showErrorPopover = true;
          this.isLoading = false;
        },
      });
  }

  private updateChartData() {
    if (this.nutrients) {
      this.pieChartData.datasets[0].data = [
        this.nutrients.carbs,
        this.nutrients.fats,
        this.nutrients.proteins,
      ];
    }
  }

  closeErrorPopover() {
    this.showErrorPopover = false;
  }

  refresh() {
    this.mealSubmitted = false;
    this.meal = '';
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
}
