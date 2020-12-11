import { Component, OnInit } from '@angular/core';
import { AlertController, Platform } from '@ionic/angular';
import * as moment from 'moment';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { NativeGeocoder, NativeGeocoderOptions, NativeGeocoderResult } from '@ionic-native/native-geocoder/ngx';

@Component({
  selector: 'app-inout',
  templateUrl: './inout.component.html',
  styleUrls: ['./inout.component.scss'],
})
export class InoutComponent implements OnInit {

  subscription: any;
  currentTime = moment().format('H:mm:ss');
  // currentDate = moment().format('ddd, D MMM YY');
  timer: any;
  attendanceStatus = false;
  address: string = null; // -- Readable Address
  // Location coordinates
  latitude: number;
  longitude: number;
  accuracy: number;
  // -- Geocoder configuration
  geoencoderOptions: NativeGeocoderOptions = {
    useLocale: true,
    maxResults: 5
  };

  constructor(
    private platform: Platform,
    public alertCtrl: AlertController,
    private androidPermissions: AndroidPermissions,
    private locationAccuracy: LocationAccuracy,
    private geolocation: Geolocation,
    private nativeGeocoder: NativeGeocoder,
  ) { }

  ngOnInit() {
    this.timer = setInterval(() => {
      this.currentTime = moment().format('H:mm:ss');
      // this.currentDate = moment().format('ddd, D MMM YY');
    }, 1000);
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

  giveAttendance(status) {
    if (!status) {
      this.confirmAbsent('Are You Sure!', 'You can\'t present today once you absent.');
    } else {
      // this.attendanceStatus = status;
      this.checkGPSPermission();
    }
  }

  // -- Check if application having GPS access permission
  checkGPSPermission() {
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
        this.attendanceStatus = true;
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

  async confirmAbsent(header, message) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: 'No',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            // console.log('Go To Dashboard clicked');
          }
        },
        {
          text: 'Yes',
          cssClass: 'okBtn',
          role: 'confirm',
          handler: () => {
            // console.log('Logout clicked');
            this.attendanceStatus = false;
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

}
