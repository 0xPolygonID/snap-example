import {
  CircuitData,
  CircuitId,
  CircuitStorage,
  InMemoryDataSource,
  base64ToBytes,
  byteEncoder,
} from '@0xpolygonid/js-sdk';
import sigZ from '../circuits/credentialAtomicQuerySigV2/circuit_final.zkey.json';
import sigW from '../circuits/credentialAtomicQuerySigV2/circuit.wasm.json';
import sigV from '../circuits/credentialAtomicQuerySigV2/verification_key.json';

import mtpZ from '../circuits/credentialAtomicQueryMTPV2/circuit_final.zkey.json';
import mtpW from '../circuits/credentialAtomicQueryMTPV2/circuit.wasm.json';
import mtpV from '../circuits/credentialAtomicQueryMTPV2/verification_key.json';

import authZ from '../circuits/authV2/circuit_final.zkey.json';
import authW from '../circuits/authV2/circuit.wasm.json';
import authV from '../circuits/authV2/verification_key.json';

export type b64File = {
  b64: string;
};

export class CircuitStorageInstance {
  static instanceCS: CircuitStorage;

  static async init() {
    if (!this.instanceCS) {
      this.instanceCS = new CircuitStorage(
        new InMemoryDataSource<CircuitData>(),
      );
    }

    try {
      await this.instanceCS.loadCircuitData(CircuitId.AtomicQuerySigV2);
    } catch {
      await this.instanceCS.saveCircuitData(CircuitId.AtomicQuerySigV2, {
        circuitId: 'credentialAtomicQuerySigV2',
        wasm: base64ToBytes((sigW as b64File).b64),
        provingKey: base64ToBytes((sigZ as b64File).b64),
        verificationKey: byteEncoder.encode(JSON.stringify(sigV)),
      });

      await this.instanceCS.saveCircuitData(CircuitId.AuthV2, {
        circuitId: 'authV2',
        wasm: base64ToBytes((authW as b64File).b64),
        provingKey: base64ToBytes((authZ as b64File).b64),
        verificationKey: byteEncoder.encode(JSON.stringify(authV)),
      });

      await this.instanceCS.saveCircuitData(CircuitId.AtomicQueryMTPV2, {
        circuitId: 'credentialAtomicQueryMTPV2',
        wasm: base64ToBytes((mtpW as b64File).b64),
        provingKey: base64ToBytes((mtpZ as b64File).b64),
        verificationKey: byteEncoder.encode(JSON.stringify(mtpV)),
      });
    }

    console.log(this.instanceCS);
  }

  static getCircuitStorageInstance() {
    return this.instanceCS;
  }
}
