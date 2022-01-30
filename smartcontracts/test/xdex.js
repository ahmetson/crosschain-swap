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

    // fees
    let pairCreationFee = 0;
    let forArachyls = 0;
    let gasPrice = 0;

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

    async function signSwap(user, amounts, signer) {
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

    async function signFee(factoryAddr, prevTimestamp, pairCreation, forArachyls, signer) {
        // address(this), feeTimestamp, _pairCreation, _forArachyls
        //v, r, s related stuff
        let bytes32 = utils.defaultAbiCoder.encode(["uint256", "uint256", "uint256"], [prevTimestamp, pairCreation, forArachyls]);
        let str = factoryAddr + bytes32.substr(2);
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

        // Fee Vault - from user to arachyls
        // const FeeVault = await ethers.getContractFactory("FeeVault");
        // console.log(`Deploy fee vault with factory ${factory.address}`);
        // feeVault = await FeeVault.deploy(factory.address);

        // console.log(`Setting Link to Fee Vault in Factory...`);
        // factory.setFeeVault(feeVault.address);
        // console.log(`Set successfully!`);

        // const transferTx = await crowns.transfer(player.address, testTokenSupply, {from: gameOwner.address});
        // await transferTx.wait();

        // const addEditorTx = await tier.addEditor(gameOwner.address, {from: gameOwner.address});
        // await addEditorTx.wait();

        // expect(await tier.editors(gameOwner.address)).to.be.true;
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
        let testToken_1_amountOut = utils.parseEther("0");
        let testToken_2_amountOut = utils.parseEther("10");
        let testToken0            = utils.parseEther("12");
        let amountOuts = [testToken_1_amountOut, testToken_2_amountOut];
        
        let sig = await signSwap(accounts[0].address, amountOuts, accounts[1]);
        console.log(`Signature generated`);

        let preTest1_balance = await testToken_1.balanceOf(accounts[0].address);
        console.log(`Before swap, user ${accounts[0].address} owned ${preTest1_balance}`);

        // let transTx = await testToken_1.transfer(pair.address, testToken0);
        // await transTx.wait();
        // console.log(`Tokens were transferred to Pair contract.`);

        let params = [
            testToken_1_amountOut,
            testToken_2_amountOut,
            sig[0],
            sig[1],
            sig[2]
        ]

        let tx = await pair.swap(params);
        await tx.wait();
        console.log(`Token 1 was swapped to token 2.`);

        let postTest1_balance = await testToken_1.balanceOf(accounts[0].address);
        console.log(`After swap, user ${accounts[0].address} owned ${postTest1_balance}`);
    });

    // it("approve the creation", async () => {   
    //     const Pair = await ethers.getContractFactory("Pair");
    //     pair = await Pair.attach(pairAddr);
     
    //     let arachyls = [accounts[1].address, accounts[2].address];
        
    //     let sig_1 = await signCreation(pairAddr, 1, accounts[1]);
    //     let sig_2 = await signCreation(pairAddr, 1, accounts[2]);
        
    //     let v = [sig_1[0], sig_2[0]];
    //     let r = [sig_1[1], sig_2[1]];
    //     let s = [sig_1[2], sig_2[2]];

    //     let apprCreationTx = await pair.connect(accounts[1]).approveCreation(arachyls, v, r, s);
    //     await apprCreationTx.wait();

    //     let mintedAmount = await pair.balanceOf(accounts[0].address);
    //     console.log(`Minted tokens amount for user ${utils.formatEther(mintedAmount)}`)
    // });

    // it("update fee", async () => {    
    //     // parameters
    //     let tokens = [testToken_1.address, testToken_2.address];
    //     let amounts = [amount_1, amount_2];    

    //     const apprTx = await testToken_1.approve(factory.address, testTokenSupply, {from: accounts[0].address});
    //     await apprTx.wait();
    //     console.log(`Approved to spend Test Token 1 by factory`);

    //     gasPrice = await ethers.provider.getGasPrice();
    //     gasPrice = gasPrice.mul(ethers.BigNumber.from("15"));
    //     console.log(`Gas Price: ${utils.formatUnits(gasPrice, 'ether')}`);

    //     // actually it should be approveCreation fee.
    //     pairCreationFee = gasPrice.mul(pairCreationFee).mul(ethers.BigNumber.from("5")).div(ethers.BigNumber.from("10"));
    //     console.log(`Fee user pair creation: ${utils.formatUnits(pairCreationFee, 'ether')}`);
        
    //     let factoryAddr = factory.address;
    //     let prevTimestamp = await factory.feeTimestamp(); prevTimestamp = parseInt(prevTimestamp);

    //     forArachyls = await factory.feeForArachyls();
    //     let sig_1 = await signFee(factoryAddr, prevTimestamp, pairCreationFee, forArachyls, accounts[1]);
    //     let sig_2 = await signFee(factoryAddr, prevTimestamp, pairCreationFee, forArachyls, accounts[2]);
        
    //     let arachyls = [accounts[1].address, accounts[2].address];

    //     let v = [sig_1[0], sig_2[0]];
    //     let r = [sig_1[1], sig_2[1]];
    //     let s = [sig_1[2], sig_2[2]];

    //     forArachyls = await factory.estimateGas.feeUpdate(pairCreationFee, forArachyls, arachyls, v, r, s);
    //     forArachyls = gasPrice.mul(forArachyls).div(ethers.BigNumber.from("10"));
    //     console.log(`Fee update: ${utils.formatUnits(forArachyls, 'ether')}`);

    //     sig_1 = await signFee(factoryAddr, prevTimestamp, pairCreationFee, forArachyls, accounts[1]);
    //     sig_2 = await signFee(factoryAddr, prevTimestamp, pairCreationFee, forArachyls, accounts[2]);

    //     v = [sig_1[0], sig_2[0]];
    //     r = [sig_1[1], sig_2[1]];
    //     s = [sig_1[2], sig_2[2]];

    //     console.log(`Updating fees...`);
    //     let feeTx = await factory.feeUpdate(pairCreationFee, forArachyls, arachyls, v, r, s);
    //     await feeTx.wait();
    //     console.log(`Fee updated!`);
    // });
});