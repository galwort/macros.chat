import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

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
    onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        this.isUserLoggedIn = true;
        this.userProfileImage = user.photoURL;
        this.userName = user.displayName;
        this.userEmailAddress = user.email;
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
