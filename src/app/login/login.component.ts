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
  //   email: 'admin@mail.com',
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
      email: new FormControl(null , [Validators.required, Validators.pattern(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/i)]),
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
        email: this.login.value.email,
        password: this.login.value.password
      };
      const url  = `login`;
      const loading = await this.loadingController.create({
        message: 'Please wait...',
        spinner: 'bubbles',
      });
      loading.present();
      this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
        // console.log('Login response: ', response);
        loading.dismiss();
        if (response.code && (response.code === 200 || response.code === 201)) {
          if (response.user_details && response.user_details.id) {
            localStorage.setItem('loginDetails', JSON.stringify({
              isLogin: true,
              userId: response.user_details.id,
              userUniqueId: response.user_details.unique_id,
              userEmail: response.user_details.email,
              loginTime: response.user_details.login_time
            }));
            this.showToastMessage(response.message);
            this.router.navigate(['inout']);
          } else {
            this.showAlert('Error!', 'User details not found');
          }
        } else {
          if (response.message) {
            this.showAlert('Error!', response.message);
          } else {
            this.showAlert('Error!', 'Credential not matched!');
          }
        }
      }, (err) => {
        console.log('submitLogin error: ', err);
        loading.dismiss();
        this.showAlert('Error!', 'Unable to check login!');
      });
      // if (this.login.value.email === this.adminCredential.email && this.login.value.password === this.adminCredential.password) {
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
