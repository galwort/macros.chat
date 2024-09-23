import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage {
  constructor(private router: Router) {}

  googleLogin() {
    console.log('Google login clicked');
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        this.router.navigate(['/']);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }

  onSubmit() {
    console.log('Form submitted');
  }
}
