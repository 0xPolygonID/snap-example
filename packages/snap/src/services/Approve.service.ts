import { DID } from '@iden3/js-iden3-core';
import {
  AuthHandler,
  byteEncoder,
  FetchHandler,
} from '@0xpolygonid/js-sdk';
import { ExtensionService } from './Extension.service';

export const authMethod = async (did: DID, urlParam: string) => {
  const { packageMgr, proofService, credWallet } =
    ExtensionService.getExtensionServiceInstance();

  console.log('preparing proof...');
  const authHandler = new AuthHandler(packageMgr, proofService, credWallet);

  const msgBytes = byteEncoder.encode(atob(urlParam));
  const authRes = await authHandler.handleAuthorizationRequestForGenesisDID(
    did,
    msgBytes,
  );
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const url = authRes.authRequest.body.callbackUrl;
  console.log('finished preparing proof', url);

  return fetch(`${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: authRes.token,
  }).then((response) => {
    if (!response.ok) {
      return Promise.reject(response);
    }
  });
};

export const receiveMethod = async (
  did: DID,
  urlParam: string,
) => {
  const { packageMgr, credWallet } =
    ExtensionService.getExtensionServiceInstance();
  console.log('fetching credentials...');
  const fetchHandler = new FetchHandler(packageMgr);

  const msgBytes = byteEncoder.encode(atob(urlParam));
  const credentials = await fetchHandler.handleCredentialOffer(
    did,
    msgBytes,
  );
  console.log('finish fetching credentials', credentials);

  await credWallet.saveAll(credentials);
  return 'SAVED';
};

export const proofMethod = async (did: DID, urlParam: string) => {
  const { packageMgr, proofService, credWallet } =
    ExtensionService.getExtensionServiceInstance();
  console.log('generation proof...');
  const authHandler = new AuthHandler(packageMgr, proofService, credWallet);
  const msgBytes = byteEncoder.encode(atob(urlParam));
  const authRequest = await authHandler.parseAuthorizationRequest(msgBytes);

  const { body } = authRequest;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { scope = [] } = body;

  if (scope.length > 1) {
    throw new Error('not support 2 scope');
  }
  const [zkpReq] = scope;
  const [firstCredential] = await credWallet.findByQuery(zkpReq.query);
  const response = await authHandler.generateAuthorizationResponse(
    did,
    0,
    authRequest,
    [
      {
        credential: firstCredential,
        req: zkpReq,
        credentialSubjectProfileNonce: 0,
      },
    ],
  );

  const url = authRequest.body?.callbackUrl;
  console.log('finish generation proof for:', url);

  return await fetch(`${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: response.token,
  }).then((response) => {
    if (!response.ok) {
      return Promise.reject(response);
    }
  });
};
