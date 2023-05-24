import { AbstractPrivateKeyStore } from '@0xpolygonid/js-sdk';
import { snapStorage } from '../rpc/store';

export class SnapStoragePrivateKeyStore implements AbstractPrivateKeyStore {
  static readonly storageKey = 'keystore';

  async get(args: { alias: string }): Promise<string> {
    const dataStr = await snapStorage.getItem(
      SnapStoragePrivateKeyStore.storageKey,
    );
    if (!dataStr) {
      throw new Error('no key under given alias');
    }
    const data = JSON.parse(dataStr);
    const privateKey = data.find((d: { id: string }) => d.id === args.alias);
    if (!privateKey) {
      throw new Error('no key under given alias');
    }
    return privateKey.value;
  }

  async importKey(args: { alias: string; key: string }): Promise<void> {
    const dataStr = await snapStorage.getItem(
      SnapStoragePrivateKeyStore.storageKey,
    );
    let data = [];
    if (dataStr) {
      data = JSON.parse(dataStr);
    }

    const index = data.findIndex((d: { id: string }) => d.id === args.alias);
    if (index > -1) {
      data[index].value = args.key;
    } else {
      data.push({ id: args.alias, value: args.key });
    }

    await snapStorage.setItem(
      SnapStoragePrivateKeyStore.storageKey,
      JSON.stringify(data),
    );
  }
}
