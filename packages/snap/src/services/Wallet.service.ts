import {
  IdentityStorage,
  CredentialStorage,
  BjjProvider,
  KmsKeyType,
  IdentityWallet,
  CredentialWallet,
  KMS,
  EthStateStorage,
  CredentialStatusResolverRegistry,
  CredentialStatusType,
  IssuerResolver,
  OnChainResolver,
  RHSResolver,
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
    const resolvers = new CredentialStatusResolverRegistry();
    resolvers.register(
      CredentialStatusType.SparseMerkleTreeProof,
      new IssuerResolver(),
    );

    resolvers.register(
      CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
      new RHSResolver(dataStorage.states),
    );

    resolvers.register(
      CredentialStatusType.Iden3OnchainSparseMerkleTreeProof2023,
      new OnChainResolver([defaultEthConnectionConfig]),
    );
    const credWallet = new CredentialWallet(dataStorage, resolvers);
    const wallet = new IdentityWallet(kms, dataStorage, credWallet);

    return {
      wallet,
      credWallet,
      kms,
      dataStorage,
    };
  }
}
