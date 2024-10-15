import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import {
  ChartConfiguration,
  ChartData,
  ChartType,
  Chart,
  registerables,
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { IonModal } from '@ionic/angular';

Chart.register(...registerables, ChartDataLabels);

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-journal',
  templateUrl: './journal.page.html',
  styleUrls: ['./journal.page.scss'],
})
export class JournalPage implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  @ViewChild(IonModal) dateModal: IonModal | undefined;

  public pieChartOptions: ChartConfiguration['options'];
  public pieChartData: ChartData<'pie', number[], string | string[]> = {
    labels: ['Carbs', 'Proteins', 'Fats'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ['#e3b508', '#ff6347', '#4682b4'],
      },
    ],
  };
  public pieChartType: ChartType = 'pie';
  public dateSelected: string = '';

  public journalEntries: any[] = [];
  public totalCalories: number = 0;
  public totalCarbs: number = 0;
  public totalProteins: number = 0;
  public totalFats: number = 0;
  public totalCarbsPercent: number = 0;
  public totalProteinsPercent: number = 0;
  public totalFatsPercent: number = 0;
  public userProfileImage: string | null = null;
  public expandedRowIndex: number | null = null;
  public displayMode: 'numbers' | 'percentages' = 'numbers';

  constructor(private router: Router) {
    this.pieChartOptions = {
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
          formatter: (value: any, context: any) => {
            const total = context.dataset.data.reduce(
              (sum: number, val: number) => sum + val,
              0
            );
            if (this.displayMode === 'percentages') {
              const percentage = (value / total) * 100;
              return `${Math.round(percentage)}%`;
            } else {
              return value + 'g';
            }
          },
          color: '#030607',
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
  }

  ngOnInit() {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    this.dateSelected = `${year}-${month}-${day}`;
    this.fetchJournalEntries();
  }

  private parseDateLocal(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  onDateChange() {
    console.log(this.dateSelected);
    this.fetchJournalEntries();
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  async fetchJournalEntries() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        this.userProfileImage = user.photoURL;
        const selectedDate = this.parseDateLocal(this.dateSelected);
        this.journalEntries = [];

        this.totalCalories = 0;
        this.totalCarbs = 0;
        this.totalProteins = 0;
        this.totalFats = 0;

        try {
          const userDocRef = doc(db, 'users', userId);
          await setDoc(
            userDocRef,
            { lastLoginTimestamp: new Date().toISOString() },
            { merge: true }
          );
        } catch (e) {
          console.error('Error updating lastLoginTimestamp:', e);
        }

        try {
          const journalRef = collection(db, `users/${userId}/journal`);
          const querySnapshot = await getDocs(journalRef);

          if (querySnapshot.empty) {
            console.log('No journal entries found for the user.');
          } else {
            for (const journalDoc of querySnapshot.docs) {
              const journalData = journalDoc.data();
              const mealTimestampLocal = journalData['mealTimestampLocal'];
              const mealDate = new Date(mealTimestampLocal);

              if (this.isSameDate(mealDate, selectedDate)) {
                this.journalEntries.push({
                  id: journalDoc.id,
                  summary: journalData['summary'],
                  calories: journalData['calories'],
                  carbs: journalData['carbs'],
                  proteins: journalData['proteins'],
                  fats: journalData['fats'],
                  mealTimestampLocal: mealTimestampLocal,
                  formattedMealTime: mealDate.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  }),
                  prompt: journalData['prompt'] || '',
                  showPrompt: false,
                  carbsPercent: 0,
                  proteinsPercent: 0,
                  fatsPercent: 0,
                });

                this.totalCalories += journalData['calories'];
                this.totalCarbs += journalData['carbs'];
                this.totalProteins += journalData['proteins'];
                this.totalFats += journalData['fats'];
              }
            }
            this.journalEntries.sort(
              (a, b) =>
                new Date(a.mealTimestampLocal).getTime() -
                new Date(b.mealTimestampLocal).getTime()
            );
            this.calculatePercentages();
            this.updateChartData();
          }
        } catch (error) {
          console.error('Error fetching journal entries:', error);
        }
      } else {
        console.error('User is not logged in.');
      }
    });
  }

  private calculatePercentages() {
    for (const entry of this.journalEntries) {
      const totalGrams = entry.carbs + entry.proteins + entry.fats;
      if (totalGrams > 0) {
        entry.carbsPercent = Math.round((entry.carbs / totalGrams) * 100);
        entry.proteinsPercent = Math.round((entry.proteins / totalGrams) * 100);
        entry.fatsPercent = Math.round((entry.fats / totalGrams) * 100);
      } else {
        entry.carbsPercent = 0;
        entry.proteinsPercent = 0;
        entry.fatsPercent = 0;
      }
    }

    const totalGrams = this.totalCarbs + this.totalProteins + this.totalFats;
    if (totalGrams > 0) {
      this.totalCarbsPercent = Math.round((this.totalCarbs / totalGrams) * 100);
      this.totalProteinsPercent = Math.round(
        (this.totalProteins / totalGrams) * 100
      );
      this.totalFatsPercent = Math.round((this.totalFats / totalGrams) * 100);
    } else {
      this.totalCarbsPercent = 0;
      this.totalProteinsPercent = 0;
      this.totalFatsPercent = 0;
    }
  }

  toggleRow(index: number) {
    this.expandedRowIndex = this.expandedRowIndex === index ? null : index;
  }

  toggleDisplayMode() {
    this.displayMode =
      this.displayMode === 'numbers' ? 'percentages' : 'numbers';
    this.updateChartData();
  }

  async favoriteEntry(entry: any, event: any) {
    event.stopPropagation();
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;

        const favoriteRef = doc(db, `users/${userId}/favorites`, entry.mealId);
        await setDoc(favoriteRef, {
          timestamp: serverTimestamp(),
        });

        console.log('Meal added to favorites.');
      } else {
        console.error('User is not authenticated.');
      }
    } catch (error) {
      console.error('Error adding to favorites:', error);
    }
  }

  async deleteEntry(entry: any, event: any) {
    event.stopPropagation();
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        await deleteDoc(doc(db, `users/${userId}/journal`, entry.id));

        this.journalEntries = this.journalEntries.filter((e) => e !== entry);

        this.totalCalories -= entry.calories;
        this.totalCarbs -= entry.carbs;
        this.totalProteins -= entry.proteins;
        this.totalFats -= entry.fats;

        this.calculatePercentages();
        this.updateChartData();
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error);
    }
  }

  private updateChartData() {
    if (this.displayMode === 'percentages') {
      this.pieChartData.datasets[0].data = [
        this.totalCarbsPercent,
        this.totalProteinsPercent,
        this.totalFatsPercent,
      ];
    } else {
      this.pieChartData.datasets[0].data = [
        this.totalCarbs,
        this.totalProteins,
        this.totalFats,
      ];
    }
    this.chart?.update();
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }

  openDatePicker() {
    this.dateModal?.present();
  }
}
