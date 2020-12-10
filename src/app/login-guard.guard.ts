import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoginGuardGuard implements CanActivate {

  constructor(
    private router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    if (this.checkLogin()) {
      return true;
    } else {
      this.router.navigate(['login']);
      return false;
    }
  }

  checkLogin() {
    let isLogin = false;

    if (localStorage.getItem('loginDetails')) {
      const loginDetails = JSON.parse(localStorage.getItem('loginDetails'));
      isLogin = loginDetails.isLogin;
    }
    // console.log("checkLogin: ", isLogin);

    return isLogin;
  }

}
