export function jsonToRenderItems(data: any): RenderItem[] {
  const items = Object.entries(data);

  return items
    .flatMap(([key, value]): any => {
      if (key === 'returnCode') {
        return [];
      }

      if (
        key === 'gln' ||
        key === 'gepirRequestedKey' ||
        key === 'responderSpecificData'
      ) {
        return [];
      }

      if (value['_'] != null) {
        return [{ type: 'ITEM', key: prettifyKey(key), value: value['_'] }];
      }

      if (Array.isArray(value) && key === 'communicationChannel') {
        return value.map((x) => ({
          type: 'ITEM',
          key: prettifyKey(x.communicationChannelName),
          value: x.communicationValue,
          isLink: true,
          linkMode: x.communicationChannelCode?._,
        }));
      }

      if (typeof value === 'object') {
        const items = jsonToRenderItems(value).filter(
          (x) => x.type === 'GROUP' || !!x.value
        );
        if (!items?.length) {
          return [];
        }

        return [
          {
            type: 'GROUP',
            groupName: prettifyKey(key),
            items,
          },
        ];
      }

      if (key === 'lastChangeDate') {
        return [
          {
            type: 'ITEM',
            key: prettifyKey(key),
            value: new Date(value as any),
            isDate: true,
          },
        ];
      }

      return [{ type: 'ITEM', key: prettifyKey(key), value }];
    })
    .filter((x) => x.type === 'GROUP' || !!x.value);
}

export type RenderItem =
  | {
      type: 'ITEM';
      key: string;
      value: any;
      isDate?: boolean;
      isLink?: boolean;
      linkMode?: string;
    }
  | {
      type: 'GROUP';
      groupName: string;
      items: RenderItem[];
    };

function prettifyKey(key: string) {
  return (
    key
      // insert a space before all caps
      .replace(/([A-Z])/g, ' $1')
      // uppercase the first character
      .replace(/^./, function (str) {
        return str.toUpperCase();
      })
  );
}
