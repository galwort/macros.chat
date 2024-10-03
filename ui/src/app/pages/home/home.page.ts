import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc } from 'firebase/firestore';
import { environment } from 'src/environments/environment';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import Firebase Auth

export const app = initializeApp(environment.firebaseConfig);
export const db = getFirestore(app);

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  meal: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showErrorPopover: boolean = false;
  isUserLoggedIn: boolean = false; // Track user login status

  constructor(private http: HttpClient, private router: Router) {
    this.checkUserLoginStatus();
  }

  ionViewWillEnter() {
    this.meal = '';
  }

  checkUserLoginStatus() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      this.isUserLoggedIn = !!user; // Set login status based on whether a user is authenticated
    });
  }

  handleIconClick() {
    if (this.isUserLoggedIn) {
      this.router.navigateByUrl('/journal'); // Navigate to journal page if logged in
    } else {
      this.router.navigateByUrl('/login'); // Navigate to login page if not logged in
    }
  }

  submitMeal(event: Event): void {
    this.isLoading = true;
    event.preventDefault();
    this.http
      .post<any>('https://fa-macroschat.azurewebsites.net/api/process_meal?', {
        text: this.meal,
      })
      .subscribe({
        next: async (response) => {
          if (response.error) {
            this.errorMessage = response.error;
            this.showErrorPopover = true;
            this.isLoading = false;
          } else {
            let nutrients = response;
            let mealId = nutrients.summary
              .toLowerCase()
              .replace(/&/g, 'and')
              .replace(/[\'\(\),]/g, '')
              .replace(/\s+/g, '-');
            try {
              await setDoc(doc(db, 'meals', mealId), {
                prompt: this.meal,
                carbs: nutrients.carbs,
                fats: nutrients.fats,
                proteins: nutrients.proteins,
                calories: nutrients.calories,
                summary: nutrients.summary,
                timestamp: new Date().toISOString(),
              });
            } catch (e) {}
            this.isLoading = false;
            this.router.navigate(['/' + mealId]);
          }
        },
        error: (error) => {
          this.errorMessage = 'An unexpected error occurred. Please try again.';
          this.showErrorPopover = true;
          this.isLoading = false;
        },
      });
  }

  closeErrorPopover() {
    this.showErrorPopover = false;
  }
}
