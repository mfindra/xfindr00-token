import React, { useEffect, useState } from "react";
import "./App.css";
import xfindr00tokenABI from "./contracts/xfindr00token.json";
import IdentityVerificationABI from "./contracts/IdentityVerification.json";

const Web3 = require("web3");

function App() {
  const [balance, setBalance] = useState(null);
  const [address, setAddress] = useState("");
  const [toAddress, setToAddress] = useState("");
  const [toAddressMint, setToAddressMint] = useState("");
  const [amount, setAmount] = useState(0);
  const [amountMint, setAmountMint] = useState(0);
  const [amountMintedByAdmin, setAmountMintedByAdmin] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tokenContract, setTokenContract] = useState(null);
  const [identityContract, setIdentityContract] = useState(null);
  const [isIDPAdmin, setIsIDPAdmin] = useState(false);
  const [isIdentityProvider, setIsIdentityProvider] = useState(false);
  const [isMintingAdmin, setIsMintingAdmin] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [userInformation, setUserInformation] = useState({});
  const [userExpiracy, setUserExpiracy] = useState({});
  const [addUserAddress, setAddUserAddress] = useState("");
  const [addUserExpiryDate, setAddUserExpiryDate] = useState("");
  const [addUserExpiryTimestamp, setAddUserExpiryTimestamp] = useState(null);
  const [voteUserAddress, setVoteUserAddress] = useState("");
  const [voteUserSupport, setVoteUserSupport] = useState(false);

  // For the propose vote form
  const [proposeVoteUser, setProposeVoteUser] = useState("");
  const [proposeVoteTMAX, setproposeVoteTMAX] = useState("");

  // For the cast vote form
  const [castVoteUser, setCastVoteUser] = useState("");
  const [voteSupport, setVoteSupport] = useState("");

  const [renewAddress, setRenewAddress] = useState("");
  const [revokeAddress, setRevokeAddress] = useState("");
  const [newExpiryTimestamp, setNewExpiryTimestamp] = useState(null);
  const [newExpiryDate, setNewExpiryDate] = useState("");


  const [idpAdmins, setIdpAdmins] = useState([]);
  const [idpProviders, setIdpProviders] = useState([]);

  const [userToAdd, setUserToAdd] = useState("");
  const [userToRevoke, setUserToRevoke] = useState("");

  const IDP_ADMIN_ROLE = Web3.utils.keccak256("IDP_ADMIN_ROLE");
  const IDENTITY_PROVIDER_ROLE = Web3.utils.keccak256("IDENTITY_PROVIDER_ROLE");
  const MINTING_ADMIN_ROLE = Web3.utils.keccak256("MINTING_ADMIN_ROLE");


  const handleInputChange = (event) => {
    setAddress(event.target.value);
  };

  const handleToAddressChange = (event) => {
    setToAddress(event.target.value);
  };

  const handleToAddressMintChange = (event) => {
    setToAddressMint(event.target.value);
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
  };

  const handleAmountMintChange = (event) => {
    setAmountMint(event.target.value);
  };


  const fetchBalance = async () => {
    const balance = await tokenContract.methods.balanceOf(address).call();
    setBalance(balance);
  };

  const fetchInfo = async () => {

    // Fetch balance
    const balance = await tokenContract.methods.balanceOf(address).call();
    setBalance(balance);
    // Fetch user information
    const userInfo = await identityContract.methods.getUser(address).call();
    setUserInformation(userInfo);
    setUserExpiracy(new Date(userInfo[1] * 1000).toLocaleString());

    // Check roles
    const adminRole = await identityContract.methods.hasRole(IDP_ADMIN_ROLE, address).call();
    setIsIDPAdmin(adminRole);

    const providerRole = await identityContract.methods.hasRole(IDENTITY_PROVIDER_ROLE, address).call();
    setIsIdentityProvider(providerRole);

    const mintingAdmin = await tokenContract.methods.hasRole(MINTING_ADMIN_ROLE, address).call();
    setIsMintingAdmin(mintingAdmin);

    const isVerified = await identityContract.methods.isUser(address).call();
    setIsVerified(isVerified);

    if (mintingAdmin) {
      const minted = await tokenContract.methods.getMintedTokensByAdmin(address).call();
      setAmountMintedByAdmin(minted);
    }

    // Fetch IDP Admins
    const adminCount = await identityContract.methods.idpAdminCount().call();
    let admins = [];
    for (let i = 0; i <= adminCount; i++) {
      const adminAddress = await identityContract.methods.idpAdminAddresses(i).call();
      admins.push(adminAddress);
    }
    setIdpAdmins(admins);

    // Fetch identity provider addresses
    const idpProviderCount = await identityContract.methods.idpProviderCount().call();
    let idpProviderAddresses = [];
    for (let i = 0; i < idpProviderCount; i++) {
      const idpProviderAddress = await identityContract.methods.idpProviderAddresses(i).call();
      idpProviderAddresses.push(idpProviderAddress);
    }
    setIdpProviders(idpProviderAddresses);


  };

  const transfer = async (event) => {
    event.preventDefault();
    await tokenContract.methods.transfer(toAddress, amount).send({ from: address });
    fetchInfo();
  };

  const mint = async (event) => {
    event.preventDefault();
    await tokenContract.methods.mint(toAddressMint, amountMint).send({ from: toAddressMint });
    fetchInfo();
  };

  const handleAddUserAddressChange = (event) => {
    setAddUserAddress(event.target.value);
  };

  const handleRenewAddressChange = (event) => {
    setRenewAddress(event.target.value);
  };

  const handleRevokeAddressChange = (event) => {
    setRevokeAddress(event.target.value);
  };

  const handleNewExpiryTimestampChange = (event) => {

    setNewExpiryDate(event.target.value);

    const date = new Date(event.target.value);

    const timestamp = (Math.floor(date.getTime() / 1000) - Math.floor(Date.now() / 1000));

    setNewExpiryTimestamp(timestamp);
  };

  const handleAddUserExpiryChange = (event) => {
    setAddUserExpiryDate(event.target.value);

    const date = new Date(event.target.value);

    const timestamp = (Math.floor(date.getTime() / 1000) - Math.floor(Date.now() / 1000));

    setAddUserExpiryTimestamp(timestamp);
  };

  const handleVoteUserAddressChange = (event) => {
    setVoteUserAddress(event.target.value);
  };

  const handleVoteUserSupportChange = (event) => {
    setVoteUserSupport(event.target.checked);
  };

  const proposeAddUser = async (event) => {
    event.preventDefault();
    await identityContract.methods.proposeAddUser(addUserAddress, addUserExpiryTimestamp).send({ from: address });
    fetchInfo();
  };

  const castVoteAdd = async (event) => {
    event.preventDefault();
    await identityContract.methods.castVote(voteUserAddress, voteUserSupport).send({ from: address });
    fetchInfo();
  };

  const proposeVote = async (event) => {
    event.preventDefault();
    await tokenContract.methods.proposeVote(proposeVoteUser, Web3.utils.toWei(proposeVoteTMAX)).send({ from: address });
    fetchInfo();
  };

  const castVote = async (event) => {
    event.preventDefault();
    await tokenContract.methods.castVote(voteSupport).send({ from: castVoteUser });
    fetchInfo();
  };

  const proposeRenewUser = async (event) => {
    event.preventDefault();
    await identityContract.methods.proposeRenewUser(renewAddress, newExpiryTimestamp).send({ from: address });
    fetchInfo();
  };

  const proposeRevokeUser = async (event) => {
    event.preventDefault();
    await identityContract.methods.proposeRevokeUser(revokeAddress).send({ from: address });
    fetchInfo();
  };

  const handleUserToAddChange = (event) => {
    setUserToAdd(event.target.value);
  };

  const handleUserToRevokeChange = (event) => {
    setUserToRevoke(event.target.value);
  };

  const addUser = async (event) => {
    event.preventDefault();
    const currentTime = Math.floor(Date.now() / 1000);
    const expiryTimestamp = currentTime + 30 * 24 * 60 * 60; // Set the expiry time to 30 days from now
    await identityContract.methods.addUser(userToAdd, expiryTimestamp).send({ from: address });
  };

  const revokeUser = async (event) => {
    event.preventDefault();
    await identityContract.methods.revokeUser(userToRevoke).send({ from: address });
  };

  const handleAddIdpAdmin = async (idpAdminAddress) => {
    if (isIdentityProvider) {
      try {
        await identityContract.methods.addIdpAdmin(idpAdminAddress).send({ from: address });
        fetchInfo();
      } catch (error) {
        console.error("Error adding IDP Admin: ", error);
      }
    } else {
      console.error("Only Identity Providers can add IDP Admins");
    }
  };

  const handleRemoveIdpAdmin = async (idpAdminAddress) => {
    if (isIdentityProvider) {
      try {
        await identityContract.methods.removeIdpAdmin(idpAdminAddress).send({ from: address });
        fetchInfo();
      } catch (error) {
        console.error("Error removing IDP Admin: ", error);
      }
    } else {
      console.error("Only Identity Providers can remove IDP Admins");
    }
  };



  useEffect(() => {
    const init = async () => {
      if (window.ethereum) {
        window.web3 = new Web3(window.ethereum);
        await window.ethereum.enable();
      } else if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider);
      } else {
        console.log("Non-Ethereum browser detected. You should consider trying MetaMask!");
        return;
      }

      const web3 = window.web3;
      const networkId = await web3.eth.net.getId();
      const tokenContractAddress = "0x64063e2FD513258864CBE8500E1E8D3A9AbCF461";
      const newTokenContract = new web3.eth.Contract(xfindr00tokenABI.abi, tokenContractAddress);
      setTokenContract(newTokenContract);

      const identityContractAddress = "0xe84CcF9333943e41B6CcAefC077eC618Af538cA4";
      const newIdentityContract = new web3.eth.Contract(IdentityVerificationABI.abi, identityContractAddress);
      setIdentityContract(newIdentityContract);
    };

    init();
  }, []);

  const handleFormSubmit = (event) => {
    event.preventDefault();
    fetchInfo();
  };

  return (
    <div className="App">
      <h1>xfindr00 token DAPP</h1>
      <form onSubmit={handleFormSubmit}>
        <h2>Main address connection</h2>
        <label for="address">Enter address:</label>

        <input
          id="address"
          type="text"
          placeholder="Enter address"
          value={address}
          onChange={handleInputChange}
        />
        <button type="submit">Get Info</button>
        <p>Address: {address}</p>
        <p style={{ color: isVerified ? 'green' : 'red', fontWeight: 'bold' }}>
          {isVerified ? `This address is Verified` : `This address is not Verified`}
        </p>
        <p style={{ color: isIDPAdmin ? 'green' : 'red', fontWeight: 'bold' }}>
          {isIDPAdmin ? `This address is an IDPAdmin` : `This address is not an IDPAdmin`}
        </p>
        <p style={{ color: isIdentityProvider ? 'green' : 'red', fontWeight: 'bold' }}>
          {isIdentityProvider ? `This address is an Identity Provider` : `This address is not an Identity Provider`}
        </p>
        <p style={{ color: isVerified ? 'green' : 'red', fontWeight: 'bold' }}>
          {isVerified ? `Expiry Date: ${userExpiracy}` : "No user expiry"}
        </p>
        <p style={{ color: isMintingAdmin ? 'green' : 'red', fontWeight: 'bold' }}>
          {isMintingAdmin ? `This address is a Minting admin and minted  ${amountMintedByAdmin}` : `This address is not a Minting admin`}
        </p>
        {loading ? (
          <p style={{ fontWeight: 'bold' }}>Loading balance...</p>
        ) : (
          <p style={{ fontWeight: 'bold' }}>{balance !== null ? `Token balance: ${balance}` : ""}</p>
        )}
        <h3>IDP Admins</h3>
        {idpAdmins.length > 0 ? (
          idpAdmins.map((admin, index) => <p key={index}>{admin}</p>)
        ) : (
          <p>No IDP Admins found</p>
        )}

        <h3>Identity Providers</h3>
        {idpProviders.length > 0 ? (
          idpProviders.map((address, index) => <p key={index}>{address}</p>)
        ) : (
          <p>No Identity Providers found</p>
        )}
      </form>

      {/* Minting */}
      {isMintingAdmin && (
        <form onSubmit={mint}>
          <h2>Minting</h2>
          <label for="recipient_mint">Enter mint address:</label>
          <input
            id="recipient_mint"
            type="text"
            placeholder="Enter mint address"
            value={toAddressMint}
            onChange={handleToAddressMintChange}
          />
          <label for="amount_mint">Enter minting amount:</label>
          <input
            id="amount_mint"
            type="number"
            placeholder="Enter minting amount"
            value={amountMint}
            onChange={handleAmountMintChange}
          />
          <button type="submit">Mint Tokens</button>
        </form>
      )}

      {/* PROPOSE VOTE */}
      {isMintingAdmin && (
        <form onSubmit={proposeVote}>
          <h2>Propose vote for increasing TMAX</h2>
          <label for="propose_vote_user">Enter user address to propose:</label>
          <input
            id="propose_vote_user"
            type="text"
            placeholder="Enter user address"
            value={proposeVoteUser}
            onChange={(event) => setProposeVoteUser(event.target.value)}
          />
          <label for="propose_vote_tmax">Enter new TMAX:</label>
          <input
            id="propose_vote_tmax"
            type="number"
            placeholder="Enter TMAX"
            value={proposeVoteTMAX}
            onChange={(event) => setproposeVoteTMAX(event.target.value)}
          />
          <button type="submit">Propose Vote</button>
        </form>
      )}

      {/* CAST VOTE */}
      {isMintingAdmin && (
        <form onSubmit={castVote}>
          <h2>Cast vote for increasing TMAX</h2>
          <label for="cast_vote_user">Enter user address to vote:</label>
          <input
            id="cast_vote_user"
            type="text"
            placeholder="Enter user address"
            value={castVoteUser}
            onChange={(event) => setCastVoteUser(event.target.value)}
          />
          <label for="vote_support">Support the proposal:</label>
          <select id="vote_support" value={voteSupport} onChange={(event) => setVoteSupport(event.target.value)}>
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <button type="submit">Cast Vote</button>
        </form>
      )}

      {/* Transfer */}
      {isVerified && (
        <form onSubmit={transfer}>
          <h2>Transfer</h2>
          <label for="recipient">Enter transfer to address:</label>
          <input
            id="recipient"
            type="text"
            placeholder="Enter transfer to address"
            value={toAddress}
            onChange={handleToAddressChange}
          />
          <label for="amount">Enter amount to transfer:</label>
          <input
            id="amount"
            type="number"
            placeholder="Enter amount to transfer"
            value={amount}
            onChange={handleAmountChange}
          />
          <button type="submit">Transfer Tokens</button>
        </form>
      )}

      {/* Propose add User */}
      {isIDPAdmin && (
        <form onSubmit={proposeAddUser}>
          <h2>Propose add user</h2>
          <label for="add_user_address">Enter address of user to add:</label>
          <input
            id="add_user_address"
            type="text"
            placeholder="Enter address"
            value={addUserAddress}
            onChange={handleAddUserAddressChange}
          />
          <label for="add_user_expiry">Enter expiry timestamp:</label>
          <input
            id="add_user_expiry"
            type="date"
            placeholder="Enter expiry timestamp"
            value={addUserExpiryDate}
            onChange={handleAddUserExpiryChange}
          />
          <button type="submit">Propose Add User</button>
        </form>
      )}

      {/* Cast Vote */}
      {isIDPAdmin && (
        <form onSubmit={castVoteAdd}>
          <h2>Cast vote user management</h2>
          <label for="vote_user_address">Enter address of user to vote:</label>
          <input
            id="vote_user_address"
            type="text"
            placeholder="Enter address"
            value={voteUserAddress}
            onChange={handleVoteUserAddressChange}
          />
          <label for="vote_user_support">Support:</label>
          <select id="vote_user_support" value={voteUserSupport} onChange={(event) => setVoteUserSupport(event.target.value)}>
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <button type="submit">Cast Vote</button>
        </form>
      )}

      {/* PROPOSE RENEW USER */}
      {isIDPAdmin && (
        <form onSubmit={proposeRenewUser}>
          <h2>Propose renew user</h2>
          <label for="renew_address">Enter user address to renew:</label>
          <input
            id="renew_address"
            type="text"
            placeholder="Enter address"
            value={renewAddress}
            onChange={handleRenewAddressChange}
          />
          <label for="new_expiry_timestamp">Enter new expiry timestamp:</label>
          <input
            id="new_expiry_timestamp"
            type="date"
            placeholder="Enter expiry timestamp"
            value={newExpiryDate}
            onChange={handleNewExpiryTimestampChange}
          />
          <button type="submit">Propose to renew user</button>
        </form>)}

      {/* PROPOSE REVOKE USER */}
      {isIDPAdmin && (
        <form onSubmit={proposeRevokeUser}>
          <h2>Propose revoke user</h2>
          <label for="revoke_address">Enter user address to revoke:</label>
          <input
            id="revoke_address"
            type="text"
            placeholder="Enter address"
            value={revokeAddress}
            onChange={handleRevokeAddressChange}
          />
          <button type="submit">Propose to revoke user</button>
        </form>)}

      {isIdentityProvider && (
        <div>
          {/* ADD USER */}
          <form onSubmit={addUser}>
            <h2>Verify address force (IdentityProvider)</h2>
            <label htmlFor="userToAdd">Enter user address to add:</label>
            <input
              id="userToAdd"
              type="text"
              placeholder="Enter user address"
              value={userToAdd}
              onChange={handleUserToAddChange}
            />
            <button type="submit">Add User</button>
          </form>

          {/* REVOKE USER */}
          <form onSubmit={revokeUser}>
            <h2>Unverify address force (IdentityProvider)</h2>
            <label htmlFor="userToRevoke">Enter user address to revoke:</label>
            <input
              id="userToRevoke"
              type="text"
              placeholder="Enter user address"
              value={userToRevoke}
              onChange={handleUserToRevokeChange}
            />
            <button type="submit">Revoke User</button>
          </form>
        </div>
      )}

      {isIdentityProvider && (
        <div>
          <form onSubmit={(event) => { event.preventDefault(); handleAddIdpAdmin(event.target.idpAdmin.value); }}>
          <h2>Add IDP Admin (IdentityProvider)</h2>
            <label for="idpAdmin">Enter IDP Admin address to add:</label>
            <input id="idpAdmin" type="text" placeholder="Enter IDP Admin address" />
            <button type="submit">Add IDP Admin</button>
          </form>

          <form onSubmit={(event) => { event.preventDefault(); handleRemoveIdpAdmin(event.target.idpAdmin.value); }}>
          <h2>Remove IDP Admin (IdentityProvider)</h2>
            <label for="idpAdmin">Enter IDP Admin address to remove:</label>
            <input id="idpAdmin" type="text" placeholder="Enter IDP Admin address" />
            <button type="submit">Remove IDP Admin</button>
          </form>
        </div>
      )}





    </div>
  );
}

export default App;

