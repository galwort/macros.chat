import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import {
  getFirestore,
  doc,
  getDoc,
  addDoc,
  collection,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-meal',
  templateUrl: './meal.page.html',
  styleUrls: ['./meal.page.scss'],
})
export class MealPage implements OnInit {
  mealForm = new FormGroup({
    userId: new FormControl(''),
    mealId: new FormControl(''),
    mealTimestamp: new FormControl(''),
    timestamp: new FormControl(''),
  });

  mealId: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  isUserLoggedIn: boolean = false;
  userProfileImage: string | null = null;
  datetimeSelected: string = '';
  mealTimestamp = this.mealForm.value.mealTimestamp as string;
  isLoggingFood: boolean = false;
  logButtonText: string = 'Log Food';

  nutrients: {
    carbs: number;
    fats: number;
    proteins: number;
    calories: number;
    summary: string;
  } = { carbs: 0, fats: 0, proteins: 0, calories: 0, summary: '' };

  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public pieChartOptions: ChartConfiguration['options'] = {
    borderColor: '#030607',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
      datalabels: {
        display: true,
        formatter: function (value: any, context: any) {
          return value + 'g';
        },
        color: '#1a2f3a',
        font: (context) => {
          const chart = context.chart;
          const chartHeight = chart.height;
          const chartWidth = chart.width;
          let fontHeight = Math.min(chartHeight, chartWidth) / 16;
          return {
            size: fontHeight,
            weight: 'bold',
          };
        },
      },
    },
  };

  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Carbs', 'Proteins', 'Fats'],
    datasets: [
      {
        data: [],
        backgroundColor: ['#e3b508', '#ff6347', '#4682b4'],
      },
    ],
  };
  public pieChartType: ChartType = 'pie';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.checkUserLoginStatus();
    this.mealId = this.route.snapshot.paramMap.get('mealId')!;
    this.fetchMealData();

    const now = new Date();
    const roundedDate = this.roundToNearest15Minutes(now);
    const currentTimestamp = this.getLocalISOString(roundedDate);

    this.datetimeSelected = currentTimestamp;
    this.mealForm.patchValue({
      mealTimestamp: currentTimestamp,
    });
  }

  checkUserLoginStatus() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        this.isUserLoggedIn = true;
        this.userProfileImage = user.photoURL;
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(
            userDocRef,
            { lastLoginTimestamp: new Date().toISOString() },
            { merge: true }
          );
        } catch (e) {
          console.error('Error updating lastLoginTimestamp:', e);
        }
      } else {
        this.isUserLoggedIn = false;
        this.userProfileImage = null;
      }
    });
  }

  handleIconClick() {
    if (this.isUserLoggedIn) {
      this.router.navigateByUrl('/account');
    } else {
      this.router.navigateByUrl('/login');
    }
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
        this.nutrients.proteins,
        this.nutrients.fats,
      ];
      this.chart?.update();
    }
  }

  roundToNearest15Minutes(date: Date): Date {
    const minutes = 15;
    const ms = 1000 * 60 * minutes;
    return new Date(Math.round(date.getTime() / ms) * ms);
  }

  getLocalISOString(date: Date): string {
    const tzo = -date.getTimezoneOffset(),
      dif = tzo >= 0 ? '+' : '-',
      pad = (num: number) =>
        (Math.abs(num) < 10 ? '0' : '') + Math.floor(Math.abs(num));

    return (
      date.getFullYear() +
      '-' +
      pad(date.getMonth() + 1) +
      '-' +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      ':' +
      pad(date.getMinutes()) +
      ':' +
      pad(date.getSeconds()) +
      dif +
      pad(tzo / 60) +
      ':' +
      pad(tzo % 60)
    );
  }

  onDateChange(event: any) {
    const selectedDate = event.detail.value;

    if (typeof selectedDate === 'string') {
      this.mealForm.patchValue({ mealTimestamp: selectedDate });
      this.datetimeSelected = selectedDate;
    }
  }

  logFood = async () => {
    this.isLoggingFood = true;
    this.logButtonText = 'Logging...';

    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const userId = user.uid;
        const mealId = this.mealId;
        const mealTimestamp = this.mealForm.value.mealTimestamp;

        if (!mealTimestamp) {
          console.error('mealTimestamp is undefined');
          return;
        }

        const logTimestamp = Timestamp.now();
        const mealTimestampDate = new Date(mealTimestamp);
        const mealTimestampLocal = mealTimestampDate.toLocaleString();

        const docRef = doc(db, 'meals', mealId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          console.error('Meal not found.');
          return;
        }

        const data = docSnap.data();
        const nutrients = {
          carbs: data['carbs'],
          fats: data['fats'],
          proteins: data['proteins'],
          calories: data['calories'],
          summary: data['summary'],
          prompt: data['prompt'] || '',
        };

        const journalRef = collection(db, `users/${userId}/journal`);
        await addDoc(journalRef, {
          mealId: mealId,
          mealTimestamp: mealTimestamp,
          mealTimestampLocal: mealTimestampLocal,
          logTimestamp: logTimestamp,
          lastEditTimestamp: logTimestamp,
          calories: nutrients.calories,
          carbs: nutrients.carbs,
          fats: nutrients.fats,
          proteins: nutrients.proteins,
          summary: nutrients.summary,
          prompt: nutrients.prompt,
          isFavorite: false,
        });

        this.router.navigateByUrl('/journal');
      } else {
        console.error('User is not logged in.');
      }
    } catch (error) {
      console.error('Error logging food:', error);
      this.logButtonText = 'Log Failed 😔';
    } finally {
      this.isLoggingFood = false;
      setTimeout(() => (this.logButtonText = 'Log Food'), 2000);
    }
  };

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
