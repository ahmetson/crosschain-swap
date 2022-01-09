const { expect } = require("chai");
const { ethers } = require("hardhat");
const { utils } = require("ethers")

describe("Pair Creation", async () => {
    //game data
    let testTokenSupply = utils.parseEther("10000");

    let amount_1 = utils.parseEther("100");
    let amount_2 = utils.parseEther("100");

    // imported contracts
    let testToken_1 = null;
    let testToken_2 = null;
    let factory     = null;
    let pair        = null;

    //session & accounts data
    let pairAddr = null;
    let accounts = null;

    let chainID = null;

    async function signCreation(pairAddr, state, signer) {
        //v, r, s related stuff
        let bytes32 = utils.defaultAbiCoder.encode(["uint256"], [state]);
        let str = pairAddr + bytes32.substr(2);
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
        accounts = await ethers.getSigners();

        chainID             = await accounts[0].getChainId();
        
        // Test tokens
        const TestToken = await ethers.getContractFactory("ERC20");
        testToken_1 = await TestToken.deploy(testTokenSupply);    /// Argument 1 means deploy in Test mode
        await testToken_1.deployed();
        testToken_2 = await TestToken.deploy(testTokenSupply);    /// Argument 1 means deploy in Test mode
        await testToken_2.deployed();

        // Factory
        let feeToSetter = accounts[0].address; 
        const Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy(feeToSetter, chainID + 1);

        // const transferTx = await crowns.transfer(player.address, testTokenSupply, {from: gameOwner.address});
        // await transferTx.wait();

        // const addEditorTx = await tier.addEditor(gameOwner.address, {from: gameOwner.address});
        // await addEditorTx.wait();

        // expect(await tier.editors(gameOwner.address)).to.be.true;
    });

    it("register arachyls", async () => {
        let regTx = await factory.connect(accounts[1]).verifierRegistration().catch(console.error);
        await regTx.wait();
        console.log(`Account ${accounts[1].address} registered as Arachyl!`);

        regTx = await factory.connect(accounts[2]).verifierRegistration().catch(console.error);
        await regTx.wait();
        console.log(`Account ${accounts[2].address} registered as Arachyl!`);

        regTx = await factory.connect(accounts[3]).verifierRegistration().catch(console.error);
        await regTx.wait();
        console.log(`Account ${accounts[3].address} registered as Arachyl!`);

        // let [v, r, s] = await signBadge(player, nonce, level, chainID, tier.address);

        // try {
            // let claimTx = await tier.connect(player).claim(level, v, r, s);
            // await claimTx.wait();
        // } catch(e) {
        //   expect(e.reason).to.equal("transaction failed");//LighthouseTier: LEVEL_MISMATCH");
        // }
    });

    //does not wait a week to see if session is closed
    it("user initializes the LP creation", async () => {
        // parameters
        let tokens = [testToken_1.address, testToken_2.address];
        let amounts = [amount_1, amount_2];    

        const apprTx = await testToken_1.approve(factory.address, testTokenSupply, {from: accounts[0].address});
        await apprTx.wait();
        console.log(`Approved to spend Test Token 1 by factory`);

        let initTx = await factory.initializeCreation(tokens, amounts);
        let res = await initTx.wait();

        for (var event of res.events) {
            if (!event.event || event.event !== 'PairCreated') {
                continue;
            }

            pairAddr = '0x' + event.topics[3].substr(26);
            break;
        }

        console.log(`User ${accounts[0].address} initializes an LP creation in factory ${factory.address}`);
        console.log(`Created pair address is ${pairAddr}`);
    });

    it("approve the creation", async () => {   
        const Pair = await ethers.getContractFactory("Pair");
        pair = await Pair.attach(pairAddr);
     
        let arachyls = [accounts[1].address, accounts[2].address];
        
        let sig_1 = await signCreation(pairAddr, 1, accounts[1]);
        let sig_2 = await signCreation(pairAddr, 1, accounts[2]);
        
        let v = [sig_1[0], sig_2[0]];
        let r = [sig_1[1], sig_2[1]];
        let s = [sig_1[2], sig_2[2]];

        let apprCreationTx = await pair.connect(accounts[1]).approveCreation(arachyls, v, r, s);
        await apprCreationTx.wait();
    });

});