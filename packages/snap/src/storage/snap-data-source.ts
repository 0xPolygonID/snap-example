import type { IDataSource } from '@0xpolygonid/js-sdk';

import { snapStorage } from '../rpc/store';

export class SnapDataSource<Type> implements IDataSource<Type> {
  // eslint-disable-next-line @typescript-eslint/no-parameter-properties
  constructor(private readonly _snapStorageKey: string) {
    this.init().then(console.log).catch(console.error);
  }

  async init() {
    const data = await snapStorage.getItem(this._snapStorageKey);
    if (!data) {
      await snapStorage.setItem(this._snapStorageKey, JSON.stringify([]));
    }
  }

  async save(key: string, value: Type, keyName = 'id'): Promise<void> {
    if (snapStorage) {
      const data = await snapStorage.getItem(this._snapStorageKey);
      const items = JSON.parse(data) || [];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const itemIndex = items.findIndex((i) => i[keyName] === key);
      if (itemIndex === -1) {
        items.push(value);
      } else {
        items[itemIndex] = value;
      }
      await snapStorage.setItem(this._snapStorageKey, JSON.stringify(items));
    }
  }

  async get(key: string, keyName = 'id'): Promise<Type | undefined> {
    const data = await snapStorage.getItem(this._snapStorageKey);
    const parsedData = data ? (JSON.parse(data) as Type[]) : [];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return parsedData.find((t) => t[keyName] === key);
  }

  async load(): Promise<Type[]> {
    const data = await snapStorage.getItem(this._snapStorageKey);
    return data && JSON.parse(data);
  }

  async delete(key: string, keyName = 'id'): Promise<void> {
    const dataStr = await snapStorage.getItem(this._snapStorageKey);
    const data = JSON.parse(dataStr) as Type[];
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const items = data.filter((i) => i[keyName] !== key);
    if (data.length === items.length) {
      throw new Error(`Error to delete: ${key}`);
    }
    await snapStorage.setItem(this._snapStorageKey, JSON.stringify(items));
  }
}
