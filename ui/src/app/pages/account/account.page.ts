import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
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
  userName: string | null = null;
  userEmailAddress: string | null = null;
  mealsLogged: number = 0;
  averageCalories: number = 0;
  searchQuery: string = '';
  searchResults: any[] = [];

  constructor(private router: Router) {
    this.checkUserLoginStatus();
  }

  checkUserLoginStatus() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        this.isUserLoggedIn = true;
        this.userProfileImage = user.photoURL;
        this.userName = user.displayName;
        this.userEmailAddress = user.email;
        try {
          await this.getMealData(user.uid);
        } catch (e) {
          console.error('Error fetching meal data:', e);
        }
      } else {
        this.isUserLoggedIn = false;
        this.userProfileImage = null;
        this.userName = null;
        this.userEmailAddress = null;
      }
    });
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

    this.searchResults = [];

    const usersCollectionRef = collection(db, 'users');

    const emailQuery = query(
      usersCollectionRef,
      where('email', '==', this.searchQuery)
    );
    const displayNameQuery = query(
      usersCollectionRef,
      where('displayName', '==', this.searchQuery)
    );
    const usernameQuery = query(
      usersCollectionRef,
      where('username', '==', this.searchQuery)
    );

    const [emailSnapshot, displayNameSnapshot, usernameSnapshot] =
      await Promise.all([
        getDocs(emailQuery),
        getDocs(displayNameQuery),
        getDocs(usernameQuery),
      ]);

    emailSnapshot.forEach((doc) => this.searchResults.push(doc.data()));
    displayNameSnapshot.forEach((doc) => this.searchResults.push(doc.data()));
    usernameSnapshot.forEach((doc) => this.searchResults.push(doc.data()));
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
