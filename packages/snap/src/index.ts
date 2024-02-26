/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unused-vars */
// eslint-disable-next-line import/no-unassigned-import
import './polyfill-intl';
import type { W3CCredential, JWSPackerParams } from '@0xpolygonid/js-sdk';
import {
  base64ToBytes,
  core,
  PROTOCOL_CONSTANTS,
  hexToBytes,
  FetchHandler,
  byteDecoder,
} from '@0xpolygonid/js-sdk';
import type { OnRpcRequestHandler } from '@metamask/snaps-sdk';
import {
  panel,
  divider,
  text,
  heading,
  copyable,
  SnapError,
} from '@metamask/snaps-sdk';
import { ES256KSigner } from 'did-jwt';
import { Wallet } from 'ethers';

import { confirmRpcDialog } from './rpc/methods';
import { ExtensionService } from './services/Extension.service';

declare let snap: any;

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}): Promise<any> => {
  console.log('Request:', JSON.stringify(request, null, 4));
  console.log('Origin:', origin);
  console.log(request);
  console.log('before init');

  await ExtensionService.init();
  console.log('after init');

  const privKey = await snap.request({
    method: 'snap_getEntropy',
    params: { version: 1 },
  });

  console.log('Private key: ', privKey);
  const ethWallet = new Wallet(privKey);

  const { dataStorage } = ExtensionService.getExtensionServiceInstance();

  const did = core.DID.parse(`did:pkh:poly:${ethWallet.address}`);
  const didStr = did.string();
  console.log('did', didStr);

  if (!(await dataStorage.identity.getIdentity(didStr))) {
    console.log('saving identity');
    await dataStorage.identity.saveIdentity({
      did: didStr,
    });
  }

  const jwsPackerOpts: JWSPackerParams = {
    alg: 'ES256K-R',
    // eslint-disable-next-line id-denylist
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
    const messageComm: string = request!.params!.msg;
    let msgBts: Uint8Array;
    if (messageComm.includes('?i_m=')) {
      msgBts = base64ToBytes(messageComm!.split('?i_m=')[1]);
    } else {
      const url = decodeURIComponent(messageComm!.split('?request_uri=')[1]);
      msgBts = await fetch(url)
        .then(async (res) => res.arrayBuffer())
        .then((res) => new Uint8Array(res));
    }
    return msgBts;
  };

  switch (request.method) {
    case 'get_list_creds': {
      const { credWallet } = ExtensionService.getExtensionServiceInstance();
      let credentials: W3CCredential[] = [];

      try {
        credentials = await credWallet.list();
      } catch (error) {
        console.error(error);
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
        const msgBts = await getMsgBytes(request!.params!.msg);
        const protocolMessage = JSON.parse(byteDecoder.decode(msgBts));

        switch (protocolMessage.type) {
          case PROTOCOL_CONSTANTS.PROTOCOL_MESSAGE_TYPE
            .AUTHORIZATION_REQUEST_MESSAGE_TYPE: {
            const messageObjStr = JSON.stringify(protocolMessage, null, 2);

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
              throw new SnapError('User rejected request');
            }

            const { authHandler } =
              ExtensionService.getExtensionServiceInstance();
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
            return 'auth ok';
          }
          case PROTOCOL_CONSTANTS.PROTOCOL_MESSAGE_TYPE
            .CREDENTIAL_OFFER_MESSAGE_TYPE: {
            const { packageMgr, credWallet } =
              ExtensionService.getExtensionServiceInstance();
            console.log('fetching credentials...');
            const fetchHandler = new FetchHandler(packageMgr);
            const credentials = await fetchHandler.handleCredentialOffer(
              msgBts,
              {
                mediaType: PROTOCOL_CONSTANTS.MediaType.SignedMessage,
                packerOptions: jwsPackerOpts,
              },
            );
            console.log('finish fetching credentials', credentials);

            await credWallet.saveAll(credentials);

            return 'fetching credentials ok';
          }
          default:
            return 'protocol message type not supported';
        }
      } catch (error: any) {
        console.error(error);
        throw new SnapError(error.message);
      }
    }
    default: {
      return 'no message handle';
    }
  }

  return 'message handle ok';
};
