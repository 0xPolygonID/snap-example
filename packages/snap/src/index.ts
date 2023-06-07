// eslint-disable-next-line import/no-unassigned-import
import './polyfill-intl';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { divider, text, panel, heading, copyable } from '@metamask/snaps-ui';

import {
  BasicMessage,
  W3CCredential,
  base64ToBytes,
  bytesToBase64,
  core,
  PROTOCOL_CONSTANTS,
  hexToBytes,
  bytesToBase64url,
} from '@0xpolygonid/js-sdk';

import { Wallet, sha256 } from 'ethers';
import { ExtensionService } from './services/Extension.service';
import { IdentityServices } from './services/Identity.services';
import { alertRpcDialog, confirmRpcDialog } from './rpc/methods';
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
  await ExtensionService.init();
  console.log(request);

  switch (request.method) {
    case 'handleRequest': {
      console.log('finish initialization');

      const { packageMgr, credWallet, dataStorage } =
        ExtensionService.getExtensionServiceInstance();

      const identities = await dataStorage.identity.getAllIdentities();
      const seedPhrase: Uint8Array = new TextEncoder().encode(
        'seedseedseedseedseedseedseedxxxx',
      );

      // identity initialization
      let did: DID;
      if (identities?.length) {
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
        } else {
          return;
        }
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
              return await alertRpcDialog(
                panel([heading('Error Authorization')]),
              );
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
              return await alertRpcDialog(
                panel([heading('Error Credential offer')]),
              );
            }
          }
          break;
        }

        case RequestType.Proof: {
          dialogContent = [heading('Generate proof?')];
          dialogContent = panel([...dialogContent]);
          const res = await confirmRpcDialog(dialogContent);
          if (res) {
            try {
              await proofMethod(did, requestBase64);
            } catch (e) {
              console.log(e);
              return await alertRpcDialog(panel([heading('Error Proof')]));
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

    case 'signMessage': {
      try {
        // const instance = ExtensionService.getExtensionServiceInstance();
        const privKey = await snap.request({
          method: 'snap_getEntropy',
          params: { version: 1 },
        });

        const ethWallet = new Wallet(privKey);
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
        const did = core.DID.parse(
          `did:pkh:poly:${ethWallet.address}#Recovery2020`,
        );
        console.log(did.string());
        const { token, authResponse, authRequest } =
          await authHandler.handleAuthorizationRequestForGenesisDID(
            did,
            msgBts,
            {
              mediaType: PROTOCOL_CONSTANTS.MediaType.SignedMessage,
              did: did.string(),
              kid: did.string(),
              alg: 'ES256K-R',

              signer: (_: any, msg: any) => {
                return async () => {
                  const signature: string = ethWallet.signingKey.sign(
                    sha256(msg),
                  ).serialized;
                  const bytes = hexToBytes(signature);
                  return bytesToBase64url(bytes);
                };
              },
            },
          );

        console.log(token);
        console.log(authRequest);
        console.log(authResponse);

        await fetch(`${authRequest?.body?.callbackUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: token,
        }).then((response) => {
          console.log(response);

          if (!response.ok) {
            return Promise.reject(response);
          }
          return response;
        });
        // const resp = await fetch(authRequest!.body!.callbackUrl, {
        //   headers: {
        //     'Content-Type': 'application/x-www-form-urlencoded',
        //   },
        //   body: token,
        //   method: 'POST',
        // });
        // console.log('final response');

        // console.log(await resp.text());
      } catch (e) {
        console.error(e);
        throw e;
        /* empty */
      }
    }

    default: {
      console.error('Method not found');
      throw new Error('Method not found');
    }
  }
};
