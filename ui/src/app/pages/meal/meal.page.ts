import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-meal',
  templateUrl: './meal.page.html',
  styleUrls: ['./meal.page.scss'],
})
export class MealPage implements OnInit {
  mealId: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';

  nutrients: {
    carbs: number;
    fats: number;
    proteins: number;
    calories: number;
    summary: string;
  } = { carbs: 0, fats: 0, proteins: 0, calories: 0, summary: '' };

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
          title: () => '',
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

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.mealId = this.route.snapshot.paramMap.get('mealId')!;
    this.fetchMealData();
  }

  async fetchMealData() {
    try {
      const docRef = doc(db, 'meals', this.mealId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        this.nutrients = {
          carbs: data['carbs'],
          fats: data['fats'],
          proteins: data['proteins'],
          calories: data['calories'],
          summary: data['summary'],
        };
        this.updateChartData();
      } else {
        this.errorMessage = 'Meal not found.';
      }
    } catch (error) {
      console.error('Error fetching meal data:', error);
      this.errorMessage = 'An error occurred while fetching the meal data.';
    } finally {
      this.isLoading = false;
    }
  }

  private updateChartData() {
    if (this.nutrients) {
      this.pieChartData.datasets[0].data = [
        this.nutrients.carbs,
        this.nutrients.fats,
        this.nutrients.proteins,
      ];
      this.chart?.update();
    }
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
}
