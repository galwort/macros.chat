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
  public dateSelected: string = new Date().toISOString();
  public journalEntries: any[] = [];
  public totalCalories: number = 0;
  public totalCarbs: number = 0;
  public totalProteins: number = 0;
  public totalFats: number = 0;
  public userProfileImage: string | null = null;
  public expandedRowIndex: number | null = null; // Track expanded row index

  constructor(private router: Router) {}

  ngOnInit() {
    this.fetchJournalEntries();
  }

  formatDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
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
        const selectedDate = new Date(this.dateSelected);
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
                    prompt: mealData['prompt'], // Include the prompt field
                    showPrompt: false, // Initialize showPrompt to false
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

  toggleRow(index: number) {
    this.expandedRowIndex = this.expandedRowIndex === index ? null : index;
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
