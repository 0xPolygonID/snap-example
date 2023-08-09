/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-unassigned-import
import './polyfill-intl';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, text, panel, heading, copyable } from '@metamask/snaps-ui';
import {
  W3CCredential,
  base64ToBytes,
  core,
  PROTOCOL_CONSTANTS,
  hexToBytes,
  FetchHandler,
  byteDecoder,
  JWSPackerParams,
} from '@0xpolygonid/js-sdk';

import { Wallet } from 'ethers';
import { ES256KSigner } from 'did-jwt';
import { ExtensionService } from './services/Extension.service';
import { confirmRpcDialog } from './rpc/methods';

declare let snap: any;

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}: {
  origin: string;
  request: any;
}): Promise<unknown> => {
  console.log('Request:', JSON.stringify(request, null, 4));
  console.log('Origin:', origin);
  console.log(request);

  await ExtensionService.init();

  const privKey = await snap.request({
    method: 'snap_getEntropy',
    params: { version: 1 },
  });

  const ethWallet = new Wallet(privKey);

  const { dataStorage } = ExtensionService.getExtensionServiceInstance();

  const did = core.DID.parse(`did:pkh:poly:${ethWallet.address}`);
  const didStr = did.string();

  if (!(await dataStorage.identity.getIdentity(didStr))) {
    await dataStorage.identity.saveIdentity({
      did: didStr,
    });
  }

  const jwsPackerOpts: JWSPackerParams = {
    alg: 'ES256K-R',
    signer: (_: any, msg: any) => {
      return async () => {
        const signature = (await ES256KSigner(
          hexToBytes(privKey),
          true,
        )(msg)) as string;
        return signature;
      };
    },
  };

  console.log(didStr);

  const getMsgBytes = async (iden3Msg: string): Promise<Uint8Array> => {
    const messageComm: string = (request.params as any).msg;
    let msgBts: Uint8Array
    if (messageComm.includes('?i_m=')) {
      msgBts = base64ToBytes(messageComm.split('?i_m=')[1]);
    } else {
      const url = decodeURIComponent(messageComm.split('?request_uri=')[1]);
      msgBts = await fetch(url)
        .then(
          (res) => res.arrayBuffer()
        ).then(
          (res) => new Uint8Array(res)
        );
    };
    return msgBts
  }

  switch (request.method) {
    case 'get_list_creds': {
      const { credWallet } = ExtensionService.getExtensionServiceInstance();
      let credentials: W3CCredential[] = [];

      try {
        credentials = await credWallet.list();
      } catch (e) {
        console.error(e);
        /* empty */
      }

      const credsUI = credentials.reduce((acc: any, cred: any) => {
        return acc.concat([divider(), text('cred'), text(cred.id)]);
      }, []);
      const dialogContent = panel([
        ...[heading('Credentials'), divider()],
        ...credsUI,
      ]);
      await confirmRpcDialog(dialogContent, 'alert');
      return credentials;
    }

    case 'get_identity': {
      await snap.request({
        method: 'snap_dialog',
        params: {
          type: 'alert',
          content: panel([heading('Your DID'), copyable(didStr)]),
        },
      });

      break;
    }

    case 'get_store': {
      return await snap.request({
        method: 'snap_manageState',
        params: { operation: 'get' },
      });
    }

    case 'clear_store': {
      await snap.request({
        method: 'snap_manageState',
        params: { operation: 'clear' },
      });
      break;
    }

    case 'handleRequest': {
      try {
        const msgBts = await getMsgBytes(request.params.msg);

        const messageObjStr = JSON.stringify(JSON.parse(byteDecoder.decode(msgBts)), null, 2);

        const result = await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              heading('Authorization is requested'),
              copyable(messageObjStr),
            ]),
          },
        });

        if (!result) {
          throw new Error('User rejected request');
        }

        const { authHandler } = ExtensionService.getExtensionServiceInstance();
        console.log(didStr);
        const { token, authRequest } =
          await authHandler.handleAuthorizationRequest(did, msgBts, {
            mediaType: PROTOCOL_CONSTANTS.MediaType.SignedMessage,
            packerOptions: jwsPackerOpts,
          });
        console.log(token);

        await fetch(`${authRequest?.body?.callbackUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: token,
        });
      } catch (e) {
        console.error(e);
        throw e;
        /* empty */
      }
      break;
    }

    case 'fetchCredential': {
      try {
        const { packageMgr, credWallet } =
          ExtensionService.getExtensionServiceInstance();
        console.log('fetching credentials...');
        const fetchHandler = new FetchHandler(packageMgr);
        const msgBts = await getMsgBytes(request.params.msg);
        const credentials = await fetchHandler.handleCredentialOffer(msgBts, {
          mediaType: PROTOCOL_CONSTANTS.MediaType.SignedMessage,
          packerOptions: jwsPackerOpts,
        });
        console.log('finish fetching credentials', credentials);

        await credWallet.saveAll(credentials);
      } catch (e) {
        console.error(e);
        throw e;
      }
      break;
    }

    default: {
      console.warn('no action');
      break;
    }
  }

  return Promise.resolve();
};
