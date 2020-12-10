import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, Platform } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

  adminCredential: any = {
    phone: '9876543210',
    password: 'user123'
  };
  subscription: any;
  login: FormGroup;

  constructor(
    private platform: Platform,
    private fb: FormBuilder,
    private router: Router,
    public alertCtrl: AlertController,
  ) {
    this.login = this.fb.group({
      phone: new FormControl(null , [Validators.required]),
      password: new FormControl(null , [Validators.required]),
    });
  }

  ngOnInit() {}

  ionViewWillEnter() {
    if (this.checkLogin()) {
      this.router.navigate(['inout']);
    }
  }

  ionViewDidEnter() {
    this.subscription = this.platform.backButton.subscribe(() => {
      // tslint:disable-next-line:no-string-literal
      navigator['app'].exitApp();
    });
  }

  ionViewWillLeave() {
    this.subscription.unsubscribe();
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

  async submitLogin(): Promise<void> {
    if (this.login.valid) {
      if (this.login.value.phone === this.adminCredential.phone && this.login.value.password === this.adminCredential.password) {
        localStorage.setItem('loginDetails', JSON.stringify({
          isLogin: true,
        }));
        this.router.navigate(['inout']);
      } else {
        const alert = await this.alertCtrl.create({
          header: 'Error!',
          message: 'Credential not matched!',
          buttons: ['OK'],
        });
        alert.present();
      }
    } else {
      // this.dataService.showError('Please fill require details'); // --- Display error message
      Object.keys(this.login.controls).forEach((field) => {
        const control = this.login.get(field);
        control.markAsTouched({ onlySelf: true });
        control.markAsDirty({ onlySelf: true });
      });
    }
  }

}
