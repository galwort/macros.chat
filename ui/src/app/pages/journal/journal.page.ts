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

  constructor(private router: Router) {}

  ngOnInit() {
    this.fetchJournalEntries();
  }

  formatDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  onDateChange() {
    console.log(this.dateSelected);
  }

  async fetchJournalEntries() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        try {
          const journalRef = collection(db, 'journal');
          const q = query(journalRef, where('userId', '==', userId));
          const querySnapshot = await getDocs(q);

          // Loop through journal entries
          querySnapshot.forEach(async (journalDoc) => {
            const journalData = journalDoc.data();
            console.log('Journal Entry:', journalData);

            // Fetch corresponding meal from meals collection
            const mealRef = doc(db, 'meals', journalData['mealId']);
            const mealSnap = await getDoc(mealRef);
            if (mealSnap.exists()) {
              console.log('Meal Data:', mealSnap.data());
            } else {
              console.log('No meal found for mealId:', journalData['mealId']);
            }
          });
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
