export function jsonToRenderItems(data: any): RenderItem[] {
  const items = Object.entries(data);

  return items
    .map(([key, value]) => {
      if (key === 'returnCode') {
        return;
      }

      if (value['_'] != null) {
        return { type: 'ITEM', key: prettifyKey(key), value: value['_'] };
      }

      if (typeof value === 'object') {
        const items = jsonToRenderItems(value);
        if (!items?.length) {
          return;
        }

        return {
          type: 'GROUP',
          groupName: prettifyKey(key),
          items,
        };
      }

      if (key === 'lastChangeDate') {
        return {
          type: 'ITEM',
          key: prettifyKey(key),
          value: new Date(value as any),
          isDate: true,
        };
      }

      return { type: 'ITEM', key: prettifyKey(key), value };
    })
    .filter((x) => !!x) as any;
}

export type RenderItem =
  | {
      type: 'ITEM';
      key: string;
      value: any;
      isDate?: boolean;
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
