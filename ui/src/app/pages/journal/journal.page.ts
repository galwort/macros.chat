import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-journal',
  templateUrl: './journal.page.html',
  styleUrls: ['./journal.page.scss'],
})
export class JournalPage implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {}

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
