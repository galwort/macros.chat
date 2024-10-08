import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
} from 'firebase/auth';
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
  email: string = '';
  password: string = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadMeals();
  }

  async loadMeals() {
    const mealCollection = collection(db, 'meals');
    const mealSnapshot = await getDocs(mealCollection);
    this.meals = mealSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    this.shuffleArray(this.meals);
  }

  shuffleArray(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getColorClass(index: number): string {
    const colorClasses = ['calories', 'carbs', 'protein', 'fats'];
    return colorClasses[index % 4];
  }

  emailLogin() {
    const auth = getAuth();
    signInWithEmailAndPassword(auth, this.email, this.password)
      .then((result) => {
        const user = result.user;
        this.router.navigate(['/']);
      })
      .catch((error) => {
        console.error(error);
      });
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
    this.router.navigateByUrl(`/${page}`);
  }
}
