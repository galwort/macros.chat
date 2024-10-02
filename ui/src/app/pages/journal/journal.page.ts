import { Component, OnInit } from '@angular/core';
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

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-journal',
  templateUrl: './journal.page.html',
  styleUrls: ['./journal.page.scss'],
})
export class JournalPage implements OnInit {
  public dateSelected: string = new Date().toISOString();
  public journalEntries: any[] = [];

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
        const selectedDate = new Date(this.dateSelected);
        this.journalEntries = [];

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
                    mealName: mealData['name'],
                    calories: mealData['calories'],
                    formattedMealDate: mealDate.toLocaleDateString(),
                  });
                } else {
                  console.log(
                    'No meal found for mealId:',
                    journalData['mealId']
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching journal entries:', error);
        }
      } else {
        console.error('User is not logged in.');
      }
    });
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
