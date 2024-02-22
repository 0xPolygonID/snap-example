import type {
  IdentityMerkleTreeMetaInformation,
  IMerkleTreeStorage,
} from '@0xpolygonid/js-sdk';
import { MerkleTreeType } from '@0xpolygonid/js-sdk';
import { Merkletree, str2Bytes } from '@iden3/js-merkletree';
import * as uuid from 'uuid';

import { snapStorage } from '../rpc/store';
import { SnapMerkletreeStorageDB } from './merkatree-storage';

const mtTypes = [
  MerkleTreeType.Claims,
  MerkleTreeType.Revocations,
  MerkleTreeType.Roots,
];

export class SnapMerkleTreeLocalStorage implements IMerkleTreeStorage {
  static readonly storageKeyMeta = 'merkleTreeMeta';

  // eslint-disable-next-line @typescript-eslint/no-parameter-properties
  constructor(private readonly _mtDepth: number) {}

  async createIdentityMerkleTrees(
    identifier: string,
  ): Promise<IdentityMerkleTreeMetaInformation[]> {
    if (!identifier) {
      // eslint-disable-next-line no-param-reassign
      identifier = `${uuid.v4()}`;
    }

    const createMetaInfo = () => {
      const treesMeta: IdentityMerkleTreeMetaInformation[] = [];
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let index = 0; index < mtTypes.length; index++) {
        const mType = mtTypes[index];
        const treeId = identifier.concat(`+${mType.toString()}`);
        const metaInfo = { treeId, identifier, type: mType };
        treesMeta.push(metaInfo);
      }
      return treesMeta;
    };
    const meta = await snapStorage.getItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
    );
    if (meta) {
      // eslint-disable-next-line no-debugger
      const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
      const identityMetaInfo = metaInfo.filter(
        (m) => m.identifier === identifier,
      );
      if (identityMetaInfo.length > 0) {
        return identityMetaInfo;
      }
      const treesMeta = createMetaInfo();
      await snapStorage.setItem(
        SnapMerkleTreeLocalStorage.storageKeyMeta,
        JSON.stringify([...metaInfo, ...treesMeta]),
      );
    }
    const treesMeta = createMetaInfo();
    await snapStorage.setItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
      JSON.stringify(treesMeta),
    );
    return treesMeta;
  }

  async getIdentityMerkleTreesInfo(
    identifier: string,
  ): Promise<IdentityMerkleTreeMetaInformation[]> {
    const meta = await snapStorage.getItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
    );
    if (meta) {
      const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
      return metaInfo.filter((m) => m.identifier === identifier);
    }
    throw new Error(`Merkle tree meta not found for identifier ${identifier}`);
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async getMerkleTreeByIdentifierAndType(
    identifier: string,
    mtType: MerkleTreeType,
  ): Promise<Merkletree> {
    const meta = await snapStorage.getItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
    );
    const err = new Error(
      `Merkle tree not found for identifier ${identifier} and type ${mtType}`,
    );
    if (!meta) {
      throw err;
    }

    const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
    const resultMeta = metaInfo.filter(
      (m) => m.identifier === identifier && m.type === mtType,
    )[0];
    if (!resultMeta) {
      throw err;
    }
    return new Merkletree(
      new SnapMerkletreeStorageDB(str2Bytes(resultMeta.treeId)),
      true,
      this._mtDepth,
    );
  }

  async addToMerkleTree(
    identifier: string,
    mtType: MerkleTreeType,
    hindex: bigint,
    hvalue: bigint,
  ): Promise<void> {
    const meta = await snapStorage.getItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
    );
    if (!meta) {
      throw new Error(
        `Merkle tree meta not found for identifier ${identifier}`,
      );
    }

    const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
    const resultMeta = metaInfo.filter(
      (m) => m.identifier === identifier && m.type === mtType,
    )[0];
    if (!resultMeta) {
      throw new Error(
        `Merkle tree not found for identifier ${identifier} and type ${mtType}`,
      );
    }

    const tree = new Merkletree(
      new SnapMerkletreeStorageDB(str2Bytes(resultMeta.treeId)),
      true,
      this._mtDepth,
    );

    await tree.add(hindex, hvalue);
  }

  async bindMerkleTreeToNewIdentifier(
    oldIdentifier: string,
    newIdentifier: string,
  ): Promise<void> {
    const meta = await snapStorage.getItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
    );
    if (!meta) {
      throw new Error(
        `Merkle tree meta not found for identifier ${oldIdentifier}`,
      );
    }
    const metaInfo: IdentityMerkleTreeMetaInformation[] = JSON.parse(meta);
    const treesMeta = metaInfo
      .filter((m) => m.identifier === oldIdentifier)
      .map((m) => ({ ...m, identifier: newIdentifier }));
    if (treesMeta.length === 0) {
      throw new Error(
        `Merkle tree meta not found for identifier ${oldIdentifier}`,
      );
    }

    const newMetaInfo = [
      ...metaInfo.filter((m) => m.identifier !== oldIdentifier),
      ...treesMeta,
    ];
    await snapStorage.setItem(
      SnapMerkleTreeLocalStorage.storageKeyMeta,
      JSON.stringify(newMetaInfo),
    );
  }
}
