import { NgModule, Component } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

@Component({ template: '' })
export class AuthHandlerComponent {}

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./pages/home/home.module').then((m) => m.HomePageModule),
  },
  {
    path: 'login',
    loadChildren: () =>
      import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./pages/register/register.module').then(
        (m) => m.RegisterPageModule
      ),
  },
  {
    path: 'journal',
    loadChildren: () =>
      import('./pages/journal/journal.module').then((m) => m.JournalPageModule),
  },
  {
    path: 'account',
    loadChildren: () =>
      import('./pages/account/account.module').then((m) => m.AccountPageModule),
  },
  {
    path: ':mealId',
    loadChildren: () =>
      import('./pages/meal/meal.module').then((m) => m.MealPageModule),
  },
  {
    path: '__/auth/handler',
    component: AuthHandlerComponent,
  },
];

@NgModule({
  declarations: [AuthHandlerComponent],
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
