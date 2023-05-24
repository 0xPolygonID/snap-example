// eslint-disable-next-line import/no-unassigned-import
import './polyfill-intl';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';

import {
  // AuthHandler,
  BasicMessage,
  W3CCredential,
  // FetchHandler,
  // W3CCredential,
} from '@0xpolygonid/js-sdk';
// import { DID } from '@iden3/js-iden3-core';

import { ExtensionService } from './services/Extension.service';
import { IdentityServices } from './services/Identity.services';
import { confirmRpcDialog } from './rpc/methods';
import { authMethod, proofMethod, receiveMethod } from './services';

const byteEncoder = new TextEncoder();

const getParams = (data: unknown) => {
  return data;
};
const RequestType = {
  Auth: 'auth',
  CredentialOffer: 'credentialOffer',
  Proof: 'proof',
};
const detectRequest = (unpackedMessage: BasicMessage) => {
  const { type, body } = unpackedMessage;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { scope = [] } = body;

  if (type.includes('request') && scope.length) {
    return RequestType.Proof;
  } else if (type.includes('offer')) {
    return RequestType.CredentialOffer;
  } else if (type.includes('request')) {
    return RequestType.Auth;
  }
  return RequestType.Auth;
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('Request:', JSON.stringify(request, null, 4));
  console.log('Origin:', origin);

  console.log(request);
  await ExtensionService.init();
  switch (request.method) {
    case 'handleRequest': {
      console.log(window);
      console.log(request.params);
      // await ExtensionService.init();
      console.log('finish await ExtensionService.init();');

      const { packageMgr, credWallet } =
        ExtensionService.getExtensionServiceInstance();

      const seedPhrase: Uint8Array = new TextEncoder().encode(
        'seedseedseedseedseedseedseedxxxx',
      );
      const identity = await IdentityServices.createIdentity(seedPhrase);
      console.log('await IdentityServices.createIdentity();');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const requestBase64 = getParams(request.params)?.request;
      const msgBytes = byteEncoder.encode(atob(requestBase64));
      const { unpackedMessage } = await packageMgr.unpack(msgBytes);
      const typeRequest = detectRequest(unpackedMessage);
      console.log(typeRequest);
      let dialogContent = null;
      switch (typeRequest) {
        case RequestType.Auth: {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const message = unpackedMessage.body.reason;
          dialogContent = panel([
            heading('Authorization'),
            divider(),
            text(`Reason: ${message}`),
            text(`From: ${unpackedMessage.from}`),
          ]);
          const res = await confirmRpcDialog(dialogContent);
          if (res) {
            await authMethod(identity, requestBase64);
          }
          break;
        }

        case RequestType.CredentialOffer: {
          dialogContent = [
            heading('Credentials'),
            divider(),
            text(`From: ${unpackedMessage.from}`),
          ];
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          const credsUI = unpackedMessage.body.credentials.reduce(
            (acc: any, cred: any) => {
              return acc.concat([
                divider(),
                text(cred.description),
                text(cred.id),
              ]);
            },
            [],
          );
          dialogContent = panel([...dialogContent, ...credsUI]);
          const res = await confirmRpcDialog(dialogContent);
          if (res) {
            await receiveMethod(identity, requestBase64);
          }
          console.log(await credWallet.list());
          // eslint-disable-next-line no-debugger
          debugger;
          break;
        }

        case RequestType.Proof: {
          // eslint-disable-next-line no-debugger
          debugger;
          await proofMethod(identity, requestBase64);
          break;
        }
        default:
          console.log(`not found request: ${typeRequest}`);
          break;
      }
      // await authMethod(identity, requestBase64);
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'alert', // Type can be 'Alert', 'Confirmation' or 'Prompt'
          content: panel([
            heading(`${typeRequest}`),
            text('Current request finished'),
            divider(),
          ]),
        },
      });
    }

    case 'get_list_creds': {
      const { credWallet } = ExtensionService.getExtensionServiceInstance();
      let credentials: W3CCredential[] = [];

      try {
        credentials = await credWallet.list();
      } catch (e) {
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
      return await snap.request({
        method: 'snap_manageState',
        params: { operation: 'clear' },
      });
    }

    default: {
      console.error('Method not found');
      throw new Error('Method not found');
    }
  }
};
