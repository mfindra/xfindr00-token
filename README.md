# xfindr00 token smart contract with DAPP
Updated ERC20 token.

## Functionality

The main features of the project include:

### Account Information

Get user information, including address, verification status, IDP admin status, identity provider status, user expiry date, and minting admin status.
Display the token balance of the user.
Token Transfer:

### Transfer tokens to another address

### Minting Tokens 

Mint tokens (only available to users with the minting admin role).

### Voting

Propose a vote for increasing the TMAX value.
Cast a vote for increasing the TMAX value.
Propose a vote for adding a user.
Cast a vote for adding a user.

## Requirements 

1. NodeJS version 19<,
2. npm 9<,
3. Ganache CLI v6.12.2,
4. Metamask extension,
5. Solidity 0.8.18.

## Instalation and deployment

Run `npm i` in both folders (xfindr-token, xfindr00-token-web)

Install and start ganache with: 
```
npx ganache-cli -m "nerve vapor evolve judge number weekend drop begin fatigue jaguar program fence"
```

Compile contracts running `npx hardhat compile`. Two json ABI are created in `xfindr00-token/artifacts/contracts/IdentityVerification.sol` and `xfindr00-token/artifacts/contracts/xfindr00token.sol`.

Copy this two ABI definitions into folder `xfindr00-token-web/src/contracts/`.

Deploy contracts into running ganache blockchain `truffle migrate --network development --reset`. 

Returned are two addresses of two contracts. Replace variables `tokenContractAddress` and `identityContractAddress` with corresponding values in file `App.js`.

Save, open browser (usually localhost:3000). Import first 3 address returned by ganache into your metamask account and add local blockchain (usually localhost:8545).

Connect to blockchain and everything should be ready. 

Accounts used (which are deployed in contract so we don't have to manually): 

IDP Admins: <br>
Verified users: <br>
0x94F475353Cd30DA0A9c44304E57C3fCCD0Eb1092 <br>
0xaeeB7039B8966E49ea41b823dDb2e5a61eB6fa05


New user (no roles):
0xe53b801250F7b2D3Fd5B117Fd5f02aAB0d4Ec85c

## Testing

The tests are executed from folder `xfindr00-token` running `npx hardhat test`. Test case details are in documentation. 


## Video presentation

Link for video presentation hosted on VUT google drive.
https://drive.google.com/file/d/1Dage7r1Diya1j3ReqJVeyaW_Qcl-q4-9/view?usp=share_link

