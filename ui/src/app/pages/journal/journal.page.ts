import { Component, OnInit, ViewChild } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import {
  getFirestore,
  collection,
  getDoc,
  getDocs,
  doc,
  deleteDoc,
  setDoc,
  addDoc,
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
import { HttpClient } from '@angular/common/http';

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
  public newMealDescription: string = '';
  public isLoadingNewMeal: boolean = false;
  public selectedUser: string = 'Me';
  public sharedUsers: { uid: string; username: string }[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
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
    this.dateSelected = date.toISOString().split('T')[0];
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const currentUserId = user.uid;
        this.userProfileImage = user.photoURL;
        await this.fetchSharedUsers(currentUserId);
        await this.fetchFavoriteMeals();
        this.route.queryParams.subscribe((params) => {
          const userFromUrl = params['user'];
          const matchedUser = this.sharedUsers.find(
            (u) => u.username === userFromUrl
          );
          if (matchedUser) {
            this.selectedUser = matchedUser.uid;
          } else {
            this.selectedUser = 'Me';
          }
          this.fetchJournalEntries(currentUserId);
        });
      } else {
        console.error('User is not authenticated');
      }
    });
  }

  private parseDateLocal(dateString: string): Date {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  onDateChange() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const currentUserId = user.uid;
        this.fetchJournalEntries(currentUserId);
      } else {
        console.error('User is not authenticated');
      }
    });
  }

  isSameDate(date1: Date, date2: Date): boolean {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

  async fetchSharedUsers(currentUserId: string) {
    const sharedByRef = collection(db, `users/${currentUserId}/sharedBy`);
    try {
      const querySnapshot = await getDocs(sharedByRef);
      const userUids = querySnapshot.docs.map((doc) => doc.id);
      this.sharedUsers = [];

      for (const uid of userUids) {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          this.sharedUsers.push({
            uid: uid,
            username: userData['username'],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching shared users:', error);
    }
  }

  async fetchJournalEntries(currentUserId: string) {
    const selectedDate = this.parseDateLocal(this.dateSelected);
    this.journalEntries = [];

    this.totalCalories = 0;
    this.totalCarbs = 0;
    this.totalProteins = 0;
    this.totalFats = 0;

    let targetUserId: string;

    if (this.selectedUser === 'Me') {
      targetUserId = currentUserId;
    } else {
      targetUserId = this.selectedUser;
    }

    try {
      const journalRef = collection(db, `users/${targetUserId}/journal`);
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
              hour: 'numeric',
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
    if (this.selectedUser !== 'Me') {
      return;
    }
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
    if (this.selectedUser !== 'Me') {
      return;
    }
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
    if (this.selectedUser !== 'Me') {
      return;
    }
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
    if (this.selectedUser !== 'Me') {
      return;
    }
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
          hour: 'numeric',
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
                calories: journalData['calories'],
                carbs: journalData['carbs'],
                proteins: journalData['proteins'],
                fats: journalData['fats'],
                prompt: journalData['prompt'] || '',
                mealId: journalData['mealId'],
                isFavorite: journalData['isFavorite'],
              });
            }
          }
        } catch (error) {
          console.error('Error fetching favorite meals:', error);
        }
      }
    });
  }

  async addNewMeal() {
    if (this.selectedUser !== 'Me') {
      return;
    }
    if (!this.newMealDescription) {
      console.log('Please enter a meal description');
      return;
    }

    this.isLoadingNewMeal = true;

    try {
      const response = await this.http
        .post<any>(
          'https://fa-macroschat.azurewebsites.net/api/process_meal?',
          {
            text: this.newMealDescription,
          }
        )
        .toPromise();

      if (response.error) {
        console.error('Error processing meal:', response.error);
        this.isLoadingNewMeal = false;
        return;
      }

      const auth = getAuth();
      const user = auth.currentUser;

      if (user) {
        const userId = user.uid;
        const journalRef = collection(db, `users/${userId}/journal`);

        const currentTime = new Date();
        const [year, month, day] = this.dateSelected.split('-').map(Number);
        const mealTimestampLocal = new Date(
          year,
          month - 1,
          day,
          currentTime.getHours(),
          currentTime.getMinutes()
        );

        const mealId = response.summary
          .toLowerCase()
          .replace(/&/g, 'and')
          .replace(/[\'\(\),]/g, '')
          .replace(/\s+/g, '-');

        const newMeal = {
          summary: response.summary,
          calories: response.calories,
          carbs: response.carbs,
          proteins: response.proteins,
          fats: response.fats,
          prompt: this.newMealDescription,
          mealTimestamp: currentTime.toISOString(),
          mealTimestampLocal: mealTimestampLocal.toISOString(),
          lastEditTimestamp: currentTime.toISOString(),
          logTimestamp: currentTime.toISOString(),
          mealId: mealId,
          isFavorite: false,
        };

        await addDoc(journalRef, newMeal);

        this.journalEntries.push({
          ...newMeal,
          id: '',
          showPrompt: false,
          formattedMealTime: mealTimestampLocal.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          carbsPercent: 0,
          proteinsPercent: 0,
          fatsPercent: 0,
          isEditing: false,
          editValues: null,
        });

        this.calculateTotalsAndPercentages();
        this.updateChartData();

        this.newMealDescription = '';

        await this.fetchJournalEntries(userId);
      }
    } catch (error) {
      console.error('Error adding new meal:', error);
    }

    this.isLoadingNewMeal = false;
  }

  async addFavoriteMeal(favoriteMeal: any) {
    if (this.selectedUser !== 'Me') {
      return;
    }
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        const userId = user.uid;
        const journalRef = collection(db, `users/${userId}/journal`);
        const currentTime = new Date();
        const [year, month, day] = this.dateSelected.split('-').map(Number);
        const mealTimestampLocal = new Date(
          year,
          month - 1,
          day,
          currentTime.getHours(),
          currentTime.getMinutes()
        );
        const newMeal = {
          summary: favoriteMeal.summary,
          calories: favoriteMeal.calories,
          carbs: favoriteMeal.carbs,
          proteins: favoriteMeal.proteins,
          fats: favoriteMeal.fats,
          prompt: favoriteMeal.prompt,
          mealTimestamp: currentTime.toISOString(),
          mealTimestampLocal: mealTimestampLocal.toISOString(),
          lastEditTimestamp: currentTime.toISOString(),
          logTimestamp: currentTime.toISOString(),
          mealId: favoriteMeal.mealId,
          isFavorite: favoriteMeal.isFavorite || false,
        };
        await addDoc(journalRef, newMeal);
        this.journalEntries.push({
          ...newMeal,
          id: '',
          showPrompt: false,
          formattedMealTime: mealTimestampLocal.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          }),
          carbsPercent: 0,
          proteinsPercent: 0,
          fatsPercent: 0,
          isEditing: false,
          editValues: null,
        });
        this.calculateTotalsAndPercentages();
        this.updateChartData();
        this.selectedFavoriteMeal = null;
        await this.fetchJournalEntries(userId);
      }
    } catch (error) {
      console.error('Error adding favorite meal:', error);
    }
  }

  onFavoriteMealSelected() {
    if (this.selectedFavoriteMeal) {
      this.addFavoriteMeal(this.selectedFavoriteMeal);
    }
  }

  onUserChange() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const currentUserId = user.uid;
        this.fetchJournalEntries(currentUserId);
      } else {
        console.error('User is not authenticated');
      }
    });
  }
}
