import { Component, OnInit } from '@angular/core';
import {
  BarcodeScanner,
  SupportedFormat,
} from '@capacitor-community/barcode-scanner';
import { Camera } from '@capacitor/camera';
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

  constructor() {}

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

        return new Array(end - start).fill(0).map((_, i) => ({
          ...x,
          barcode: (start + i).toString().padStart(3, '0'),
        }));
      })
      .reduce((r, x) => r.set(x.barcode, x), new Map());
  }

  async scan() {
    const pr = Camera.requestPermissions({ permissions: ['camera'] });
    console.log('permission result', pr);

    const permissions = await BarcodeScanner.checkPermission({});

    console.log(permissions);
    await BarcodeScanner.prepare();

    BarcodeScanner.hideBackground(); // make background of WebView transparent
    document.body.classList.add('qrscanner');

    this.countryName = '';
    this.barcode = '';
    this.flag = '';

    const result = await BarcodeScanner.startScan({
      targetedFormats: [SupportedFormat.EAN_13],
    }); // start scanning and wait for a result

    console.log('result', result);
    document.body.classList.remove('qrscanner');

    // if the result has content
    if (result.hasContent) {
      this.barcode = result.content;

      const barCodePrefix = this.barcode.slice(0, 3);

      this.countryName =
        this.itemsMap.get(barCodePrefix)?.country ?? 'Unknown Country';
      this.flag = this.itemsMap.get(barCodePrefix)?.flag ?? '';

      console.log(result.content); // log the raw scanned content
    } else {
      this.countryName = 'Unknown Country';
      this.barcode = 'unknown';
    }
  }
}
