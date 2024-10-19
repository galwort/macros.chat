import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import {
  addDoc,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
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
  isEditing: boolean = false;
  isHovering: boolean = false;
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
        this.resetUserData();
      }
    });
  }

  resetUserData() {
    this.isUserLoggedIn = false;
    this.isEditing = false;
    this.isHovering = false;
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
      return data['username'] || defaultName || 'Steve';
    }
    return defaultName || 'Steve';
  }

  async saveDisplayName() {
    if (!this.isEditing) return;
    const auth = getAuth();
    const user = auth.currentUser;

    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { displayName: this.userName }, { merge: true });
      this.isEditing = false;
    }
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  setHover(state: boolean) {
    this.isHovering = state;
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
    const queries = ['email', 'username', 'loginUsername'].map((field) =>
      getDocs(query(usersCollectionRef, where(field, '==', this.searchQuery)))
    );

    const snapshots = await Promise.all(queries);
    snapshots.forEach((snapshot) =>
      snapshot.forEach((doc) => {
        const data = doc.data();
        data['uid'] = doc.id;
        this.searchResults.push(data);
      })
    );
  }

  async shareJournal(sharedWithUserId: string) {
    console.log('Shared with User ID:', sharedWithUserId);

    if (!sharedWithUserId) {
      console.error('SharedWithUserId is undefined or empty.');
      return;
    }

    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.error('No user is currently logged in.');
      return;
    }

    try {
      const sharedWithDocRef = doc(
        db,
        `users/${currentUser.uid}/sharedWith/${sharedWithUserId}`
      );
      await setDoc(sharedWithDocRef, { sharedAt: new Date().toISOString() });

      console.log(`Journal successfully shared with user: ${sharedWithUserId}`);
    } catch (error) {
      console.error('Error sharing journal:', error);
    }
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
