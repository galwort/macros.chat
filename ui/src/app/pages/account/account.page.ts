import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  collection,
  getDocs,
  query,
  setDoc,
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
          const userDocRef = doc(db, 'users', user.uid);
          await this.updateLastLogin(userDocRef);
          await this.getMealData(user.uid);
        } catch (e) {
          console.error(
            'Error updating lastLoginTimestamp or fetching meal data:',
            e
          );
        }
      } else {
        this.isUserLoggedIn = false;
        this.userProfileImage = null;
        this.userName = null;
        this.userEmailAddress = null;
      }
    });
  }

  async updateLastLogin(userDocRef: any) {
    await setDoc(
      userDocRef,
      {
        lastLoginTimestamp: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log('Last login timestamp updated.');
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

  logout() {
    const auth = getAuth();
    auth.signOut();
    this.navigateTo('');
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
