import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-journal',
  templateUrl: './journal.page.html',
  styleUrls: ['./journal.page.scss'],
})
export class JournalPage implements OnInit {
  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {}

  navigateTo(page: string) {
    this.router.navigateByUrl(`/${page}`);
  }
}
