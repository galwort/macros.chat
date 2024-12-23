import { NgModule, Component } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AuthenticatedGuard } from './guards/authenticated.guard';

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
    canActivate: [AuthGuard],
  },
  {
    path: 'register',
    loadChildren: () =>
      import('./pages/register/register.module').then(
        (m) => m.RegisterPageModule
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'journal',
    loadChildren: () =>
      import('./pages/journal/journal.module').then((m) => m.JournalPageModule),
    canActivate: [AuthenticatedGuard],
  },
  {
    path: 'account',
    loadChildren: () =>
      import('./pages/account/account.module').then((m) => m.AccountPageModule),
    canActivate: [AuthenticatedGuard],
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
