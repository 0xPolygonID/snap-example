import { DID } from '@iden3/js-iden3-core';
import {
  AuthHandler,
  byteEncoder,
  FetchHandler,
} from '@0xpolygonid/js-sdk';
import { ExtensionService } from './Extension.service';

export const authMethod = async (identity: { did: DID }, urlParam: string) => {
  const { packageMgr, proofService, credWallet } =
    ExtensionService.getExtensionServiceInstance();

  // eslint-disable-next-line no-debugger
  debugger;
  const authHandler = new AuthHandler(packageMgr, proofService, credWallet);

  const msgBytes = byteEncoder.encode(atob(urlParam));
  // const _did = DID.parse(LocalStorageServices.getActiveAccountDid());
  const authRes = await authHandler.handleAuthorizationRequestForGenesisDID(
    identity.did,
    msgBytes,
  );
  // eslint-disable-next-line no-debugger
  debugger;
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const url = authRes.authRequest.body.callbackUrl;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const body = new FormData();
  return await fetch(`${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    // body: new FormData(authRes.token),
    body: authRes.token,
  });
};

export const receiveMethod = async (
  identity: { did: DID },
  urlParam: string,
) => {
  const { packageMgr, credWallet } =
    ExtensionService.getExtensionServiceInstance();
  const fetchHandler = new FetchHandler(packageMgr);

  const msgBytes = byteEncoder.encode(atob(urlParam));
  const credentials = await fetchHandler.handleCredentialOffer(
    identity.did,
    msgBytes,
  );
  console.log(credentials);
  // eslint-disable-next-line no-debugger
  debugger;
  await credWallet.saveAll(credentials);
  return 'SAVED';
};

export const proofMethod = async (identity: { did: DID }, urlParam: string) => {
  const { packageMgr, proofService, credWallet } =
    ExtensionService.getExtensionServiceInstance();
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
  // eslint-disable-next-line no-debugger
  debugger;
  const response = await authHandler.generateAuthorizationResponse(
    identity.did,
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
  // eslint-disable-next-line no-debugger
  debugger;
  const url = authRequest.body?.callbackUrl;
  return await fetch(`${url}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: response.token,
  });
};
