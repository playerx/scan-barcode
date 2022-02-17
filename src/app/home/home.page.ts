import { Component, OnInit } from '@angular/core';
import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import { Camera } from '@capacitor/camera';
import { Device } from '@capacitor/device';
import { Haptics } from '@capacitor/haptics';
import { Storage } from '@capacitor/storage';
import { environment } from 'src/environments/environment';
import { v4 } from 'uuid';
import { gs1Codes } from '../gs1Codes';

// eslint-disable-next-line @typescript-eslint/naming-convention
declare let JsBarcode: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itemsMap: Map<string, any>;

  countryName = "Scan Product's";
  barcode: string;
  flag: string;
  imageUrl: string;
  isGood = false;
  isBad = false;

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

  async ngOnInit() {
    const config = (await this.getConfig()) ?? gs1Codes;

    try {
      this.barcode = '0000000000000';
      JsBarcode('#barcode', this.barcode, {
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

  async scan() {
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
        } catch (err) {
          console.warn(err.toString());
        }
      }

      const barCodePrefix = this.barcode.slice(0, 3);

      console.log(this.barcode, barCodePrefix, this.itemsMap.has(this.barcode));

      const item = this.itemsMap.get(barCodePrefix);

      this.countryName = item?.country ?? 'Unknown Country';
      this.flag = item?.flag ?? '';
      this.imageUrl = item?.imageUrl ?? '';

      this.isGood = true;

      Haptics.vibrate({ duration: 100 });

      console.log('barcode', result.content); // log the raw scanned content

      this.sendData(this.barcode, true, !!this.flag);
    } else {
      this.countryName = 'Unknown Country';
      this.barcode = '';

      this.sendData(this.barcode, false, false);
    }
  }

  cancel() {
    this.mode = 'INITIAL';
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
    document.body.classList.remove('qrscanner');

    try {
      this.countryName = "Scan Product's";

      this.barcode = '0000000000000';
      JsBarcode('#barcode', this.barcode, {
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

  private async sendData(barcode: string, isFound: boolean, hasFlag: boolean) {
    try {
      const deviceId = await this.getDeviceId();
      console.log('beo');
      const info = await Device.getInfo();

      console.log('sending deviceId', deviceId);

      const url = 'https://server.jok.io/scans';

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
          },
        }),
      }).then((x) => x);

      console.log('api call result', result.status, await result.text());
    } catch (err) {
      console.warn(err.toString());
    }
  }

  private async getDeviceId() {
    const id = await Storage.get({ key: 'deviceId' });

    if (id?.value) {
      return id.value;
    }

    const newId = v4();

    await Storage.set({ key: 'deviceId', value: newId });

    return newId;
  }
}
