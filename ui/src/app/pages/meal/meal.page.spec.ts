import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MealPage } from './meal.page';

describe('MealPage', () => {
  let component: MealPage;
  let fixture: ComponentFixture<MealPage>;

  beforeEach(async(() => {
    fixture = TestBed.createComponent(MealPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
