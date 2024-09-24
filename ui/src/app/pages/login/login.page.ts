import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  meals: any[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadMeals();
  }

  async loadMeals() {
    const mealCollection = collection(db, 'meals');
    const mealSnapshot = await getDocs(mealCollection);
    this.meals = mealSnapshot.docs.map((doc) => doc.data());
  }

  getColorClass(index: number): string {
    const colorClasses = ['color-one', 'color-two', 'color-three'];
    return colorClasses[index % 3];
  }

  googleLogin() {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        const user = result.user;
        this.router.navigate(['/']);
      })
      .catch((error) => {});
  }

  navigateTo(page: string) {
    this.router.navigate([`/${page}`]);
  }
}
