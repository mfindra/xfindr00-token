// contracts/IdentityVerification.sol
// SPDX-License-Identifier: MIT

// Importing necessary libraries and contracts
pragma solidity ^0.8.18;
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "hardhat/console.sol";

// The IdentityVerification contract inherits the AccessControl contract from OpenZeppelin
// This contract verifies the identity of users and manages roles
contract IdentityVerification is AccessControl {
    using SafeMath for uint256;

    // Defining constants for roles
    bytes32 public constant IDP_ADMIN_ROLE = keccak256("IDP_ADMIN_ROLE");
    bytes32 public constant IDENTITY_PROVIDER_ROLE = keccak256("IDENTITY_PROVIDER_ROLE");

    // Defining user structure
    struct User {
        bool isVerified;
        uint256 expiryTimestamp;
        address identityProvider;
    }

    // Defining vote structure
    struct Vote {
        address target;
        uint256 start;
        uint256 expiry;
        bool active;
        uint256 count;
    }

    // Default user expiry time
    uint256 public defaultExpiry = 30 days;

    // Initialize with 1 for the deployer
    uint256 public idpAdminCount = 1; 
    uint256 public idpProviderCount = 1; 

    // Mappings to store users, votes, and userVotes
    mapping(address => User) private _users;
    mapping(address => Vote) private _votes;
    mapping(address => mapping(address => bool)) private _userVotes;

    // Lists to store admin and provider addresses
    address[] public idpAdminAddresses;
    address[] public idpProviderAddresses;

    // Constructor function - Initializes contract with provided user and admin addresses
    constructor(
        address[] memory idp_providers,
        address[] memory idp_admins,
        address[] memory verified_users
    ) {
        // Setup default roles
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(IDP_ADMIN_ROLE, _msgSender());
        idpAdminAddresses.push(_msgSender());
        idpProviderAddresses.push(_msgSender());

        // Setup for ganache
        for (uint i = 0; i < verified_users.length; i++) {
            _users[verified_users[i]] = User(
                true,
                block.timestamp + defaultExpiry,
                verified_users[i]
            );
        }
        for (uint i = 0; i < idp_admins.length; i++) {
            _setupRole(IDP_ADMIN_ROLE, idp_admins[i]);
            idpAdminAddresses.push(idp_admins[i]);
        }
        for (uint i = 0; i < idp_providers.length; i++) {
            _setupRole(IDENTITY_PROVIDER_ROLE, idp_providers[i]);
            idpProviderAddresses.push(idp_providers[i]);
        }
    }

    // Function to add a user
    function addUser(
        address user,
        uint256 expiryTimestamp
    ) public onlyRole(IDENTITY_PROVIDER_ROLE) {
        require(!isUser(user), "User already exists");
        _users[user] = User(true, expiryTimestamp, msg.sender);
    }

    // Function to revoke a user
    function revokeUser(address user) public onlyRole(IDENTITY_PROVIDER_ROLE) {
        require(isUser(user), "User does not exist");
        _users[user].isVerified = false;
    }

    // Function to renew a user
    function renewUser(
        address user,
        uint256 newExpiryTimestamp
    ) public onlyRole(IDENTITY_PROVIDER_ROLE) {
        require(isUser(user), "User does not exist");
        _users[user].expiryTimestamp = newExpiryTimestamp;
    }

        // Function to propose adding a user
    function proposeAddUser(
        address user,
        uint256 expiryTimestamp
    ) public onlyRole(IDP_ADMIN_ROLE) {
        require(!_users[user].isVerified, "User is already verified");
        resetVotes(user);
        _votes[user] = Vote({
            target: user,
            start: block.timestamp,
            expiry: block.timestamp + expiryTimestamp,
            active: true,
            count: 0
        });
    }

    // Function to propose revoking a user
    function proposeRevokeUser(address user) public onlyRole(IDP_ADMIN_ROLE) {
        require(_users[user].isVerified, "User is not verified");
        resetVotes(user);
        _votes[user] = Vote({
            target: user,
            start: block.timestamp,
            expiry: block.timestamp + defaultExpiry,
            active: false,
            count: 0
        });
    }

    // Function to propose renewing a user
    function proposeRenewUser(
        address user,
        uint256 newExpiryTimestamp
    ) public onlyRole(IDP_ADMIN_ROLE) {
        require(_users[user].isVerified, "User is not verified");
        resetVotes(user);
        _votes[user] = Vote({
            target: user,
            start: block.timestamp,
            expiry: block.timestamp + newExpiryTimestamp,
            active: true,
            count: 0
        });
    }

    // Function to cast a vote
    function castVote(
        address user,
        bool support
    ) public onlyRole(IDP_ADMIN_ROLE) {
        require(block.timestamp <= _votes[user].expiry, "Vote has expired");
        require(!_userVotes[user][msg.sender], "Already voted");
        _userVotes[user][msg.sender] = true;

        if (support) {
            _votes[user].count += 1;
            // Check if the vote has passed
            if (_votes[user].count * 2 > idpAdminCount) {
                _users[user].isVerified = _votes[user].active;
                _users[user].expiryTimestamp = _votes[user].expiry;
                resetVotes(user);
            }
        }
    }

    // Function to reset votes
    function resetVotes(address user) private {
        for (uint i = 0; i < idpAdminAddresses.length; i++) {
            _userVotes[user][idpAdminAddresses[i]] = false;
        }
        delete _votes[user];
    }

    // Function to check if a user is verified and not expired
    function isUser(address user) public view returns (bool) {
        return
            _users[user].isVerified &&
            block.timestamp < _users[user].expiryTimestamp;
    }

    // Function to get a user's details
    function getUser(
        address user
    )
        public
        view
        returns (
            bool isVerified,
            uint256 expiryTimestamp,
            address identityProvider
        )
    {
        User storage userStruct = _users[user];
        return (
            userStruct.isVerified,
            userStruct.expiryTimestamp,
            userStruct.identityProvider
        );
    }

    // Function to add an IDP Admin
    function addIdpAdmin(
        address idpAdmin
    ) public onlyRole(IDENTITY_PROVIDER_ROLE) {
        grantRole(IDP_ADMIN_ROLE, idpAdmin);
        idpAdminCount = idpAdminCount.add(1);
        idpAdminAddresses.push(idpAdmin);
    }

    // Function to remove an IDP Admin
    function removeIdpAdmin(
        address idpAdmin
    ) public onlyRole(IDENTITY_PROVIDER_ROLE) {
        revokeRole(IDP_ADMIN_ROLE, idpAdmin);
        idpAdminCount = idpAdminCount.sub(1);
        for (uint256 i = 0; i < idpAdminAddresses.length; i++) {
            if (idpAdminAddresses[i] == idpAdmin) {
                idpAdminAddresses[i] = idpAdminAddresses[
                    idpAdminAddresses.length - 1
                ];
                idpAdminAddresses.pop();
                break;
            }
        }
    }
    
    // Function to add an identity provider
    function addIdentityProvider(address idp) public onlyRole(IDP_ADMIN_ROLE) {
        grantRole(IDENTITY_PROVIDER_ROLE, idp);
        idpProviderAddresses.push(idp);
        idpProviderCount = idpProviderCount.add(1);
    }

    // Function to remove an identity provider
    function removeIdentityProvider(
        address idp
    ) public onlyRole(IDP_ADMIN_ROLE) {
        revokeRole(IDENTITY_PROVIDER_ROLE, idp);
        idpProviderCount = idpProviderCount.sub(1);
        for (uint256 i = 0; i < idpProviderAddresses.length; i++) {
            if (idpProviderAddresses[i] == idp) {
                idpProviderAddresses[i] = idpProviderAddresses[
                    idpProviderAddresses.length - 1
                ];
                idpProviderAddresses.pop();
                break;
            }
        }
    }
}
