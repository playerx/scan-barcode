import { Http, HttpResponse } from '@capacitor-community/http';

export async function getBarcodeData(
  barcode: string,
  recaptcha: string,
  reqCookie = '41e4c95d7c759d614046ee36c27d0981=a2f62d02c1db326c32459dfbf13c7b4e; cb-enabled=enabled; _ga=GA1.2.32378198.1652032293; _gid=GA1.2.1827647358.1652032293; _gat=1; _jsuid=528501127; _no_tracky_101136351=1; _ga=GA1.3.32378198.1652032293; _gid=GA1.3.1827647358.1652032293; _gat_UA-889776-1=1',
  reqSessionId = 'cad943c06cb23b04c1bd6fcdfbbb09d4'
): Promise<any> {
  const response: HttpResponse = await Http.post({
    url: 'https://gepir.gs1.org/index.php?option=com_gepir4ui&view=getkeylicensee&format=raw',
    headers: {
      'sec-ch-ua':
        '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sec-ch-ua-mobile': '?0',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
      'sec-ch-ua-platform': 'macOS',
      Cookie: reqCookie,
    },
    data: {
      [reqSessionId]: '1',
      'g-recaptcha-response': recaptcha,
      keyCode: 'gtin',
      keyValue: barcode,
      requestTradeItemType: 'ownership',
    },
  });

  if (response.status !== 200) {
    throw new Error('Request failed, please try again later.');
  }

  const data = JSON.parse(response.data);

  console.log(data);
  if (data?.gepirParty?.partyDataLine?.returnCode?._ == '14') {
    throw new Error(
      'Daily request limit exceeded. Please try again tomorrow, or different IP address'
    );
  }

  const response2: HttpResponse = await Http.post({
    url: 'https://gepir.gs1.org/index.php?option=com_gepir4ui&view=getitembygtin&format=raw',
    headers: {
      'sec-ch-ua':
        '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'sec-ch-ua-mobile': '?0',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
      'sec-ch-ua-platform': 'macOS',
      Cookie: reqCookie,
    },
    data: {
      [reqSessionId]: '1',
      'g-recaptcha-response': recaptcha,
      keyCode: 'gtin',
      keyValue: barcode,
      requestTradeItemType: 'information',
    },
  });

  const data2 = JSON.parse(response2.data);
  if (data2?.gepirItem?.itemDataLine?.returnCode?._ == '14') {
    throw new Error(
      'Daily request limit exceeded. Please try again tomorrow, or different IP address'
    );
  }

  return {
    ...data,
    gepirItem: data2?.gepirItem,
  };
}
