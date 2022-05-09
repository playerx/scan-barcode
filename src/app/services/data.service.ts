import { Injectable } from '@angular/core';
import { Storage } from '@capacitor/storage';
import { v4 } from 'uuid';

@Injectable({ providedIn: 'root' })
export class DataService {
  scannedProductInfo = new Map<string, any>();

  reqCookie: string;
  reqSessionId: string;

  async getDeviceId() {
    const id = await Storage.get({ key: 'deviceId' });

    if (id?.value) {
      return id.value;
    }

    const newId = v4();

    await Storage.set({ key: 'deviceId', value: newId });

    return newId;
  }
}
