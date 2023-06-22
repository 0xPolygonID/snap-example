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

  const did = core.DID.parse(`did:pkh:poly:${ethWallet.address}`);
  const didStr = did.string();

  const jwsPackerOpts = {
    mediaType: PROTOCOL_CONSTANTS.MediaType.SignedMessage,
    did: didStr,
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
        const message = (request.params as any).msg;
        const result = await snap.request({
          method: 'snap_dialog',
          params: {
            type: 'confirmation',
            content: panel([
              heading('Do you want to sign this message? '),
              copyable(message),
            ]),
          },
        });

        if (!result) {
          throw new Error('User rejected request');
        }

        const msgBts = base64ToBytes(message);
        const { authHandler } = ExtensionService.getExtensionServiceInstance();
        console.log(didStr);
        const { token, authRequest } =
          await authHandler.handleAuthorizationRequestForGenesisDID({
            did,
            request: msgBts,
            packer: jwsPackerOpts,
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
        const { msg } = request.params as any;
        const msgBytes = base64ToBytes(msg);

        const credentials = await fetchHandler.handleCredentialOffer({
          did,
          offer: msgBytes,
          packer: jwsPackerOpts,
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
