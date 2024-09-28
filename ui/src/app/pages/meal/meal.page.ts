import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { ModalController, ToastController } from '@ionic/angular';

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
  isUserLoggedIn: boolean = false;
  isDateTimePickerOpen: boolean = false;
  selectedDateTime: string = new Date().toISOString();

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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private modalController: ModalController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.checkUserLoginStatus();
    this.mealId = this.route.snapshot.paramMap.get('mealId')!;
    this.fetchMealData();
  }

  checkUserLoginStatus() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      this.isUserLoggedIn = !!user;
    });
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

  openDateTimePicker() {
    this.isDateTimePickerOpen = true;
  }

  cancelDateTimePicker() {
    this.isDateTimePickerOpen = false;
  }

  dateTimeChanged(event: any) {
    this.selectedDateTime = event.detail.value;
  }

  async confirmDateTime() {
    this.isDateTimePickerOpen = false;
    await this.logFoodToFirestore();
  }

  async logFoodToFirestore() {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        await this.presentToast('User not logged in', 'danger');
        return;
      }

      const journalCollection = collection(db, 'journal');
      const newEntry = {
        userId: user.uid,
        foodId: this.mealId,
        timestamp: new Date().toISOString(),
        eatenAt: this.selectedDateTime,
      };

      await addDoc(journalCollection, newEntry);
      await this.presentToast('Food logged successfully!', 'success');
    } catch (error) {
      console.error('Error logging food:', error);
      await this.presentToast(
        'Error logging food. Please try again.',
        'danger'
      );
    }
  }

  async presentToast(message: string, color: 'success' | 'danger') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color,
      position: 'bottom',
    });
    toast.present();
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
