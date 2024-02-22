import type { CircuitData } from '@0xpolygonid/js-sdk';
import {
  CircuitId,
  InMemoryDataSource,
  byteEncoder,
  CircuitStorage,
  base64UrlToBytes,
} from '@0xpolygonid/js-sdk';

import authW from '../circuits/authV2/circuit.wasm.json';
import authZ from '../circuits/authV2/circuit_final.zkey.json';
import authV from '../circuits/authV2/verification_key.json';
// import mtpW from '../circuits/credentialAtomicQueryMTPV2/circuit.wasm.json';
// import mtpZ from '../circuits/credentialAtomicQueryMTPV2/circuit_final.zkey.json';
// import mtpV from '../circuits/credentialAtomicQueryMTPV2/verification_key.json';
// import sigW from '../circuits/credentialAtomicQuerySigV2/circuit.wasm.json';
// import sigZ from '../circuits/credentialAtomicQuerySigV2/circuit_final.zkey.json';
// import sigV from '../circuits/credentialAtomicQuerySigV2/verification_key.json';

export type B64File = {
  b64: string;
};

export class CircuitStorageInstance {
  static instanceCS: CircuitStorage;

  static async init() {
    if (!this.instanceCS) {
      this.instanceCS = new CircuitStorage(
        new InMemoryDataSource<CircuitData>(),
      );
      console.log('CircuitStorageInstance init', this.instanceCS);
    }
    try {
      await this.instanceCS.loadCircuitData(CircuitId.AuthV2);
    } catch (error) {
      // await this.instanceCS.saveCircuitData(CircuitId.AtomicQuerySigV2, {
      //   circuitId: 'credentialAtomicQuerySigV2',
      //   wasm: base64UrlToBytes((sigW as B64File).b64),
      //   provingKey: base64UrlToBytes((sigZ as B64File).b64),
      //   verificationKey: byteEncoder.encode(JSON.stringify(sigV)),
      // });
      console.log(error);
      try {
        await this.instanceCS.saveCircuitData(CircuitId.AuthV2, {
          circuitId: CircuitId.AuthV2,
          wasm: base64UrlToBytes((authW as B64File).b64),
          provingKey: base64UrlToBytes((authZ as B64File).b64),
          verificationKey: byteEncoder.encode(JSON.stringify(authV)),
        });
        console.log('saveCircuitData');
      } catch (error2) {
        console.log('saveCircuitData error');
        console.log(error2);
      }
      // await this.instanceCS.saveCircuitData(CircuitId.AtomicQueryMTPV2, {
      //   circuitId: 'credentialAtomicQueryMTPV2',
      //   wasm: base64UrlToBytes((mtpW as B64File).b64),
      //   provingKey: base64UrlToBytes((mtpZ as B64File).b64),
      //   verificationKey: byteEncoder.encode(JSON.stringify(mtpV)),
      // });
    }
    console.log(this.instanceCS);
  }

  static getCircuitStorageInstance() {
    return this.instanceCS;
  }
}
