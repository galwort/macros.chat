import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  meal: string = '';

  constructor() {}

  adjustTextareaHeight(event: any) {
    const textarea = event.target;
    textarea.style.height = (textarea.scrollHeight + 8) + 'px';
  }
}
