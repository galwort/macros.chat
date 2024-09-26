import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { initializeApp } from 'firebase/app';
import { getFirestore, setDoc, doc } from 'firebase/firestore';
import { environment } from 'src/environments/environment';

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

  constructor(private http: HttpClient, private router: Router) {}

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
              .replace(/[\'\(\)]/g, '')
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

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
