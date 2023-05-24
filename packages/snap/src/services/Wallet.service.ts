import {
  // LocalStoragePrivateKeyStore,
  IdentityStorage,
  // MerkleTreeLocalStorage,
  // InMemoryMerkleTreeStorage,
  CredentialStorage,
  BjjProvider,
  KmsKeyType,
  IdentityWallet,
  CredentialWallet,
  KMS,
  // InMemoryDataSource,
  EthStateStorage,
  // InMemoryPrivateKeyStore,
} from '@0xpolygonid/js-sdk';

import { defaultEthConnectionConfig } from '../constants';
import { SnapStoragePrivateKeyStore, SnapDataSource } from '../storage';
import { SnapMerkleTreeLocalStorage } from '../storage/snap-merkletree-store';

export class WalletService {
  static async createWallet() {
    const keyStore = new SnapStoragePrivateKeyStore();
    // const memoryKeyStore = new InMemoryPrivateKeyStore();
    const bjjProvider = new BjjProvider(KmsKeyType.BabyJubJub, keyStore);
    const kms = new KMS();
    kms.registerKeyProvider(KmsKeyType.BabyJubJub, bjjProvider);

    const dataStorage = {
      credential: new CredentialStorage(
        new SnapDataSource(CredentialStorage.storageKey),
      ),
      identity: new IdentityStorage(
        new SnapDataSource(IdentityStorage.identitiesStorageKey),
        new SnapDataSource(IdentityStorage.profilesStorageKey),
      ),
      mt: new SnapMerkleTreeLocalStorage(40),
      // mt: new InMemoryMerkleTreeStorage(40),
      states: new EthStateStorage(defaultEthConnectionConfig),
    };
    // const dataStorage = {
    //   credential: new CredentialStorage(new InMemoryDataSource()),
    //   identity: new IdentityStorage(
    //     new InMemoryDataSource(),
    //     new InMemoryDataSource(),
    //   ),
    //   mt: new InMemoryMerkleTreeStorage(40),
    //   states: new EthStateStorage(defaultEthConnectionConfig),
    // };
    const credWallet = new CredentialWallet(dataStorage);
    const wallet = new IdentityWallet(kms, dataStorage, credWallet);

    return {
      wallet,
      credWallet,
      kms,
      dataStorage,
    };
  }
}
