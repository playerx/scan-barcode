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

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {
  itemsMap: Map<string, any>;

  countryName: string;
  barcode: string;
  flag: string;
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

  ngOnInit() {
    this.itemsMap = gs1Codes
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
    this.mode = 'SCAN';
    this.isGood = false;
    this.isBad = false;

    BarcodeScanner.hideBackground();
    document.body.classList.add('qrscanner');

    const result = await BarcodeScanner.startScan({
      targetedFormats: [SupportedFormat.EAN_13],
    }); // start scanning and wait for a result

    console.log('result', result);
    document.body.classList.remove('qrscanner');
    this.mode = 'FOUND';

    // if the result has content
    if (result.hasContent) {
      this.barcode = result.content;

      const barCodePrefix = this.barcode.slice(0, 3);

      this.countryName =
        this.itemsMap.get(barCodePrefix)?.country ?? 'Unknown Country';
      this.flag = this.itemsMap.get(barCodePrefix)?.flag ?? '';

      this.isGood = true;

      Haptics.vibrate({ duration: 100 });

      console.log('barcode', result.content); // log the raw scanned content

      this.sendData(this.barcode, true, !!this.flag);
    } else {
      this.countryName = 'Unknown Country';
      this.barcode = 'unknown';

      this.sendData(this.barcode, false, false);
    }

    // this.scan();
  }

  cancel() {
    this.mode = 'INITIAL';
    BarcodeScanner.showBackground();
    BarcodeScanner.stopScan();
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
