// eslint-disable-next-line import/no-unassigned-import
import './polyfill-intl';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';

import {
  BasicMessage,
  W3CCredential,
} from '@0xpolygonid/js-sdk';

import { ExtensionService } from './services/Extension.service';
import { IdentityServices } from './services/Identity.services';
import { alertRpcDialog, confirmRpcDialog } from './rpc/methods';
import { authMethod, proofMethod, receiveMethod } from './services';
import { DID } from '@iden3/js-iden3-core';

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
  switch (request.method) {
    case 'handleRequest': {
      await ExtensionService.init();

      console.log('finish initialization');

      const { packageMgr, credWallet, dataStorage } =
        ExtensionService.getExtensionServiceInstance();

      const identities = await dataStorage.identity.getAllIdentities();
      const seedPhrase: Uint8Array = new TextEncoder().encode(
        'seedseedseedseedseedseedseedxxxx',
      );

      // identity initialization
      let did: DID;
      if(identities?.length) {
        const [firstIdentity] = identities;
        did = DID.parse(firstIdentity.identifier);
        console.log('DID read from storage');

      } else {
        const dialogContent = panel([
          heading('Identity creation'),
          divider(),
          text(`You have not identity`),
          text(`Would you like to create?`),
        ]);
        const res = await confirmRpcDialog(dialogContent);
        if (res) {
          const identity = await IdentityServices.createIdentity(seedPhrase);
          did = identity.did;
        } else return ;
      }


      console.log('identity created');
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const requestBase64 = getParams(request.params)?.request;
      const msgBytes = byteEncoder.encode(atob(requestBase64));
      const { unpackedMessage } = await packageMgr.unpack(msgBytes);
      const typeRequest = detectRequest(unpackedMessage);
      console.log(typeRequest);
      let dialogContent = null;
      // handle request {Auth, Load cred, Proof}
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
            try {
              await authMethod(did, requestBase64);
            } catch (e) {
              console.log(e);
              return await alertRpcDialog(panel([
                heading('Error Authorization'),
              ]));
            }
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
            try {
              await receiveMethod(did, requestBase64);
            } catch (e) {
              console.log(e);
              return await alertRpcDialog(panel([
                heading('Error Credential offer'),
              ]));
            }
          }
          break;
        }

        case RequestType.Proof: {
          dialogContent = [
            heading('Generate proof?'),
          ];
          dialogContent = panel([...dialogContent]);
          const res = await confirmRpcDialog(dialogContent);
          if(res) {
            try {
              await proofMethod(did, requestBase64);
            } catch (e) {
              console.log(e);
              return await alertRpcDialog(panel([
                heading('Error Proof'),
              ]));
            }
          }
          break;
        }
        default:
          console.log(`not found request: ${typeRequest}`);
          break;
      }
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
