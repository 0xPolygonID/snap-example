/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { W3CCredential } from '@0xpolygonid/js-sdk';
import { core, CredentialStatusType } from '@0xpolygonid/js-sdk';

import { RHS_URL } from '../constants';
import { ExtensionService } from './Extension.service';

export class IdentityServices {
  static instanceIS: { did: core.DID; credential: W3CCredential };

  static async createIdentity(seed: Uint8Array) {
    if (!this.instanceIS) {
      const { wallet } = ExtensionService.getExtensionServiceInstance();

      const identity = await wallet.createIdentity({
        method: core.DidMethod.Iden3!,
        blockchain: core.Blockchain.Polygon!,
        networkId: core.NetworkId.Mumbai!,
        seed,
        revocationOpts: {
          type: CredentialStatusType.Iden3ReverseSparseMerkleTreeProof,
          id: RHS_URL,
        },
      });
      console.log('!!!!!!!!!!!!!!!!', identity);
      this.instanceIS = identity;
      return this.instanceIS;
    }
    return this.instanceIS;
  }

  static getIdentityInstance() {
    return this.instanceIS;
  }
}
