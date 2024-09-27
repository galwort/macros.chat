import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-journal',
  templateUrl: './journal.page.html',
  styleUrls: ['./journal.page.scss'],
})
export class JournalPage implements OnInit {
  public dateSelected: string = new Date().toISOString();

  constructor(private router: Router) {}

  ngOnInit() {}

  formatDate(date: Date): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
  }

  onDateChange() {
    console.log(this.dateSelected);
  }

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
