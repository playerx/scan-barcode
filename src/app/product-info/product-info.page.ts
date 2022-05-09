import { AfterViewInit, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Http } from '@capacitor-community/http';
import { Device } from '@capacitor/device';
import { getBarcodeData } from 'src/domain/getBarcodeData';
import { jsonToRenderItems, RenderItem } from 'src/domain/jsonToRenderItems';
import { environment } from 'src/environments/environment';
import { DataService } from '../services/data.service';

declare let grecaptcha: any;
declare let JsBarcode: any;

@Component({
  selector: 'app-product-info',
  templateUrl: 'product-info.page.html',
  styleUrls: ['product-info.page.scss'],
})
export class ProductInfoPage implements OnInit, AfterViewInit {
  code: string;
  infoItems?: RenderItem[];
  isLoading: boolean;

  constructor(
    private route: ActivatedRoute,
    private dataService: DataService
  ) {}

  ngOnInit(): void {
    this.code = this.route.snapshot.paramMap.get('code');

    try {
      const cachedData = this.dataService.scannedProductInfo.get(this.code);
      if (cachedData) {
        this.infoItems = jsonToRenderItems(cachedData);
      }

      JsBarcode('#barcode2', this.code, {
        format: 'EAN13',
        valid: () => true,
      });
    } catch (err) {
      console.warn(err.toString());
    }
  }

  ngAfterViewInit(): void {
    const skipCaptcha = this.route.snapshot.queryParamMap.get('skipCaptcha');
    if (skipCaptcha) {
      return;
    }

    grecaptcha.render('recaptcha2', {
      sitekey: '6LegCyMTAAAAABwW5HZ3eX41sG83CSZFK7sKs5XP',
    });
  }

  async onSubmit(e: any) {
    try {
      e.preventDefault();
      const captcha = e.target[0].value;

      if (!captcha) {
        throw new Error('Please check the captcha checkbox');
      }

      this.isLoading = true;

      console.log('starting request', this.code, captcha);

      const info = await getBarcodeData(this.code, captcha);

      console.log(info);

      const minimalData = info.gepirParty?.partyDataLine ?? {};

      this.infoItems = jsonToRenderItems(minimalData);

      this.sendData(this.code, info);
    } catch (err) {
      alert(err.message);
    }
  }

  private async sendData(barcode: string, info: any) {
    try {
      this.dataService.scannedProductInfo.set(
        this.code,
        info?.gepirParty?.partyDataLine
      );

      const deviceId = await this.dataService.getDeviceId();

      console.log('sending deviceId', deviceId);

      const url = 'https://server.jok.io/scan-product-info';

      const result = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          deviceId,
          secret: environment.secret,
          barcode,
          info,
        }),
      }).then((x) => x);

      console.log('api call result', result.status);

      const data = await result.text();

      console.log('received response', data);
    } catch (err) {
      console.warn('api call error', err.toString());
    }
  }
}
