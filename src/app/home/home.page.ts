import { Component, OnInit, computed, effect, signal } from '@angular/core';
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
  barcode = signal('');

  barcodePrefix = computed(() => {
    const barcodeValue = this.barcode();
    if (!barcodeValue) {
      return '';
    }

    const barCodePrefix = barcodeValue.slice(0, 3);

    return barCodePrefix;
  });

  countryName = computed(() => {
    const barcodePrefixValue = this.barcodePrefix();

    if (!barcodePrefixValue) {
      return 'Scan Product';
    }

    const item = this.itemsMap.get(barcodePrefixValue);
    if (!item?.country) {
      return 'Unknown Country';
    }

    return item.country;
  });

  flag = computed(() => {
    const barcodePrefixValue = this.barcodePrefix();

    if (!barcodePrefixValue) {
      return '';
    }

    const item = this.itemsMap.get(barcodePrefixValue);
    if (!item?.flag) {
      return '';
    }

    return item.flag;
  });

  productName = signal('');

  productImageUrl = computed(() => {
    const barcodePrefixValue = this.barcodePrefix();

    if (!barcodePrefixValue) {
      return '';
    }

    const item = this.itemsMap.get(barcodePrefixValue);

    return item?.imageUrl2 ?? item?.imageUrl ?? '';
  });

  showMoreInfoButton = signal<boolean>(null);
  allowMoreInfo = signal(true);

  selectedReview = signal('');

  isReviewCompleted = computed(() => !!this.selectedReview());

  allowedReviews = computed(() => {
    if (this.countryName() === 'Russian Federation') {
      const items = this.reviewEmotions.slice();
      items[4] = 'pile_of_poo';
      return items;
    }

    return this.reviewEmotions;
  });

  itemsMap: Map<string, any>;

  summaryItems = [];

  reviewEmotions = [
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

  allAllowedReviews = this.reviewEmotions.concat(['pile_of_poo']);

  mode = signal<'INITIAL' | 'SCAN' | 'FOUND'>('INITIAL');

  isInitialMode = computed(() => this.mode() === 'INITIAL');
  isScanMode = computed(() => this.mode() === 'SCAN');
  isFoundMode = computed(() => this.mode() === 'FOUND');

  constructor(
    private dataService: DataService,
    private modal: ModalController,
    private routerOutlet: IonRouterOutlet
  ) {
    effect(() => {
      try {
        const barcodeValue = this.barcode() || '0000000000000';

        if (barcodeValue.length === 13 || barcodeValue.length === 8) {
          JsBarcode('#barcode', barcodeValue, {
            format: barcodeValue.length === 13 ? 'EAN13' : 'EAN8',
            valid: () => true,
          });
          JsBarcode('#barcode2', barcodeValue, {
            format: barcodeValue.length === 13 ? 'EAN13' : 'EAN8',
            valid: () => true,
          });
        } else {
          // TODO: clear barcode
        }
      } catch (err) {
        alert(err.toString());
        console.warn(err);
      }
    });

    effect(() => {
      const value = this.showMoreInfoButton();
      if (value === null) {
        return;
      }

      Storage.set({ key: 'SHOW_MORE_INFO', value: value ? '1' : '0' });
    });
  }

  async ngOnInit() {
    this.barcode.set('');

    this.showMoreInfoButton.set(
      await Storage.get({ key: 'SHOW_MORE_INFO' }).then((x) => x.value == '1')
    );

    const config = (await this.getConfig()) ?? gs1Codes;

    this.initMap(config);

    this.loadConfigFromServer();
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
    this.selectedReview.set('');

    const pr = await Camera.requestPermissions({ permissions: ['camera'] });
    console.log('permission result', pr);

    if (pr.camera !== 'granted') {
      alert('Please enable camera permission from Settings');
      return;
    }

    this.barcode.set('');
    this.mode.set('SCAN');

    BarcodeScanner.hideBackground();
    document.body.classList.add('qrscanner');

    const result = await BarcodeScanner.startScan({
      targetedFormats: [SupportedFormat.EAN_13, SupportedFormat.EAN_8],
    }); // start scanning and wait for a result

    console.log('result', result);
    document.body.classList.remove('qrscanner');
    this.mode.set('FOUND');

    // if the result has content
    if (result.hasContent) {
      this.barcode.set(result.content);

      Haptics.vibrate({ duration: 100 });

      this.sendData(this.barcode(), true, !!this.flag(), this.countryName());
    } else {
      this.barcode.set('');

      this.sendData(this.barcode(), false, false, this.countryName());
    }
  }

  cancel() {
    this.mode.set('INITIAL');
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');
    this.selectedReview.set('');
    this.productName.set('');

    this.barcode.set('');
  }

  private initMap(config: any) {
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
  }

  private async loadConfigFromServer() {
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

      this.initMap(data);
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
      this.allowMoreInfo.set(false);
      const deviceId = await this.dataService.getDeviceId();
      const info = await Device.getInfo();

      console.log('sending deviceId', deviceId);

      const url = 'https://server.jok.io/scans';

      this.summaryItems = [];
      this.productName.set('');

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

      this.showMoreInfoButton.set(data.show);
      this.allowMoreInfo.set(true);

      if (data.info) {
        this.dataService.scannedProductInfo.set(this.barcode(), data.info);
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
        this.productName.set(data.productName);
      }
    } catch (err) {
      console.warn('api call error', err.toString());
      this.showMoreInfoButton.set(false);
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

    this.selectedReview.set(review);

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
