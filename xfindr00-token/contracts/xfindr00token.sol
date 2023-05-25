// contracts/xfindr00token.sol
// SPDX-License-Identifier: MIT

// Importing necessary contracts and libraries from OpenZeppelin
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";
import "./IdentityVerification.sol";

// This is the main contract. It extends ERC20Capped and ERC20Burnable from OpenZeppelin to create a capped and burnable token.
// It also uses AccessControl for role-based functionality and ReentrancyGuard to prevent re-entrancy attacks.
contract xfindr00token is ERC20Capped, ERC20Burnable, AccessControl, ReentrancyGuard {
    using SafeMath for uint256; // Safemath library used for arithmetic operations
    using Address for address; // Library for common address-related functions
    using EnumerableSet for EnumerableSet.AddressSet; // Library for managing an enumerable set of addresses

    address payable public owner; // The address of the owner
    uint256 public blockReward; // The reward per block
    uint256 public TMAX; // Maximum daily minting limit
    uint256 public mintedToday; // Amount minted today
    uint256 public lastReset; // Timestamp when mintedToday was last reset

    bytes32 public constant MINTING_ADMIN_ROLE = keccak256("MINTING_ADMIN_ROLE"); // Role for minting admin
    EnumerableSet.AddressSet private _mintingAdmins; // Set of minting admins
    IdentityVerification private _identityVerification; // Instance of IdentityVerification contract

    mapping(address => uint256) public mintedTokensByAdmin; // Mapping to keep track of tokens minted by each admin

    // Voting related state
    mapping(address => bool) public votes; // Mapping to keep track of votes
    uint256 public voteCount; // Current vote count
    uint256 public lastVoteTime; // Time when the last vote was cast
    uint256 public voteAmount; // Amount for the vote
    address public voteRecipient; // Recipient of the vote

    // The constructor initializes the token and sets the cap, block reward, TMAX, and the initial minting admins
    constructor(uint256 cap, uint256 reward, uint256 tmax, IdentityVerification identityVerification, address[] memory mint_owners)
        ERC20("xfindr00token", "OCT") ERC20Capped(cap * (10 ** decimals())) {
            owner = payable(msg.sender); 
            _mint(owner, 50000000 * (10 ** decimals())); 
            blockReward = reward * (10 ** decimals()); 
            TMAX = tmax * (10 ** decimals()); 
            _identityVerification = identityVerification; 
            _setupRole(MINTING_ADMIN_ROLE, msg.sender); 
            _mintingAdmins.add(msg.sender);
            for (uint i = 0; i < mint_owners.length; i++) {
                _setupRole(MINTING_ADMIN_ROLE, mint_owners[i]);
                _mintingAdmins.add(mint_owners[i]);
            }
            lastReset = block.timestamp;            
        }


        // Overrides the _mint function from the ERC20Capped contract to enforce the cap
    function _mint(address account, uint256 amount) internal virtual override(ERC20Capped, ERC20) {
        require(
            ERC20.totalSupply() + amount <= cap(),
            "ERC20Capped: cap exceeded"
        );
        super._mint(account, amount);
    }

    // Function to mint the block reward to the miner
    function _mintMinerReward() internal {
        _mint(block.coinbase, blockReward);
    }

    // Overrides the _beforeTokenTransfer function from the ERC20 contract to mint block rewards
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        require(to != address(0), "ERC20: transfer to the zero address");
        
        // Checks that the transfer is not from the zero address, not to the miner, and not from the miner
        if (
            from != address(0) &&
            to != block.coinbase &&
            block.coinbase != address(0)
        ) {
            _mintMinerReward();
        }
        super._beforeTokenTransfer(from, to, value);
    }

    // Overrides the transfer function from the ERC20 contract to enforce identity verification
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        require(_identityVerification.isUser(recipient), "Recipient is not a verified user");
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    // Function for the owner to set the block reward
    function setBlockReward(uint256 reward) public onlyOwner {
        blockReward = reward * (10 ** decimals());
    }

    // Function for minting admins to add new minting admins
    function addMintingAdmin(
        address admin
    ) public onlyRole(MINTING_ADMIN_ROLE) {
        _mintingAdmins.add(admin);
        _setupRole(MINTING_ADMIN_ROLE, admin); 
    }

    // Function for minting admins to remove other minting admins
    function removeMintingAdmin(
        address admin
    ) public onlyRole(MINTING_ADMIN_ROLE) {
        _mintingAdmins.remove(admin);
        _revokeRole(MINTING_ADMIN_ROLE, admin);
    }

    // Function to get the list of minting admins
    function getMintingAdmins() public view returns (address[] memory) {
        return _mintingAdmins.values();
    }

    // Function for minting admins to mint tokens, but not exceeding the daily limit
    function mint(address to, uint256 amount) public onlyRole(MINTING_ADMIN_ROLE) {
        resetMintedToday();
        require((mintedToday + amount) * (10 ** decimals()) <= TMAX, "Minting amount exceeds TMAX");
        require(_identityVerification.isUser(to), "Recipient is not a verified user");
        _mint(to, amount);
        mintedTokensByAdmin[msg.sender] += amount;
        mintedToday += amount;
    }

        // Function for minting admins to mint tokens to multiple addresses in a single transaction, but not exceeding the daily limit
    function mintBatch(address[] memory to, uint256[] memory amounts) public onlyRole(MINTING_ADMIN_ROLE) {
        // Check the arrays have the same length
        require(
            to.length == amounts.length,
            "Addresses and amounts arrays must have the same length"
        );

        // Calculate the total amount to mint
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            // Check the recipient is a verified user
            require(_identityVerification.isUser(to[i]), "Recipient is not a verified user");
            totalAmount = totalAmount.add(amounts[i]);
        }

        // Check the total amount does not exceed the daily limit
        require((totalAmount * (10 ** decimals())) <= TMAX, "Total minting amount exceeds TMAX");

        // Mint the tokens to the recipients
        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], amounts[i]);
            mintedTokensByAdmin[msg.sender] += amounts[i];
        }
    }

    // Function to get the number of tokens minted by an admin
    function getMintedTokensByAdmin(address admin) public view returns (uint256) {
        return mintedTokensByAdmin[admin];
    }

    // Function to get the daily minting limit
    function getTMAX() public view returns (uint256) {
        return TMAX;
    }

    // Function for minting admins to set the daily minting limit
    function setTMAX(uint256 newTMAX) public onlyRole(MINTING_ADMIN_ROLE) {
        TMAX = newTMAX * (10 ** decimals());
    }

    // Function to reset the amount minted today if a day has passed since the last reset
    function resetMintedToday() internal {
        if (block.timestamp >= lastReset + 1 days) {
            lastReset = block.timestamp;
            mintedToday = 0;
        }
    }

    // Function for minting admins to propose a vote to mint an amount exceeding the daily limit
    function proposeVote(address to, uint256 amount) public onlyRole(MINTING_ADMIN_ROLE) {
        // Check the proposed amount is more than TMAX
        require(amount * (10 ** decimals()) > TMAX, "Proposed amount does not exceed TMAX");
        // Check the recipient is a verified user
        require(_identityVerification.isUser(to), "Recipient is not a verified user");

        // Reset the previous votes
        for (uint256 i = 0; i < _mintingAdmins.length(); i++) {
            votes[_mintingAdmins.at(i)] = false;
        }

        // Initialize the new vote
        voteCount = 0;
        lastVoteTime = block.timestamp;
        voteAmount = amount;
        voteRecipient = to;

        // The proposer automatically votes for the proposal
        castVote(true);
    }

    // Function for minting admins to cast their vote
    function castVote(bool support) public onlyRole(MINTING_ADMIN_ROLE) {
        require(votes[msg.sender] == false, "Already voted");
        require(block.timestamp <= lastVoteTime + 1 days, "Vote has expired");

        votes[msg.sender] = true;
        if (support) {
            voteCount += 1;
            // Check if the vote has passed
            if (voteCount * 2 > _mintingAdmins.length()) {
                TMAX = voteAmount; 
                // Reset the vote
                voteCount = 0;
                voteAmount = 0;
                voteRecipient = address(0);
            }
        }
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }
}   
