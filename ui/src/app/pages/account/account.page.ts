import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { environment } from 'src/environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
})
export class AccountPage {
  isUserLoggedIn: boolean = false;
  userProfileImage: string | null = null;
  userName: string = 'Steve';
  userEmailAddress: string | null = null;
  mealsLogged: number = 0;
  averageCalories: number = 0;
  searchQuery: string = '';
  searchResults: any[] = [];
  searchSubmitted: boolean = false;

  constructor(private router: Router) {
    this.checkUserLoginStatus();
  }

  checkUserLoginStatus() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        this.isUserLoggedIn = true;
        this.userProfileImage = user.photoURL;
        this.userEmailAddress = user.email;
        try {
          this.userName = await this.getUserName(user.uid, user.displayName);
          await this.getMealData(user.uid);
        } catch (e) {
          console.error('Error fetching data:', e);
        }
      } else {
        this.isUserLoggedIn = false;
        this.resetUserData();
      }
    });
  }

  resetUserData() {
    this.userProfileImage = null;
    this.userName = 'Steve';
    this.userEmailAddress = null;
    this.mealsLogged = 0;
    this.averageCalories = 0;
  }

  async getUserName(
    userId: string,
    defaultName: string | null
  ): Promise<string> {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return data['displayName'] || defaultName || 'Steve';
    }
    return defaultName || 'Steve';
  }

  async getMealData(userId: string) {
    const journalCollectionRef = collection(db, `users/${userId}/journal`);
    const journalSnapshot = await getDocs(journalCollectionRef);
    let totalCalories = 0;

    this.mealsLogged = journalSnapshot.size;

    journalSnapshot.forEach((doc) => {
      const data = doc.data();
      totalCalories += data['calories'] || 0;
    });

    this.averageCalories =
      this.mealsLogged > 0 ? totalCalories / this.mealsLogged : 0;
  }

  async searchUsers() {
    if (!this.searchQuery.trim()) return;

    this.searchSubmitted = true;
    this.searchResults = [];

    const usersCollectionRef = collection(db, 'users');
    const queries = ['email', 'displayName', 'username'].map((field) =>
      getDocs(query(usersCollectionRef, where(field, '==', this.searchQuery)))
    );

    const snapshots = await Promise.all(queries);
    snapshots.forEach((snapshot) =>
      snapshot.forEach((doc) => this.searchResults.push(doc.data()))
    );
  }

  logout() {
    const auth = getAuth();
    auth.signOut();
    this.navigateTo('');
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
