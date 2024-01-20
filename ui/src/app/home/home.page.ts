import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  meal: string = '';

  constructor(private http: HttpClient) {}

  submitMeal() {
    const nutrients = {
      carbs: 50,
      fats: 20,
      proteins: 30,
      calories: 400
    };
    // this.http.post<any>('http://localhost:8000/process_meal/', { text: this.meal })
    //   .subscribe({
    //     next: (response) => {
    //       console.log(response);
    //     },
    //     error: (error) => {
    //       console.error('There was an error!', error);
    //     }
    //   }
    // );
  }
}
