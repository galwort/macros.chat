import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  email: string = '';
  password: string = '';
  meals: any[] = [];

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
    const colorClasses = ['calories', 'carbs', 'protein'];
    return colorClasses[index % 3];
  }

  register() {
    const auth = getAuth();
    createUserWithEmailAndPassword(auth, this.email, this.password)
      .then((result) => {
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error(error);
      });
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
