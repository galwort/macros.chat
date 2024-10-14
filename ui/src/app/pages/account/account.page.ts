import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
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
          await setDoc(
            userDocRef,
            {
              lastLoginTimestamp: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log('Last login timestamp updated.');
        } catch (e) {
          console.error('Error updating lastLoginTimestamp:', e);
        }
      } else {
        this.isUserLoggedIn = false;
        this.userProfileImage = null;
        this.userName = null;
        this.userEmailAddress = null;
      }
    });
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
