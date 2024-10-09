import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { environment } from 'src/environments/environment';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-journal',
  templateUrl: './journal.page.html',
  styleUrls: ['./journal.page.scss'],
})
export class JournalPage implements OnInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;

  public pieChartOptions: ChartConfiguration['options'] = {
    borderColor: '#030607',
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
        data: [0, 0, 0],
        backgroundColor: ['#4682b4', '#ffd700', '#ff6347'],
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

  constructor(private router: Router) {}

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
          const journalRef = collection(db, 'journal');
          const q = query(journalRef, where('userId', '==', userId));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
            console.log('No journal entries found for the user.');
          } else {
            for (const journalDoc of querySnapshot.docs) {
              const journalData = journalDoc.data();
              const mealTimestampLocal = journalData['mealTimestampLocal'];
              const mealDate = new Date(mealTimestampLocal);

              if (this.isSameDate(mealDate, selectedDate)) {
                const mealRef = doc(db, 'meals', journalData['mealId']);
                const mealSnap = await getDoc(mealRef);
                if (mealSnap.exists()) {
                  const mealData = mealSnap.data();

                  this.journalEntries.push({
                    id: journalDoc.id,
                    summary: mealData['summary'],
                    calories: mealData['calories'],
                    carbs: mealData['carbs'],
                    proteins: mealData['proteins'],
                    fats: mealData['fats'],
                    mealTimestampLocal: mealTimestampLocal,
                    formattedMealTime: mealDate.toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    }),
                    prompt: mealData['prompt'],
                    showPrompt: false,
                    carbsPercent: 0,
                    proteinsPercent: 0,
                    fatsPercent: 0,
                  });

                  this.totalCalories += mealData['calories'];
                  this.totalCarbs += mealData['carbs'];
                  this.totalProteins += mealData['proteins'];
                  this.totalFats += mealData['fats'];
                } else {
                  console.log(
                    'No meal found for mealId:',
                    journalData['mealId']
                  );
                }
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
    // Calculate percentages for each entry
    for (const entry of this.journalEntries) {
      const totalGrams = entry.carbs + entry.proteins + entry.fats;
      if (totalGrams > 0) {
        entry.carbsPercent = (entry.carbs / totalGrams) * 100;
        entry.proteinsPercent = (entry.proteins / totalGrams) * 100;
        entry.fatsPercent = (entry.fats / totalGrams) * 100;
      } else {
        entry.carbsPercent = 0;
        entry.proteinsPercent = 0;
        entry.fatsPercent = 0;
      }
    }

    // Calculate percentages for totals
    const totalGrams = this.totalCarbs + this.totalProteins + this.totalFats;
    if (totalGrams > 0) {
      this.totalCarbsPercent = (this.totalCarbs / totalGrams) * 100;
      this.totalProteinsPercent = (this.totalProteins / totalGrams) * 100;
      this.totalFatsPercent = (this.totalFats / totalGrams) * 100;
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
  }

  async deleteEntry(entry: any, event: any) {
    event.stopPropagation();
    try {
      await deleteDoc(doc(db, 'journal', entry.id));

      this.journalEntries = this.journalEntries.filter((e) => e !== entry);

      this.totalCalories -= entry.calories;
      this.totalCarbs -= entry.carbs;
      this.totalProteins -= entry.proteins;
      this.totalFats -= entry.fats;

      this.calculatePercentages();
      this.updateChartData();
    } catch (error) {
      console.error('Error deleting journal entry:', error);
    }
  }

  private updateChartData() {
    this.pieChartData.datasets[0].data = [
      this.totalCarbs,
      this.totalFats,
      this.totalProteins,
    ];
    this.chart?.update();
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
