import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { AlertController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(
    public http: HttpClient,
    public alertCtrl: AlertController,
  ) { }

  sendHttpCall(data: any = '', url: any, method: any): Observable<any> {
    if (navigator.onLine === false) {
      this.showAlert('OOPS!', 'No Internet Connection!');
    } else {
      const httpOptions = {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          // accept: 'aplication/json',
          // Authorization: 'Bearer ' + token
        })
      };

      switch (method) {
        case 'post':
          return this.http.post<any>(environment.apiUrl + url, (data), httpOptions );

        case 'get':
          return this.http.get<any>(environment.apiUrl + url, httpOptions);

        case 'put':
          return this.http.put<any>(environment.apiUrl + url, (data), httpOptions);

        case 'delete':
          return this.http.delete<any>(environment.apiUrl + url, httpOptions);

        default:
          this.showAlert('Error!', 'Invalid access!');
          // console.log('Add method');
      }
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
}
