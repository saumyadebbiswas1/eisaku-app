import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, Platform, ToastController } from '@ionic/angular';
import * as moment from 'moment';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder, NativeGeocoderOptions, NativeGeocoderResult } from '@ionic-native/native-geocoder/ngx';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-inout',
  templateUrl: './inout.component.html',
  styleUrls: ['./inout.component.scss'],
})
export class InoutComponent implements OnInit {

  subscription: any;
  userId: any;
  currentTime = moment().format('H:mm:ss');
  // currentDate = moment().format('ddd, D MMM YY');
  timer: any;
  attendanceStatus = false;
  // Location coordinates
  latitude = 123456.789456;
  longitude = 789456.123547;
  accuracy: number;
  address = 'abcd, 012 road, kolkata'; // -- Readable Address
  // -- Geocoder configuration
  geoencoderOptions: NativeGeocoderOptions = {
    useLocale: true,
    maxResults: 5
  };

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
  ) { }

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentTime = moment().format('H:mm:ss');
      // this.currentDate = moment().format('ddd, D MMM YY');
    }, 1000);
  }

  ionViewWillEnter() {
    const loginDetails = JSON.parse(localStorage.getItem('loginDetails'));
    if (loginDetails.userId && loginDetails.userId != null) {
      this.userId = loginDetails.userId;
      const currentTime = moment(loginDetails.loginTime).format('H:mm:ss');
      console.log('this.userId, currentTime: ', this.userId, currentTime);
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

  giveAttendance() {
    // this.checkGPSPermission();
    this.callAttendanceApi();
  }

  // -- Check if application having GPS access permission
  checkGPSPermission() {
    console.log('Checking permission...');
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
        this.callAttendanceApi();
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
      this.changeAttendance(true);
    } else {
      this.confirmAbsent('Are You Sure!', 'You can\'t present today once you absent.');
    }
  }

  async changeAttendance(status): Promise<void> {
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
    console.log('changeAttendance credentials: ', credentials);
    const url  = `addAttendance`;
    this.showLoader('Please wait...');
    this.apiService.sendHttpCall(credentials , url , 'post').subscribe(response => {
      // console.log('Login response: ', response);
      this.hideLoader();
      if (response.code && (response.code === 200 || response.code === 201)) {
        this.attendanceStatus = status;
        if (status === true) {
          this.showToastMessage('Sign in successfully!');
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
      this.hideLoader();
      this.showAlert('Error!', 'Unable to change attendance!');
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
