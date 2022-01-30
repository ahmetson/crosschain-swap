const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers")

describe("Xdex smartcontracts test", async () => {
    //game data
    let testTokenSupply = utils.parseEther("10000");

    let amount_1 = utils.parseEther("100");
    let amount_2 = utils.parseEther("100");

    // imported contracts
    let testToken_1 = null;
    let testToken_2 = null;
    let factory     = null;
    let pair        = null;
    let targetChain = null;

    //session & accounts data
    let pairAddr = null;
    let accounts = null;

    let chainID = null;

    async function signWithdraw(user, token, amount, signer) {
        let withdrawNonce = await targetChain.withdrawNonceOf(user).catch(console.error);
        console.log(`Withdraw nonce of user ${user} is ${withdrawNonce}`);

        //v, r, s related stuff
        let bytes32 = utils.defaultAbiCoder.encode(["uint256", "uint256"], [withdrawNonce, amount]);
        let str = bytes32 + user.substr(2) + token.substr(2);
        let data = utils.keccak256(str);
        let flatSig = await signer.signMessage(utils.arrayify(data));

        let sig = utils.splitSignature(flatSig);

        return [sig.v, sig.r, sig.s];
    }

    async function signCreation(user, tokens, amounts, signer) {
        //v, r, s related stuff
        let depositNonce = await factory.depositNonceOf(user).catch(console.error);

        // depositNonceOf[msg.sender], params.amounts, msg.sender, params.tokens
        let bytes32 = utils.defaultAbiCoder.encode(["uint256", "uint256[2]"], [depositNonce, amounts]);
        let str = bytes32 + user.substr(2) + tokens[0].substr(2) + tokens[1].substr(2);
        let data = utils.keccak256(str);
        let flatSig = await signer.signMessage(utils.arrayify(data));

        let sig = utils.splitSignature(flatSig);

        return [sig.v, sig.r, sig.s];
    }

    async function signAddition(user, amounts, signer) {
        //v, r, s related stuff
        let nonce = await pair.nonceOf(user).catch(console.error);

        // depositNonceOf[msg.sender], params.amounts, msg.sender, params.tokens
        let bytes32 = utils.defaultAbiCoder.encode(["uint256", "uint256", "uint256"], [nonce, amounts[0], amounts[1]]);
        let str = bytes32 + user.substr(2);
        let data = utils.keccak256(str);
        let flatSig = await signer.signMessage(utils.arrayify(data));

        let sig = utils.splitSignature(flatSig);

        return [sig.v, sig.r, sig.s];
    }

    async function signTargetSwap(user, amountOut, signer) {
        //v, r, s related stuff
        let nonce = await pair.nonceOf(user).catch(console.error);

        // depositNonceOf[msg.sender], params.amounts, msg.sender, params.tokens
        let bytes32 = utils.defaultAbiCoder.encode(["uint256", "uint256"], [nonce, amountOut]);
        let str = bytes32 + user.substr(2);
        let data = utils.keccak256(str);
        let flatSig = await signer.signMessage(utils.arrayify(data));

        let sig = utils.splitSignature(flatSig);

        return [sig.v, sig.r, sig.s];
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // before player starts, need a few things prepare.
    // one of things to allow nft to be minted by nft factory
    it("deploy smartcontracts.", async () => {
        accounts            = await ethers.getSigners();

        chainID             = await accounts[0].getChainId();
        
        // Test tokens
        const TestToken = await ethers.getContractFactory("ERC20");
        testToken_1 = await TestToken.deploy(testTokenSupply);    /// Argument 1 means deploy in Test mode
        await testToken_1.deployed();
        testToken_2 = await TestToken.deploy(testTokenSupply);    /// Argument 1 means deploy in Test mode
        await testToken_2.deployed();
        console.log(`Test tokens were deployed.\nToken 1 ${testToken_1.address}, Token 2 ${testToken_2.address}`);

        // Factory
        let feeToSetter = accounts[0].address; 
        const Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy(feeToSetter, chainID + 1);
        console.log(`Factory was set to ${factory.address} on chain ${chainID}, paired to chain id ${chainID + 1}`);

        // Target Chain
        let TargetChain = await ethers.getContractFactory("TargetChain");
        targetChain = await TargetChain.deploy();
        console.log(`Target Chain interface was set to ${targetChain.address}`);
    });

    it("register verifiers", async () => {
        let regTx = await factory.connect(accounts[1]).verifierRegistration().catch(console.error);
        await regTx.wait();
        console.log(`Account ${accounts[1].address} registered as Arachyl on Factory!`);

        regTx = await targetChain.connect(accounts[1]).verifierRegistration().catch(console.error);
        await regTx.wait();
        console.log(`Account ${accounts[1].address} registered as Arachyl on Target Chain!`);
    });

    it("TargetChain smartcontract works", async () => {
        //
        // deposit test
        //

        // 1. approve
        let apprTx = await testToken_1.approve(targetChain.address, testTokenSupply).catch(console.error);
        await apprTx.wait();
        console.log(`TargetChain appoved to spend some token`);

        // 2. deposit into
        let nonWeiDeposit = "2";
        let depositAmount = utils.parseEther(nonWeiDeposit);
        let depTx = await targetChain.deposit(testToken_1.address, depositAmount);
        await depTx.wait();
        console.log(`User ${accounts[0].address} deposited ${nonWeiDeposit} of ${testToken_1.address} token`);

        let targetBalance = await testToken_1.balanceOf(targetChain.address).catch(console.error);
        console.log(`target chain ${targetBalance} == ${depositAmount}`)

        //
        // withdraw test
        //

        // 1. sign
        let sig = await signWithdraw(accounts[0].address, testToken_1.address, depositAmount, accounts[1]);
        console.log(`Signature was generated`);

        // 2. withdraw
        let withdrawParams = [
            testToken_1.address,
            depositAmount,
            sig[0],
            sig[1],
            sig[2]
        ];
        console.log(`Account 0: ${accounts[0].address}`);
        let withTx = await targetChain.withdraw(withdrawParams).catch(console.error);
        await withTx.wait();
        console.log(`User successfully withdrew his tokens from TargetChain!`);
    });

    //does not wait a week to see if session is closed
    it("user creates an lp token", async () => {
        // parameters
        let tokens = [testToken_1.address, testToken_2.address];
        let amounts = [amount_1, amount_2];    

        const apprTx = await testToken_1.approve(factory.address, testTokenSupply, {from: accounts[0].address});
        await apprTx.wait();
        console.log(`Approved to spend Test Token 1 by factory`);

        let sig = await signCreation(accounts[0].address, tokens, amounts, accounts[1]);
        console.log(`Signature generated`);

        let params = [
            tokens,
            amounts,
            sig[0],
            sig[1],
            sig[2]
        ]

        let tx = await factory.create(params);
        let res = await tx.wait();
        console.log(`Factory was created`);

        for (var event of res.events) {
            if (!event.event || event.event !== 'PairCreated') {
                continue;
            }

            pairAddr = '0x' + event.topics[3].substr(26);
            break;
        }

        const Pair = await ethers.getContractFactory("Pair");
        pair = await Pair.attach(pairAddr)

        console.log(`User ${accounts[0].address} created LP in factory ${factory.address}`);
        console.log(`Created pair address is ${pairAddr}`);
    });

    it("user adds to lp token", async () => {
        // parameters
        let amounts = [amount_1, amount_2];    

        const apprTx = await testToken_1.approve(pair.address, testTokenSupply, {from: accounts[0].address});
        await apprTx.wait();
        console.log(`Approved to spend Test Token 1 by factory`);

        let sig = await signAddition(accounts[0].address, amounts, accounts[1]);
        console.log(`Signature generated`);

        let preBalance = await pair.balanceOf(accounts[0].address);
        console.log(`Before addition, user ${accounts[0].address} owned LP ${preBalance}`);

        let params = [
            amounts[0],
            amounts[1],
            sig[0],
            sig[1],
            sig[2]
        ]

        let tx = await pair.mint(params);
        await tx.wait();
        console.log(`LP was added`);

        let postBalance = await pair.balanceOf(accounts[0].address);
        console.log(`After addition, user ${accounts[0].address} owned LP ${postBalance}`);
    });

    it("user removes to lp token", async () => {
        // parameters
        let amount = amount_1;      // 1 LP = Math.sqrt(amount * amount)
                                    // user added 200 of each token. so he has 200 LP tokens.
                                    // We cat half of it, which is amount_1 == 100.

        let preBalance = await pair.balanceOf(accounts[0].address);
        console.log(`Before removal, user ${accounts[0].address} owned LP ${preBalance}`);

        let tx = await pair.burn(amount);
        await tx.wait();
        console.log(`LP was removed. Now you can call TargetChain.withdraw() function to claim tokens`);

        let postBalance = await pair.balanceOf(accounts[0].address);
        console.log(`After removal, user ${accounts[0].address} owned LP ${postBalance}`);
    });

    it("user swaps token on this blockchain to target blockchain", async () => {
        // parameters
        let testToken_2_amountOut = utils.parseEther("10");
        
        let sig = await signTargetSwap(accounts[0].address, testToken_2_amountOut, accounts[1]);
        console.log(`Signature generated`);

        let preTest1_balance = await testToken_1.balanceOf(accounts[0].address);
        console.log(`Before swap, user ${accounts[0].address} owned ${preTest1_balance}`);

        let params = [
            testToken_2_amountOut,
            sig[0],
            sig[1],
            sig[2]
        ]

        let tx = await pair.swapToTarget(params);
        await tx.wait();
        console.log(`Token 1 was swapped to token 2.`);

        let postTest1_balance = await testToken_1.balanceOf(accounts[0].address);
        console.log(`After swap, user ${accounts[0].address} owned ${postTest1_balance}`);
    });
});