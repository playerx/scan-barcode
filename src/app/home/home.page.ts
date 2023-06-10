import { Component, OnInit } from '@angular/core';
import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import { Camera } from '@capacitor/camera';
import { Device } from '@capacitor/device';
import { Haptics } from '@capacitor/haptics';
import { Storage } from '@capacitor/storage';
import { IonRouterOutlet, ModalController } from '@ionic/angular';
import JSConfetti from 'js-confetti';
import { environment } from 'src/environments/environment';
import { EmailVerificationPage } from '../email-verification/email-verification.page';
import { gs1Codes } from '../gs1Codes';
import { DataService } from '../services/data.service';

// eslint-disable-next-line @typescript-eslint/naming-convention
declare let JsBarcode: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itemsMap: Map<string, any>;

  countryName = 'Scan Product';
  productName = '';
  barcode: string = '';
  flag: string;
  imageUrl: string;
  isGood = false;
  isBad = false;
  isReviewCompleted = false;
  selectedReview: string;
  allowMoreInfo = true;
  showMoreInfoButton = false;

  summaryItems = [];

  allowedReviews = [
    'thumbs_up',
    'sparkling_heart',
    'relieved_face',
    'thinking_face',
    'exploding_head',
    'pleading_face',
    'thumbs_down',
    'face_with_symbols_on_mouth',
    'money_with_wings',
  ];

  allAllowedReviews = this.allowedReviews.concat(['pile_of_poo']);

  get finalAllowedReviews() {
    if (this.countryName === 'Russian Federation') {
      const items = this.allowedReviews.slice();
      items[4] = 'pile_of_poo';
      return items;
    }
    return this.allowedReviews;
  }

  mode: 'INITIAL' | 'SCAN' | 'FOUND' = 'INITIAL';

  get isInitialMode() {
    return this.mode === 'INITIAL';
  }

  get isScanMode() {
    return this.mode === 'SCAN';
  }

  get isFoundMode() {
    return this.mode === 'FOUND';
  }

  constructor(
    private dataService: DataService,
    private modal: ModalController,
    private routerOutlet: IonRouterOutlet
  ) {}

  async ngOnInit() {
    const config = (await this.getConfig()) ?? gs1Codes;

    this.showMoreInfoButton = await Storage.get({ key: 'SHOW_MORE_INFO' }).then(
      (x) => x.value == '1'
    );

    try {
      this.barcode = '0000000000000';
      JsBarcode('#barcode', this.barcode, {
        format: 'EAN13',
        valid: () => true,
      });
      JsBarcode('#barcode2', this.barcode, {
        format: 'EAN13',
        valid: () => true,
      });
    } catch (err) {
      console.warn(err.toString());
    }

    this.itemsMap = config
      .filter((x) => x.barcode)
      .flatMap((x) => {
        if (!x.barcode.includes('-')) {
          return [x];
        }

        const parts = x.barcode.split('-');
        const start = +parts[0];
        const end = +parts[1];

        if (start > end) {
          return [];
        }

        return new Array(end - start + 1).fill(0).map((_, i) => ({
          ...x,
          barcode: (start + i).toString().padStart(3, '0'),
        }));
      })
      .reduce((r, x) => r.set(x.barcode, x), new Map());

    this.loadConfig();
  }

  async onSignIn() {
    const modal = await this.modal.create({
      presentingElement: this.routerOutlet.nativeEl,
      component: EmailVerificationPage,
      // swipeToClose: true,
    });

    modal.present();
  }

  async scan() {
    this.isReviewCompleted = false;
    this.selectedReview = '';

    const pr = await Camera.requestPermissions({ permissions: ['camera'] });
    console.log('permission result', pr);

    if (pr.camera !== 'granted') {
      alert('Please enable camera permission from Settings');
      return;
    }

    this.countryName = '';
    this.barcode = '';
    this.flag = '';
    this.imageUrl = '';
    this.mode = 'SCAN';
    this.isGood = false;
    this.isBad = false;

    BarcodeScanner.hideBackground();
    document.body.classList.add('qrscanner');

    const result = await BarcodeScanner.startScan({
      targetedFormats: [SupportedFormat.EAN_13, SupportedFormat.EAN_8],
    }); // start scanning and wait for a result

    console.log('result', result);
    document.body.classList.remove('qrscanner');
    this.mode = 'FOUND';

    // if the result has content
    if (result.hasContent) {
      this.barcode = result.content;
      if (this.barcode.length === 13 || this.barcode.length === 8) {
        try {
          JsBarcode('#barcode', this.barcode, {
            format: this.barcode.length === 13 ? 'EAN13' : 'EAN8',
          });
          JsBarcode('#barcode2', this.barcode, {
            format: this.barcode.length === 13 ? 'EAN13' : 'EAN8',
          });
        } catch (err) {
          console.warn(err.toString());
        }
      }

      const barCodePrefix = this.barcode.slice(0, 3);

      console.log(this.barcode, barCodePrefix, this.itemsMap.has(this.barcode));

      const item = this.itemsMap.get(barCodePrefix);

      this.countryName = item?.country ?? 'Unknown Country';
      this.flag = item?.flag ?? '';
      this.imageUrl = item?.imageUrl2 ?? item?.imageUrl ?? '';

      this.isGood = true;

      Haptics.vibrate({ duration: 100 });

      console.log('barcode', result.content); // log the raw scanned content

      this.sendData(this.barcode, true, !!this.flag, this.countryName);
    } else {
      this.countryName = 'Unknown Country';
      this.barcode = '';

      this.sendData(this.barcode, false, false, this.countryName);
    }
  }

  cancel() {
    this.mode = 'INITIAL';
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.isReviewCompleted = false;
    this.selectedReview = '';
    this.productName = '';

    try {
      this.countryName = 'Scan Product';

      this.barcode = '0000000000000';
      JsBarcode('#barcode', this.barcode, {
        format: 'EAN13',
        valid: () => true,
      });
      JsBarcode('#barcode2', this.barcode, {
        format: 'EAN13',
        valid: () => true,
      });
    } catch (err) {
      console.warn(err.toString());
    }
  }

  private async loadConfig() {
    try {
      const data = await fetch('https://server.jok.io/gs1-codes').then((x) =>
        x.json()
      );

      if (!data || !Array.isArray(data)) {
        return;
      }

      if (data.length < gs1Codes.length) {
        return;
      }

      await Storage.set({ key: 'config', value: JSON.stringify(data) });

      console.log('config updated successfully', data.length);
    } catch (err) {
      console.warn(err.toString());
    }
  }

  private async getConfig() {
    try {
      const data = await Storage.get({ key: 'config' });

      if (!data?.value) {
        return null;
      }

      const result = JSON.parse(data.value);

      console.log(result);
      return result ?? null;
    } catch (err) {
      console.warn(err.toString());
    }
  }

  private async sendData(
    barcode: string,
    isFound: boolean,
    hasFlag: boolean,
    productCountry: string
  ) {
    try {
      this.allowMoreInfo = false;
      const deviceId = await this.dataService.getDeviceId();
      const info = await Device.getInfo();

      console.log('sending deviceId', deviceId);

      const url = 'https://server.jok.io/scans';

      this.summaryItems = [];
      this.productName = '';

      const result = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          secret: environment.secret,
          barcode,
          info: {
            ...info,
            isFound,
            hasFlag,
            productCountry,
          },
        }),
      }).then((x) => x);

      console.log('api call result', result.status);

      const data = await result.json();

      console.log('received response', data);

      this.showMoreInfoButton = data.show;
      this.allowMoreInfo = true;

      if (data.info) {
        this.dataService.scannedProductInfo.set(this.barcode, data.info);
      }

      if (data.reqCookie) {
        this.dataService.reqCookie = data.reqCookie;
      }

      if (data.reqSessionId) {
        this.dataService.reqSessionId = data.reqSessionId;
      }

      if (data.reviews) {
        this.summaryItems = data.reviews.filter((x) =>
          this.allAllowedReviews.includes(x.code)
        );
      }

      if (data.productName) {
        this.productName = data.productName;
      }

      Storage.set({ key: 'SHOW_MORE_INFO', value: data.show ? '1' : '0' });
    } catch (err) {
      console.warn('api call error', err.toString());
      this.showMoreInfoButton = false;
    }
  }

  async sendReview(review: string) {
    const jsConfetti = new JSConfetti();

    let emoji = '';

    switch (review) {
      case 'thumbs_up':
        emoji = '👍';
        break;

      case 'sparkling_heart':
        emoji = '❤️';
        break;

      case 'relieved_face':
        emoji = '😌';
        break;

      case 'thinking_face':
        emoji = '🤔';
        break;

      case 'exploding_head':
        emoji = '🤯';
        break;

      case 'pleading_face':
        emoji = '🥺';
        break;

      case 'thumbs_down':
        emoji = '👎';
        break;

      case 'face_with_symbols_on_mouth':
        emoji = '🤬';
        break;

      case 'money_with_wings':
        emoji = '💸';
        break;

      case 'pile_of_poo':
        emoji = '💩';
        break;
    }

    jsConfetti
      .addConfetti({
        emojis: [emoji],
        emojiSize: 100,
        confettiNumber: 30,
      })
      .then(() => jsConfetti.clearCanvas);

    this.isReviewCompleted = true;
    this.selectedReview = review;

    try {
      const url = 'https://server.jok.io/scan-review-product';
      const deviceId = await this.dataService.getDeviceId();

      const result = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          secret: environment.secret,
          deviceId,
          productId: this.barcode,
          review,
          emoji,
        }),
      }).then((x) => x);
    } catch (err) {
      console.log(err);
    }
  }
}
