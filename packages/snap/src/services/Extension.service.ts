import { proving } from '@iden3/js-jwz';
import {
  AuthHandler,
  CircuitId,
  CredentialStorage,
  CredentialWallet,
  DataPrepareHandlerFunc,
  EthStateStorage,
  IdentityStorage,
  IdentityWallet,
  JWSPacker,
  KMS,
  PackageManager,
  PlainPacker,
  ProofService,
  VerificationHandlerFunc,
  ZKPPacker,
} from '@0xpolygonid/js-sdk';
import { DID } from '@iden3/js-iden3-core';
import { defaultEthConnectionConfig, INIT } from '../constants';
import { SnapMerkleTreeLocalStorage } from '../storage/snap-merkletree-store';
import { CircuitStorageInstance } from './CircuitStorage';
import { WalletService } from './Wallet.service';
import { DIDResolutionOptions, DIDResolutionResult } from 'did-resolver';

export class ExtensionService {
  static instanceES: {
    packageMgr: PackageManager;
    proofService: ProofService;
    credWallet: CredentialWallet;
    wallet: IdentityWallet;
    dataStorage: {
      credential: CredentialStorage;
      identity: IdentityStorage;
      mt: SnapMerkleTreeLocalStorage;
      states: EthStateStorage;
    };
    authHandler: AuthHandler;
    status: string;
  };

  static async init() {
    await CircuitStorageInstance.init();

    const accountInfo = await WalletService.createWallet();
    const { wallet, credWallet, dataStorage, kms } = accountInfo;

    const circuitStorage = CircuitStorageInstance.getCircuitStorageInstance();

    const proofService = new ProofService(
      wallet,
      credWallet,
      circuitStorage,
      new EthStateStorage(defaultEthConnectionConfig),
      { ipfsGatewayURL: 'https://ipfs.io' },
    );

    const packageMgr = await ExtensionService.getPackageMgr(
      await circuitStorage.loadCircuitData(CircuitId.AuthV2),
      proofService.generateAuthV2Inputs.bind(proofService),
      proofService.verifyState.bind(proofService),
      kms,
    );

    const authHandler = new AuthHandler(packageMgr, proofService);

    if (!this.instanceES) {
      this.instanceES = {
        packageMgr,
        proofService,
        credWallet,
        wallet,
        dataStorage,
        authHandler,
        status: INIT,
      };
    }
    console.log('Extension services has been initialized', this.instanceES);
    return this.instanceES;
  }

  static async getPackageMgr(
    circuitData: {
      circuitId?: string;
      wasm: any;
      verificationKey: any;
      provingKey: any;
    },
    prepareFn: {
      (hash: Uint8Array, did: DID, circuitId: CircuitId): Promise<Uint8Array>;
      (hash: Uint8Array, did: DID, circuitId: CircuitId): Promise<Uint8Array>;
    },
    stateVerificationFn: {
      (circuitId: string, pubSignals: string[]): Promise<boolean>;
      (id: string, pubSignals: string[]): Promise<boolean>;
    },
    kms: KMS,
  ) {
    const authInputsHandler = new DataPrepareHandlerFunc(prepareFn);
    const verificationFn = new VerificationHandlerFunc(stateVerificationFn);
    const mapKey =
      proving.provingMethodGroth16AuthV2Instance.methodAlg.toString();
    const verificationParamMap = new Map([
      [
        mapKey,
        {
          key: circuitData.verificationKey,
          verificationFn,
        },
      ],
    ]);

    const provingParamMap = new Map();
    provingParamMap.set(mapKey, {
      dataPreparer: authInputsHandler,
      provingKey: circuitData.provingKey,
      wasm: circuitData.wasm,
    });

    const mgr = new PackageManager();
    const packer = new ZKPPacker(provingParamMap, verificationParamMap);
    const plainPacker = new PlainPacker();
    const resolveDIDDocument = async (
      didUrl: string,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      options?: DIDResolutionOptions,
    ): Promise<DIDResolutionResult> => {
      try {
        const response = await fetch(
          `https://dev.uniresolver.io/1.0/identifiers/${didUrl}`,
        );
        const data = await response.json();
        return data as DIDResolutionResult;
      } catch (error: unknown) {
        throw new Error(
          `Can't resolve did document: ${(error as Error).message}`,
        );
      }
    };

    const jwsPacker = new JWSPacker(kms, { resolve: resolveDIDDocument });
    mgr.registerPackers([packer, plainPacker, jwsPacker]);

    return mgr;
  }

  static getExtensionServiceInstance() {
    return this.instanceES;
  }
}
