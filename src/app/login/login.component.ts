import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {

  // adminCredential: any = {
  //   phone: '9876543210',
  //   password: 'user123'
  // };
  subscription: any;
  login: FormGroup;

  constructor(
    private platform: Platform,
    private fb: FormBuilder,
    private router: Router,
    public loadingController: LoadingController,
    public alertCtrl: AlertController,
    public toastController: ToastController,
    private apiService: ApiService,
  ) {
    this.login = this.fb.group({
      phone: new FormControl(null , [Validators.required, Validators.pattern(/^[\d+]+$/)]),
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
      const credentials = {
        username: this.login.value.phone,
        password: this.login.value.password
      };
      const url  = `login`;
      this.showLoader('Please wait...');
      this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
        // console.log('Login response: ', response);
        this.hideLoader();
        if (response.status && (response.status === 200 || response.status === 201)) {
          localStorage.setItem('loginDetails', JSON.stringify({
            isLogin: true,
          }));
          this.showToastMessage(response.message);
          this.router.navigate(['inout']);
        } else {
          if (response.message) {
            this.showAlert('Error!', response.message);
          } else {
            this.showAlert('Error!', 'Credential not matched!');
          }
        }
      }, (err) => {
        console.log('submitLogin error: ', err);
        this.hideLoader();
        this.showAlert('Error!', 'Unable to check login!');
      });
      // if (this.login.value.phone === this.adminCredential.phone && this.login.value.password === this.adminCredential.password) {
      //   localStorage.setItem('loginDetails', JSON.stringify({
      //     isLogin: true,
      //   }));
      //   this.router.navigate(['inout']);
      // } else {
      //   this.showAlert('Error!', 'Credential not matched!');
      // }
    } else {
      // this.dataService.showError('Please fill require details'); // --- Display error message
      Object.keys(this.login.controls).forEach((field) => {
        const control = this.login.get(field);
        control.markAsTouched({ onlySelf: true });
        control.markAsDirty({ onlySelf: true });
      });
    }
  }

  async showAlert(header, message) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ['OK'],
    });
    alert.present();
  }

  async showToastMessage(message) {
    const toast = await this.toastController.create({
      message,
      color: 'dark',
      position: 'bottom',
      duration: 3000,
    });
    toast.present();
  }

  async showLoader(message) {
    // -- Start loader
    const loading = await this.loadingController.create({
      message,
      spinner: 'bubbles',
    });
    loading.present();
  }

  hideLoader() {
    this.loadingController.dismiss();
  }

}
