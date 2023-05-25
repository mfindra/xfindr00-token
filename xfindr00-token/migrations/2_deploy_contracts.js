const xfindr00token = artifacts.require("xfindr00token");
const IdentityVerification = artifacts.require("IdentityVerification");

// The initial parameters
const cap = 100000000; // the maximum token supply that could ever be minted
const reward = 50; // the block reward
const tmax = 10000; // the maximum tokens that can be minted per day

module.exports = function (deployer) {

  mint_admins=["0x94F475353Cd30DA0A9c44304E57C3fCCD0Eb1092", "0xaeeB7039B8966E49ea41b823dDb2e5a61eB6fa05"];
  verified_users=["0x94F475353Cd30DA0A9c44304E57C3fCCD0Eb1092", "0xaeeB7039B8966E49ea41b823dDb2e5a61eB6fa05"];
  idp_providers=["0x94F475353Cd30DA0A9c44304E57C3fCCD0Eb1092"];
  idp_admins=[ "0xaeeB7039B8966E49ea41b823dDb2e5a61eB6fa05"];

  
  
    deployer.deploy(IdentityVerification, idp_providers, idp_admins, verified_users)
    .then(identityContract => {
      return deployer.deploy(xfindr00token, cap, reward, tmax, identityContract.address, mint_admins)
    });
};