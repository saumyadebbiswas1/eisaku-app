import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular';
import * as moment from 'moment';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder, NativeGeocoderOptions, NativeGeocoderResult } from '@ionic-native/native-geocoder/ngx';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { BackgroundMode } from '@ionic-native/background-mode/ngx';

@Component({
  selector: 'app-inout',
  templateUrl: './inout.component.html',
  styleUrls: ['./inout.component.scss'],
})
export class InoutComponent implements OnInit {

  subscription: any;
  userId: any;
  currentDateTime = moment();
  currentTime: any = moment().format('h:mm:ss A');
  // currentDate = moment().format('ddd, D MMM YY');
  timer: any;
  locationTimer: any;
  loading = true;
  errorText = '';
  checkAttendanceStatus = false;
  attendanceStatus = false;
  attendanceDateTime = null;
  // Location coordinates
  latitude = null;
  longitude = null;
  accuracy: number;
  address = ''; // -- Readable Address
  // -- Geocoder configuration
  geoencoderOptions: NativeGeocoderOptions = {
    useLocale: true,
    maxResults: 5
  };
  isCheckingInterval = false;

  constructor(
    private platform: Platform,
    private router: Router,
    private androidPermissions: AndroidPermissions,
    private locationAccuracy: LocationAccuracy,
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder,
    public loadingController: LoadingController,
    public alertCtrl: AlertController,
    public toastController: ToastController,
    private apiService: ApiService,
    public backgroundMode: BackgroundMode
  ) { }

  ngOnInit() {
    this.timer = setInterval(() => {
      // this.currentTime = moment().format('H:mm:ss');
      this.currentDateTime = moment(this.currentDateTime).add(1, 'seconds');
      this.currentTime = moment(this.currentDateTime).format('h:mm:ss A');
    }, 1000);
  }

  ionViewWillEnter() {
    const loginDetails = JSON.parse(localStorage.getItem('loginDetails'));
    if (loginDetails.userId && loginDetails.userId != null) {
      this.userId = loginDetails.userId;
      this.errorText = '';
      this.checkAttendance();
    } else {
      this.showAlert('Error!', 'Invalid accesss!');
      this.router.navigate(['login']);
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
    clearInterval(this.timer);
  }

  async checkAttendance(): Promise<void> {
    const credentials = {
      userId: this.userId,
    };
    // console.log('checkAttendance credentials: ', credentials);
    const url  = `getAttendance`;
    // this.showLoader('Please wait...');
    const loading = await this.loadingController.create({
      message: 'Please wait...',
      spinner: 'bubbles',
    });
    loading.present();
    this.loading = true;
    this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
      // console.log('Login response: ', response);
      // this.hideLoader();
      loading.dismiss();
      this.loading = false;
      if (response.code && (response.code === 200 || response.code === 201)) {
        this.checkAttendanceStatus = true;
        const currentDateTime = new Date(response.currentDate + ' ' + response.currentTime);
        this.currentDateTime = moment(currentDateTime);
        // console.log('currentDateTime: ', this.currentDateTime );
        if (response.details) {
          if (response.details[0].attendance_type === '1') {
            this.attendanceStatus = true;
            const attendanceDateTime = new Date(response.details[0].attendance_date + ' ' + response.details[0].attendance_time);
            this.attendanceDateTime = moment(attendanceDateTime).format('ddd, D MMM YY h:mm A');
            this.setCurrentLoactionInterval();
          } else {
            this.attendanceStatus = false;
            const attendanceDateTime = new Date(response.details[0].attendance_date + ' ' + response.details[0].attendance_time);
            this.attendanceDateTime = moment(attendanceDateTime).format('ddd, D MMM YY h:mm A');
          }
        } else {
          this.attendanceStatus = false;
          this.attendanceDateTime = null;
        }
      } else {
        if (response.message) {
          this.showAlert('Error!', response.message);
        } else {
          this.showAlert('Error!', 'Unable to check attendance!');
          this.errorText = 'Unable to check attendance, please reload the app once!';
        }
      }
    }, (err) => {
      console.log('checkAttendance error: ', err);
      // this.hideLoader();
      loading.dismiss();
      this.loading = false;
      this.showAlert('Error!', 'Unable to check attendance!');
      this.errorText = 'Unable to check attendance, please reload the app once!';
    });
  }

  giveAttendance() {
    clearInterval(this.locationTimer);
    this.isCheckingInterval = false;
    this.checkGPSPermission(); // -- For mobile test
    // this.callAttendanceApi(); // -- For browser test
  }

  // -- Check if application having GPS access permission
  checkGPSPermission() {
    // console.log('Checking permission...');
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(result => {
        if (result.hasPermission) {
          // -- If having permission show 'Turn On GPS' dialogue
          this.askToTurnOnGPS();
        } else {
          // -- If not having permission ask for permission
          this.requestGPSPermission();
        }
      },
      err => {
        console.log('checkGPSPermission error: ', err);
        this.showAlert('Error!', 'Unable to check location permission!');
      }
    );
  }

  requestGPSPermission() {
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
        this.showAlert('Something Wrong!', 'Please turn on your location!');
        console.log('requestGPSPermission canRequest: ', canRequest);
      } else {
        // -- Show 'GPS Permission Request' dialogue
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
          .then(() => {
              // -- Call method to turn on GPS
              this.askToTurnOnGPS();
            },
            error => {
              // -- Show alert if user click on 'No Thanks'
              console.log('requestGPSPermission error: ', error);
              this.showAlert('Error!', 'Requesting location permissions is required to proceed!');
            }
          );
      }
    });
  }

  askToTurnOnGPS() {
    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
      () => {
        // -- When GPS Turned ON call method to get Accurate location coordinates
        this.getGeolocation();
      },
      error => {
        console.log('askToTurnOnGPS error: ', error);
        this.showAlert('Error!', 'Unable to turn on GPS!');
      }
    );
  }

  // -- Get current coordinates of device
  getGeolocation() {
    this.geolocation.getCurrentPosition().then((resp) => {

      this.latitude = resp.coords.latitude;
      this.longitude = resp.coords.longitude;
      this.accuracy = resp.coords.accuracy;

      this.getGeoencoder(resp.coords.latitude, resp.coords.longitude);

    }).catch((error) => {
      alert('Error getting location' + JSON.stringify(error));
    });
  }

  // -- geocoder method to fetch address from coordinates passed as arguments
  getGeoencoder(latitude, longitude) {
    this.nativeGeocoder.reverseGeocode(latitude, longitude, this.geoencoderOptions)
      .then((result: NativeGeocoderResult[]) => {
        this.address = this.generateAddress(result[0]);
        if (this.isCheckingInterval) {
          this.setLocationAttendanceApi();
        } else {
          this.callAttendanceApi();
        }
      })
      .catch((error: any) => {
        alert('Error getting location' + JSON.stringify(error));
      });
  }

  // -- Return Comma saperated address
  generateAddress(addressObj) {
    const obj = [];
    let address = '';
    for (const key in addressObj) {
      if (addressObj.hasOwnProperty(key)) {
        obj.push(addressObj[key]);
      }
    }
    obj.reverse();
    for (const val in obj) {
      if (obj[val].length) {
        address += obj[val] + ', ';
      }
    }
    return address.slice(0, -2);
  }

  callAttendanceApi() {
    if (this.attendanceStatus === false) {
      this.checkLastPresent();
    } else {
      this.confirmAbsent('Are You Sure!', 'You can\'t present today once you absent.');
    }
  }

  async checkLastPresent(): Promise<void> {
    const credentials = {
      userId: this.userId,
    };
    // console.log('checkLastPresent credentials: ', credentials);
    const url  = `getLastPresent`;
    const loading1 = await this.loadingController.create({
      message: 'Please wait...',
      spinner: 'bubbles',
    });
    loading1.present();
    this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
      loading1.dismiss();
      if (response.code && (response.code === 200 || response.code === 201)) {
        if (response.details) {
          let lastPresentDateTime: any = new Date(response.details[0].attendance_date + ' ' + response.details[0].attendance_time);
          lastPresentDateTime = moment(lastPresentDateTime);
          // console.log('lastPresentDateTime: ', lastPresentDateTime);
          const currentDateTime = moment();
          // console.log('currentDateTime: ', currentDateTime);
          const lastPresentDateTime10HrAdd = moment(lastPresentDateTime).add(10, 'hours');
          // console.log('lastPresentDateTime10HrAdd: ', lastPresentDateTime12HrAdd);

          if (lastPresentDateTime10HrAdd >= currentDateTime) {
            this.showAlert('Error!', 'You already signed in before 10 hour!');
          } else {
            this.changeAttendance(true);
          }
        } else {
          this.changeAttendance(true);
        }
      } else {
        if (response.message) {
          this.showAlert('Error!', response.message);
        } else {
          this.showAlert('Error!', 'Unable to check last sign in details!');
        }
      }
    }, (err) => {
      console.log('checkLastPresent error: ', err);
      loading1.dismiss();
      this.showAlert('Error!', 'Unable to check last sign in details!');
    });
  }

  async changeAttendance(status): Promise<void> {
    if (this.checkAttendanceStatus === true) {
      // this.attendanceStatus = status;
      let attendanceType = 0;
      if (status === true) {
        attendanceType = 1;
      } else {
        attendanceType = 2;
      }

      const credentials = {
        userId: this.userId,
        latitude: this.latitude,
        longitude: this.longitude,
        currentAddress: this.address,
        attendanceType,
      };
      // console.log('changeAttendance credentials: ', credentials);
      const url  = `addAttendance`;
      const loading2 = await this.loadingController.create({
        message: 'Please wait...',
        spinner: 'bubbles',
      });
      loading2.present();
      this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
      // console.log('Login response: ', response);
      loading2.dismiss();
      if (response.code && (response.code === 200 || response.code === 201)) {
        this.attendanceStatus = status;
        const attendanceDateTime = new Date(response.insertDate + ' ' + response.insertTime);
        this.attendanceDateTime = moment(attendanceDateTime).format('ddd, D MMM YY h:mm A');
        if (status === true) {
          this.showToastMessage('Sign in successfully!');
          this.setCurrentLoactionInterval();
        } else {
          this.showToastMessage('Sign out successfully!');
        }
      } else {
        if (response.message) {
          this.showAlert('Error!', response.message);
        } else {
          this.showAlert('Error!', 'Unable to change attendance!');
        }
      }
    }, (err) => {
      console.log('changeAttendance error: ', err);
      loading2.dismiss();
      this.showAlert('Error!', 'Unable to change attendance!');
    });
    } else {
      this.showAlert('Error!', 'Unable to check attendance, please reload the app once more!');
    }
  }

  setCurrentLoactionInterval() {
    this.isCheckingInterval = true;
    this.backgroundMode.enable();
    this.backgroundMode.on('activate').subscribe(() => {
      this.locationTimer = setInterval(() => {
        this.checkCurrentLoaction();
      }, 600000); // 10min interval
    });
    this.locationTimer = setInterval(() => {
      this.checkCurrentLoaction();
    }, 600000); // 10min interval
  }

  checkCurrentLoaction() {
    this.checkGPSPermission(); // -- For mobile test
    // this.setLocationAttendanceApi(); // -- For browser test
  }

  async setLocationAttendanceApi() {
    const credentials = {
      userId: this.userId,
      latitude: this.latitude,
      longitude: this.longitude,
      currentAddress: this.address,
      attendanceType: 3,
    };
    // console.log('changeAttendance credentials: ', credentials);
    const url  = `addAttendance`;
    // const loading3 = await this.loadingController.create({
    //   message: 'Please wait...',
    //   spinner: 'bubbles',
    // });
    // loading3.present();
    this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
      // console.log('setLocationAttendanceApi response: ', response);
      // loading3.dismiss();
      if (response.code && (response.code === 200 || response.code === 201)) {
        console.log('Location tracked successfully!');
        // this.showToastMessage('Location tracked successfully!');
      } else {
        console.log('Unable to track location!');
        // if (response.message) {
        //   this.showAlert('Error!', response.message);
        // } else {
        //   this.showAlert('Error!', 'Unable to track location!');
        // }
      }
    }, (err) => {
      console.log('setLocationAttendanceApi error: ', err);
      // loading3.dismiss();
      // this.showAlert('Error!', 'Unable to change attendance!');
    });
  }

  async confirmAbsent(header, message) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
            // console.log('Click cancel...');
          }
        },
        {
          text: 'Yes',
          cssClass: 'okBtn',
          role: 'confirm',
          handler: () => {
            this.changeAttendance(false);
          }
        }
      ]
    });
    alert.present();
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
