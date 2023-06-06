# **WIP**: Integration of Polygin ID to metamask snap.

1. `yarn install`
2. Place actual circuits to site/public folder. You can download the latest files from https://iden3-circuits-bucket.s3.eu-west-1.amazonaws.com/latest.zip
3. `yarn start`

you can build snap separately with `cd packages/snap && yarn build`

# @metamask/template-snap-monorepo

This repository demonstrates how to develop a snap with TypeScript. For detailed instructions, see [the MetaMask documentation](https://docs.metamask.io/guide/snaps.html#serving-a-snap-to-your-local-environment).

MetaMask Snaps is a system that allows anyone to safely expand the capabilities of MetaMask. A _snap_ is a program that we run in an isolated environment that can customize the wallet experience.

## Snaps is pre-release software

To interact with (your) Snaps, you will need to install [MetaMask Flask](https://metamask.io/flask/), a canary distribution for developers that provides access to upcoming features.

## Getting Started

Clone the template-snap repository [using this template](https://github.com/MetaMask/template-snap-monorepo/generate) and setup the development environment:

```shell
yarn install && yarn start
```
## Notes

- Babel is used for transpiling TypeScript to JavaScript, so when building with the CLI,
  `transpilationMode` must be set to `localOnly` (default) or `localAndDeps`.
