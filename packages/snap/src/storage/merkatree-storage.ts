import type {
  ITreeStorage,
  Bytes,
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Node,
} from '@iden3/js-merkletree';
import {
  Hash,
  bytes2Hex,
  ZERO_HASH,
  NODE_TYPE_EMPTY,
  NodeEmpty,
  NODE_TYPE_MIDDLE,
  NodeMiddle,
  NODE_TYPE_LEAF,
  NodeLeaf,
} from '@iden3/js-merkletree';

import { snapStorage } from '../rpc/store';

export class SnapMerkletreeStorageDB implements ITreeStorage {
  _currentRoot: Hash;

  private readonly hash: string;

  constructor(private readonly prefix: Bytes) {
    this._currentRoot = ZERO_HASH;
    this.hash = bytes2Hex(prefix);
  }

  async get(k: Bytes): Promise<Node | undefined> {
    const kBytes = new Uint8Array([...this.prefix, ...k]);
    const key = bytes2Hex(kBytes);
    const val = await snapStorage.getItem(key);

    if (val === null) {
      return undefined;
    }

    const obj = JSON.parse(val);
    // eslint-disable-next-line default-case
    switch (obj.type) {
      case NODE_TYPE_EMPTY:
        return new NodeEmpty();
      case NODE_TYPE_MIDDLE: {
        const cL = new Hash(Uint8Array.from(obj.childL));
        const cR = new Hash(Uint8Array.from(obj.childR));

        return new NodeMiddle(cL, cR);
      }

      case NODE_TYPE_LEAF: {
        const kv = new Hash(Uint8Array.from(obj.entry[0]));
        const v = new Hash(Uint8Array.from(obj.entry[1]));

        return new NodeLeaf(kv, v);
      }
    }

    throw new Error(
      `error: value found for key ${bytes2Hex(kBytes)} is not of type Node`,
    );
  }

  async put(k: Bytes, node: Node): Promise<void> {
    const kBytes = new Uint8Array([...this.prefix, ...k]);
    const key = bytes2Hex(kBytes);
    const toSerialize: Record<string, unknown> = {
      type: node.type,
    };
    if (node instanceof NodeMiddle) {
      toSerialize.childL = Array.from(node.childL.bytes);
      toSerialize.childR = Array.from(node.childR.bytes);
    } else if (node instanceof NodeLeaf) {
      toSerialize.entry = [
        Array.from(node.entry[0].bytes),
        Array.from(node.entry[1].bytes),
      ];
    }
    const val = JSON.stringify(toSerialize);
    await snapStorage.setItem(key, val);
  }

  async getRoot(): Promise<Hash> {
    if (!this._currentRoot.equals(ZERO_HASH)) {
      return this._currentRoot;
    }
    // const root = await get(this._prefixHash, this._store);
    const rootStr = await snapStorage.getItem(this.hash);
    const bytes: number[] = JSON.parse(rootStr);
    // eslint-disable-next-line no-negated-condition
    if (!rootStr) {
      this._currentRoot = ZERO_HASH;
    } else {
      this._currentRoot = new Hash(Uint8Array.from(bytes));
    }
    return this._currentRoot;
  }

  async setRoot(root: Hash): Promise<void> {
    this._currentRoot = root;
    await snapStorage.setItem(
      bytes2Hex(this.prefix),
      JSON.stringify(Array.from(root.bytes)),
    );
  }
}
