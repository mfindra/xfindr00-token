const { expect } = require("chai");
const hre = require("hardhat");

describe("xfindr00token contract", function () {
    // global vars
    let Token, IdentityVerification;
    let xfindr00token, identityVerification;
    let owner, addr1, addr2, addr3, addr4, addr5, addr6;
    let tokenCap = 10000000000;
    let tokenBlockReward = 50;
    let tokenTMAX = 10000;

    beforeEach(async function () {
        // Get the ContractFactory and Signers here.
        Token = await ethers.getContractFactory("xfindr00token");
        IdentityVerification = await ethers.getContractFactory("IdentityVerification");
        [owner, addr1, addr2, addr3, addr4, addr5, addr6] = await hre.ethers.getSigners();

        identityVerification = await IdentityVerification.deploy([], [], []);
        xfindr00token = await Token.deploy(tokenCap, tokenBlockReward, tokenTMAX, identityVerification.address, []);

        await identityVerification.addIdentityProvider(owner.address);
        await identityVerification.addIdpAdmin(owner.address);
        await identityVerification.addUser(owner.address, Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
        await identityVerification.addUser(addr1.address, Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
        await identityVerification.addUser(addr2.address, Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
        await identityVerification.addUser(addr3.address, Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
        await identityVerification.addUser(addr4.address, Math.floor(Date.now() / 1000) + 3600); // 1 hour from now
        await identityVerification.addUser(addr5.address, Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await xfindr00token.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await xfindr00token.balanceOf(owner.address);
            expect(await xfindr00token.totalSupply()).to.equal(ownerBalance);
        });

        it("Should set the max capped supply to the argument provided during deployment", async function () {
            const cap = await xfindr00token.cap();
            expect(Number(hre.ethers.utils.formatEther(cap))).to.equal(tokenCap);
        });

        it("Should set the blockReward to the argument provided during deployment", async function () {
            const blockReward = await xfindr00token.blockReward();
            expect(Number(hre.ethers.utils.formatEther(blockReward))).to.equal(tokenBlockReward);
        });

        it("Should assign the IDP_ADMIN_ROLE to the owner", async function () {
            expect(await identityVerification.hasRole(await identityVerification.IDP_ADMIN_ROLE(), owner.address)).to.equal(true);
        });
    });

    describe("Transactions", function () {
        it("Should transfer tokens between accounts", async function () {
            // Transfer 50 tokens from owner to addr1
            await xfindr00token.transfer(addr1.address, 50);
            const addr1Balance = await xfindr00token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(50);

            // Transfer 50 tokens from addr1 to addr2
            // We use .connect(signer) to send a transaction from another account
            await xfindr00token.connect(addr1).transfer(addr2.address, 50);
            const addr2Balance = await xfindr00token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });

        it("Should fail if sender doesn't have enough tokens", async function () {
            const initialOwnerBalance = await xfindr00token.balanceOf(owner.address);
            // Try to send 1 token from addr1 (0 tokens) to owner (1000000 tokens).
            // `require` will evaluate false and revert the transaction.
            await expect(
                xfindr00token.connect(addr1).transfer(owner.address, 1)
            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

            // Owner balance shouldn't have changed.
            expect(await xfindr00token.balanceOf(owner.address)).to.equal(
                initialOwnerBalance
            );
        });

        it("Should update balances after transfers", async function () {
            const initialOwnerBalance = await xfindr00token.balanceOf(owner.address);

            // Transfer 100 tokens from owner to addr1.
            await xfindr00token.transfer(addr1.address, 100);

            // Transfer another 50 tokens from owner to addr2.
            await xfindr00token.transfer(addr2.address, 50);

            // Check balances.
            const finalOwnerBalance = await xfindr00token.balanceOf(owner.address);
            expect(finalOwnerBalance).to.equal(initialOwnerBalance.sub(150));

            const addr1Balance = await xfindr00token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(100);

            const addr2Balance = await xfindr00token.balanceOf(addr2.address);
            expect(addr2Balance).to.equal(50);
        });

        it("Should fail if trying to transfer tokens to an address that is not a verified user", async function () {
            await identityVerification.revokeUser(addr1.address);
            await expect(xfindr00token.transfer(addr1.address, 50)).to.be.revertedWith("Recipient is not a verified user");
        });

        it("Should allow to transfer tokens to a verified user", async function () {
            // Transfer 50 tokens from owner to addr1
            await xfindr00token.transfer(addr1.address, 50);
            const addr1Balance = await xfindr00token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(50);
        });

        it("Should fail when trying to burn tokens", async function () {
            await expect(
                xfindr00token.transfer(ethers.constants.AddressZero, ethers.utils.parseEther("1"))
            ).to.be.revertedWith("Recipient is not a verified user");
            // .to.be.revertedWith("ERC20: transfer to the zero address");
        });


    });

    describe("Minting", function () {
        it("Should allow mintingAdmin to mint tokens below TMAX", async function () {
            await xfindr00token.mint(addr1.address, tokenTMAX - 1);
            const addr1Balance = await xfindr00token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(tokenTMAX - 1);
        });

        it("Should fail if mintingAdmin tries to mint tokens above TMAX", async function () {
            await expect(xfindr00token.mint(addr1.address, tokenTMAX + 1)).to.be.revertedWith("Minting amount exceeds TMAX");
        });

        it("Should fail if mintingAdmin tries to mint tokens in batches to an address that is not a verified user", async function () {
            await identityVerification.revokeUser(addr2.address);
            const recipients = [addr1.address, addr2.address];
            const amounts = [tokenTMAX / 2, tokenTMAX / 2];
            await expect(xfindr00token.mintBatch(recipients, amounts)).to.be.revertedWith("Recipient is not a verified user");
        });

        it("Should allow mintingAdmin to mint tokens in batches below TMAX to verified users", async function () {
            const recipients = [addr1.address, addr2.address];
            const amounts = [tokenTMAX / 2, tokenTMAX / 2];

            await xfindr00token.mintBatch(recipients, amounts);
            const addr1Balance = await xfindr00token.balanceOf(addr1.address);
            const addr2Balance = await xfindr00token.balanceOf(addr2.address);
            expect(addr1Balance).to.equal(tokenTMAX / 2);
            expect(addr2Balance).to.equal(tokenTMAX / 2);
        });

        it("Should fail if mintingAdmin tries to mint tokens to an address that is not a verified user", async function () {
            await identityVerification.revokeUser(addr1.address);
            await expect(xfindr00token.mint(addr1.address, tokenTMAX - 1)).to.be.revertedWith("Recipient is not a verified user");
        });

        it("Should allow mintingAdmin to mint tokens below TMAX to a verified user", async function () {
            await xfindr00token.mint(addr1.address, tokenTMAX - 1);
            const addr1Balance = await xfindr00token.balanceOf(addr1.address);
            expect(addr1Balance).to.equal(tokenTMAX - 1);
        });

        it("Should correctly track the number of tokens minted by an admin", async function () {
            const amountToMint = 10;

            // Mint tokens to addr1
            await xfindr00token.mint(addr1.address, amountToMint);

            // Check the number of tokens minted by the admin
            const tokensMintedByAdmin = await xfindr00token.getMintedTokensByAdmin(owner.address);
            expect(tokensMintedByAdmin).to.equal(amountToMint);

            // Mint more tokens to addr1
            const additionalAmountToMint = 10;
            await xfindr00token.mint(addr1.address, additionalAmountToMint);

            // Check the updated number of tokens minted by the admin
            const updatedTokensMintedByAdmin = await xfindr00token.getMintedTokensByAdmin(owner.address);
            expect(updatedTokensMintedByAdmin).to.equal(amountToMint + additionalAmountToMint);
        });

    });

    describe("Minting Admin Roles", function () {
        it("Should allow to add and remove mintingAdmin", async function () {
            await xfindr00token.addMintingAdmin(addr1.address);
            const hasRole = await xfindr00token.hasRole(await xfindr00token.MINTING_ADMIN_ROLE(), addr1.address);
            expect(hasRole).to.equal(true);

            await xfindr00token.removeMintingAdmin(addr1.address);
            const hasRoleAfterRemoval = await xfindr00token.hasRole(await xfindr00token.MINTING_ADMIN_ROLE(), addr1.address);
            expect(hasRoleAfterRemoval).to.equal(false);
        });

        it("Should fail if a non-mintingAdmin tries to mint tokens", async function () {
            const expectedError = "AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + (await xfindr00token.MINTING_ADMIN_ROLE());
            await expect(xfindr00token.connect(addr1).mint(addr2.address, tokenTMAX - 1)).to.be.revertedWith(expectedError);
        });
    });

    describe("Voting minting", function () {
        beforeEach(async function () {
            // Add addr1 and addr2 as mintingAdmins
            await xfindr00token.addMintingAdmin(addr1.address);
            await xfindr00token.addMintingAdmin(addr2.address);
            await xfindr00token.addMintingAdmin(addr1.address);
            await xfindr00token.addMintingAdmin(addr2.address);
            await xfindr00token.addMintingAdmin(addr3.address);
            await xfindr00token.addMintingAdmin(addr4.address);
        });

        it("Should allow a mintingAdmin to propose a vote", async function () {
            await xfindr00token.connect(addr1).proposeVote(addr2.address, tokenTMAX + 1);
            expect(await xfindr00token.voteRecipient()).to.equal(addr2.address);
            expect(await xfindr00token.voteAmount()).to.equal(tokenTMAX + 1);
            expect(await xfindr00token.voteCount()).to.equal(1); // Proposer's vote is automatically counted
        });

        it("Should fail if a non-mintingAdmin tries to propose a vote", async function () {
            await xfindr00token.removeMintingAdmin(addr1.address);
            const expectedError = "AccessControl: account " + addr1.address.toLowerCase() + " is missing role " + (await xfindr00token.MINTING_ADMIN_ROLE());
            await expect(xfindr00token.connect(addr1).proposeVote(addr2.address, tokenTMAX + 1)).to.be.revertedWith(expectedError);
        });

        it("Should allow a mintingAdmin to cast a vote", async function () {
            const proposedAmount = ethers.utils.parseUnits((tokenTMAX + 1).toString(), 'ether');

            await xfindr00token.connect(addr1).proposeVote(addr2.address, proposedAmount);
            await xfindr00token.connect(addr2).castVote(true);

            // votes are counted
            expect(await xfindr00token.voteCount()).to.equal(2);

            await xfindr00token.connect(addr3).castVote(true);
            await xfindr00token.connect(addr4).castVote(true);

            // Check if TMAX was updated as the vote passed
            const currentTMAX = await xfindr00token.TMAX();
            expect(currentTMAX).to.equal(proposedAmount);

        });

        it("Should fail if a non-mintingAdmin tries to cast a vote", async function () {
            await xfindr00token.connect(addr1).proposeVote(addr2.address, tokenTMAX + 1);
            await xfindr00token.removeMintingAdmin(addr2.address);
            const expectedError = "AccessControl: account " + addr2.address.toLowerCase() + " is missing role " + (await xfindr00token.MINTING_ADMIN_ROLE());
            await expect(xfindr00token.connect(addr2).castVote(true)).to.be.revertedWith(expectedError);
        });

        it("Should fail if a mintingAdmin tries to cast a vote twice", async function () {
            await xfindr00token.connect(addr1).proposeVote(addr2.address, tokenTMAX + 1);
            await expect(xfindr00token.connect(addr1).castVote(true)).to.be.revertedWith("Already voted");
        });

        it("Should fail if a vote is cast after the vote has expired", async function () {
            await xfindr00token.connect(addr1).proposeVote(addr2.address, tokenTMAX + 1);
            // Simulate time passing
            await hre.network.provider.send("evm_increaseTime", [24 * 60 * 60 + 1]); // Add 1 day and 1 second
            await hre.network.provider.send("evm_mine");
            await expect(xfindr00token.connect(addr2).castVote(true)).to.be.revertedWith("Vote has expired");
        });
    });

    describe("IDP Admin Roles", function () {
        it("Should allow to add and remove idpAdmin", async function () {
            await identityVerification.addIdpAdmin(addr1.address);
            expect(await identityVerification.hasRole(await identityVerification.IDP_ADMIN_ROLE(), addr1.address)).to.equal(true);

            await identityVerification.removeIdpAdmin(addr1.address);
            expect(await identityVerification.hasRole(await identityVerification.IDP_ADMIN_ROLE(), addr1.address)).to.equal(false);
        });

        it("Should allow to add and remove identityProvider", async function () {
            await identityVerification.addIdentityProvider(addr1.address);
            expect(await identityVerification.hasRole(await identityVerification.IDENTITY_PROVIDER_ROLE(), addr1.address)).to.equal(true);

            await identityVerification.removeIdentityProvider(addr1.address);
            expect(await identityVerification.hasRole(await identityVerification.IDENTITY_PROVIDER_ROLE(), addr1.address)).to.equal(false);
        });
    });

    describe("User Verification", function () {

        beforeEach(async function () {
            await identityVerification.connect(owner).addIdpAdmin(addr2.address);
            await identityVerification.connect(owner).addIdpAdmin(addr3.address);
            await identityVerification.connect(owner).addIdpAdmin(addr4.address);
        });

        it("Should allow idpAdmin to propose to add a user", async function () {
            await identityVerification.connect(owner).proposeAddUser(addr6.address, Math.floor(Date.now() / 1000) + 3600);
            expect(await identityVerification.isUser(addr6.address)).to.be.false;
        });

        it("Should allow idpAdmin to cast vote", async function () {
            await identityVerification.connect(owner).proposeAddUser(addr6.address, Math.floor(Date.now() / 1000) + 3600);
            await identityVerification.connect(owner).castVote(addr6.address, true);
            expect(await identityVerification.isUser(addr6.address)).to.be.false;
        });

        it("Should verify a user if majority idpAdmins vote", async function () {

            await identityVerification.connect(owner).proposeAddUser(addr6.address, Math.floor(Date.now() / 1000) + 3600);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);

            expect(await identityVerification.isUser(addr6.address)).to.be.true;
        });

        it("Should allow idpAdmin to propose to revoke a user", async function () {
            await identityVerification.connect(owner).proposeAddUser(addr6.address, Math.floor(Date.now() / 1000) + 3600);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);
            await identityVerification.connect(owner).proposeRevokeUser(addr6.address);
            expect(await identityVerification.isUser(addr6.address)).to.be.true;
        });

        it("Should revoke a user if majority idpAdmins vote", async function () {
            await identityVerification.connect(owner).proposeAddUser(addr6.address, Math.floor(Date.now() / 1000) + 3600);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);
            await identityVerification.connect(owner).proposeRevokeUser(addr6.address);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);
            expect(await identityVerification.isUser(addr6.address)).to.be.false;
        });

        it("Should allow idpAdmin to propose to renew a user", async function () {
            await identityVerification.connect(owner).proposeAddUser(addr6.address, Math.floor(Date.now() / 1000) + 3600);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);
            await identityVerification.connect(owner).proposeRenewUser(addr6.address, Math.floor(Date.now() / 1000) + 7200);
            expect(await identityVerification.isUser(addr6.address)).to.be.true;
        });

        it("Should renew a user if majority idpAdmins vote", async function () {
            time_exp = Math.floor(Date.now() / 1000) + 3600;
            await identityVerification.connect(owner).proposeAddUser(addr6.address, time_exp);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);
            await identityVerification.connect(owner).proposeRenewUser(addr6.address, 7200);
            await identityVerification.connect(addr2).castVote(addr6.address, true);
            await identityVerification.connect(addr3).castVote(addr6.address, true);
            await identityVerification.connect(addr4).castVote(addr6.address, true);
            const user = await identityVerification.getUser(addr6.address);
            expect(user.expiryTimestamp).to.be.not.equal(time_exp);
        });
    });


});