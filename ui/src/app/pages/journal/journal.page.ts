import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
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
  public favoriteMeals: any[] = [];
  public selectedFavoriteMeal: string | null = null;

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
  }

  ngOnInit() {
    const date = new Date();
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    this.dateSelected = `${year}-${month}-${day}`;
    this.fetchJournalEntries();
    this.fetchFavoriteMeals();
  }

  private parseDateLocal(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  onDateChange() {
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
                const formattedMealTime = mealDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                this.journalEntries.push({
                  id: journalDoc.id,
                  summary: journalData['summary'],
                  calories: journalData['calories'],
                  carbs: journalData['carbs'],
                  proteins: journalData['proteins'],
                  fats: journalData['fats'],
                  mealTimestampLocal: mealTimestampLocal,
                  formattedMealTime: formattedMealTime,
                  prompt: journalData['prompt'] || '',
                  showPrompt: false,
                  carbsPercent: 0,
                  proteinsPercent: 0,
                  fatsPercent: 0,
                  isFavorite: journalData['isFavorite'] || false,
                  isEditing: false,
                  editValues: null,
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
            this.calculateTotalsAndPercentages();
            this.updateChartData();
          }
        } catch (error) {
          console.error('Error fetching journal entries:', error);
        }
      }
    });
  }

  private calculateTotalsAndPercentages() {
    this.totalCalories = 0;
    this.totalCarbs = 0;
    this.totalProteins = 0;
    this.totalFats = 0;

    for (const entry of this.journalEntries) {
      this.totalCalories += entry.calories;
      this.totalCarbs += entry.carbs;
      this.totalProteins += entry.proteins;
      this.totalFats += entry.fats;
    }

    this.calculatePercentages();
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

  toggleEntryPrompt(entry: any) {
    entry.showPrompt = !entry.showPrompt;
    this.updateChartData();
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
        const journalDocRef = doc(db, `users/${userId}/journal`, entry.id);

        const newFavoriteStatus = !entry.isFavorite;
        await setDoc(
          journalDocRef,
          { isFavorite: newFavoriteStatus },
          { merge: true }
        );

        entry.isFavorite = newFavoriteStatus;
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
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

        this.calculateTotalsAndPercentages();
        this.updateChartData();
      }
    } catch (error) {
      console.error('Error deleting journal entry:', error);
    }
  }

  private updateChartData() {
    let selectedEntries = this.journalEntries.filter(
      (entry) => entry.showPrompt
    );
    let totalCarbs: number;
    let totalProteins: number;
    let totalFats: number;
    let totalCarbsPercent: number;
    let totalProteinsPercent: number;
    let totalFatsPercent: number;

    if (selectedEntries.length > 0) {
      totalCarbs = selectedEntries.reduce((sum, entry) => sum + entry.carbs, 0);
      totalProteins = selectedEntries.reduce(
        (sum, entry) => sum + entry.proteins,
        0
      );
      totalFats = selectedEntries.reduce((sum, entry) => sum + entry.fats, 0);

      const totalGrams = totalCarbs + totalProteins + totalFats;
      if (totalGrams > 0) {
        totalCarbsPercent = Math.round((totalCarbs / totalGrams) * 100);
        totalProteinsPercent = Math.round((totalProteins / totalGrams) * 100);
        totalFatsPercent = Math.round((totalFats / totalGrams) * 100);
      } else {
        totalCarbsPercent = 0;
        totalProteinsPercent = 0;
        totalFatsPercent = 0;
      }
    } else {
      totalCarbs = this.totalCarbs;
      totalProteins = this.totalProteins;
      totalFats = this.totalFats;
      totalCarbsPercent = this.totalCarbsPercent;
      totalProteinsPercent = this.totalProteinsPercent;
      totalFatsPercent = this.totalFatsPercent;
    }

    if (this.displayMode === 'percentages') {
      this.pieChartData.datasets[0].data = [
        totalCarbsPercent,
        totalProteinsPercent,
        totalFatsPercent,
      ];
    } else {
      this.pieChartData.datasets[0].data = [
        totalCarbs,
        totalProteins,
        totalFats,
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

  editEntry(entry: any, event: any) {
    event.stopPropagation();
    entry.isEditing = true;
    entry.editValues = {
      summary: entry.summary,
      calories: entry.calories,
      carbs: entry.carbs,
      proteins: entry.proteins,
      fats: entry.fats,
      mealTime: this.formatTimeForInput(entry.mealTimestampLocal),
    };
  }

  cancelEditEntry(entry: any, event: any) {
    event.stopPropagation();
    entry.isEditing = false;
    entry.editValues = null;
  }

  async saveEntry(entry: any, event: any) {
    event.stopPropagation();
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        const journalDocRef = doc(db, `users/${userId}/journal`, entry.id);

        const newMealTimestampLocal = this.combineDateAndTime(
          this.dateSelected,
          entry.editValues.mealTime
        );

        await setDoc(
          journalDocRef,
          {
            summary: entry.editValues.summary,
            calories: entry.editValues.calories,
            carbs: entry.editValues.carbs,
            proteins: entry.editValues.proteins,
            fats: entry.editValues.fats,
            mealTimestampLocal: newMealTimestampLocal.toISOString(),
          },
          { merge: true }
        );

        entry.summary = entry.editValues.summary;
        entry.calories = entry.editValues.calories;
        entry.carbs = entry.editValues.carbs;
        entry.proteins = entry.editValues.proteins;
        entry.fats = entry.editValues.fats;
        entry.mealTimestampLocal = newMealTimestampLocal.toISOString();

        entry.formattedMealTime = newMealTimestampLocal.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        entry.isEditing = false;
        entry.editValues = null;

        this.calculateTotalsAndPercentages();
        this.updateChartData();
      }
    } catch (error) {
      console.error('Error saving journal entry:', error);
    }
  }

  private formatTimeForInput(isoString: string): string {
    const date = new Date(isoString);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    return `${hours}:${minutes}`;
  }

  private combineDateAndTime(dateString: string, timeString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    const [hours, minutes] = timeString.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  }

  async fetchFavoriteMeals() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        try {
          const journalRef = collection(db, `users/${userId}/journal`);
          const querySnapshot = await getDocs(journalRef);
          this.favoriteMeals = [];

          for (const journalDoc of querySnapshot.docs) {
            const journalData = journalDoc.data();
            if (journalData['isFavorite'] === true) {
              this.favoriteMeals.push({
                id: journalDoc.id,
                summary: journalData['summary'],
              });
            }
          }
        } catch (error) {
          console.error('Error fetching favorite meals:', error);
        }
      }
    });
  }
}
