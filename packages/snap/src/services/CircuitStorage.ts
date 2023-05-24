import {
  CircuitId,
  CircuitStorage,
  InMemoryDataSource,
} from '@0xpolygonid/js-sdk';

const load = (path: string) => {
  return fetch(`http://localhost:8000${path}`);
};
export class CircuitStorageInstance {
  static instanceCS: CircuitStorage;

  static async init() {
    const authW = await load('/AuthV2/circuit.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    const mtpW = await load('/credentialAtomicQueryMTPV2/circuit.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    const sigW = await load('/credentialAtomicQuerySigV2/circuit.wasm')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));

    const authZ = await load('/AuthV2/circuit_final.zkey')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    const mtpZ = await load('/credentialAtomicQueryMTPV2/circuit_final.zkey')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    const sigZ = await load('/credentialAtomicQuerySigV2/circuit_final.zkey')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));

    const authJ = await load('/AuthV2/verification_key.json')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    const mtpJ = await load('/credentialAtomicQueryMTPV2/verification_key.json')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));
    const sigJ = await load('/credentialAtomicQuerySigV2/verification_key.json')
      .then((response) => response.arrayBuffer())
      .then((buffer) => new Uint8Array(buffer));

    if (!this.instanceCS) {
      this.instanceCS = new CircuitStorage(new InMemoryDataSource());
      await this.instanceCS.saveCircuitData(CircuitId.AuthV2, {
        circuitId: 'authV2'.toString(),
        wasm: authW,
        provingKey: authZ,
        verificationKey: authJ,
      });

      await this.instanceCS.saveCircuitData(CircuitId.AtomicQueryMTPV2, {
        circuitId: 'credentialAtomicQueryMTPV2'.toString(),
        wasm: mtpW,
        provingKey: mtpZ,
        verificationKey: mtpJ,
      });

      await this.instanceCS.saveCircuitData(CircuitId.AtomicQuerySigV2, {
        circuitId: 'credentialAtomicQuerySigV2'.toString(),
        wasm: sigW,
        provingKey: sigZ,
        verificationKey: sigJ,
      });
    }
    console.log(this.instanceCS);
  }

  static getCircuitStorageInstance() {
    return this.instanceCS;
  }
}
