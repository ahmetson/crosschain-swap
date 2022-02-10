"use strict";

/**
 * nav: Provider 
 * process: Creation
 * 
 * Listen events of process step update.
 */


/**
 * Show the UI. Unless user didn't have the data set on.
 * 
 * Then move to the next page.
 * 
 * @param {cache-js.STEP} step 
 * @param {} data 
 */
let showProviderCreate = function(step, data) {
    // 
    //  Source
    //
    let sourceConf = getSourceConf();
    
    let sourceChainName = document.getElementById("provider-create-source-name");
    sourceChainName.setAttribute("value", sourceConf.name);

    let sourceList = document.getElementById("provider-create-source-list")
    sourceList.textContent = "";

    for (var token of sourceConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        sourceList.appendChild(option);
    }

    let targetConf = getTargetConf();

    let targetChainName = document.getElementById("provider-create-target-name");
    targetChainName.setAttribute("value", targetConf.name);

    let targetList = document.getElementById("provider-create-target-list")
    targetList.textContent = "";

    for (var token of targetConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        targetList.appendChild(option);
    }

    // show first step button on process
    if (step === null || step === STEP.APPROVE_TARGET) {
        createInitProcess();
    } else if (step === STEP.DEPOSIT) {
        createDepositProcess(data);
    } else if (step === STEP.BLOCK_WAITING) {
        createWaitingProcess(data);
    } else if (step === STEP.APPROVE_SOURCE) {
        createApproveSourceProcess();
    } else if (step === STEP.SIG) {
        createWaitingSigProcess(data);
    } else if (step === STEP.ACTION) {
        createFinalProcess(data);
    }
};

let createInitProcess = function() {
    let btns = getCreateBtns();
    
    // show
    enableBtn(btns['approveTarget'], onCreateTargetApprove);

    // the rest are hided
    disableBtn(btns['depositTarget'], alert);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    btns['approveSource'].style.display = "none";
    btns['create'].style.display = "none";
}

let createDepositProcess = function() {
    let btns = getCreateBtns();
    
    // show
    disableBtn(btns['approveTarget'], onCreateTargetApprove);

    // the rest are hided
    enableBtn(btns['depositTarget'], onCreateTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    btns['approveSource'].style.display = "none";
    btns['create'].style.display = "none";
}

let createWaitingProcess = function() {
    let btns = getCreateBtns();
    
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    disableBtn(btns['approveTarget'], onCreateTargetApprove);
    disableBtn(btns['depositTarget'], onCreateTargetDeposit);
    btns['waiting'].style.display = "";
    btns['waitingBlocks'].style.display = "";

    if (!data.blockNumber) {
        return printErrorMessage(`Missing the block number. Please start from beginning`);
    }

    let interval = setInterval(async () => {
        let currentBlockNumber = await web3.eth.getBlockNumber();

        if (currentBlockNumber - data.blockNumber > 12) {
            clearInterval(interval);

            let nextStep = getProviderCreateNextStep(STEP.BLOCK_WAITING)
            setProcessStep(NAV.PROVIDER, PROCESS.CREATE, nextStep, data);
            showProviderCreate(nextStep, data);
        } else {
            let left = currentBlockNumber - data.blockNumber;
            btns['waitingBlocks'].innerText = left;
        }
    }, 1000);
    btns['waitingSig'].style.display = "none";
    btns['approveSource'].style.display = "none";
    btns['create'].style.display = "none";
}

let createApproveSourceProcess = function() {
    let btns = getCreateBtns();
    
    disableBtn(btns['approveTarget'], onCreateTargetApprove);
    disableBtn(btns['depositTarget'], onCreateTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    enableBtn(btns['approveSource'], onCreateSourceApprove);
    btns['create'].style.display = "none";
}

let createWaitingSigProcess = async function() {
    let btns = getCreateBtns();
    
    disableBtn(btns['approveTarget'], onCreateTargetApprove);
    disableBtn(btns['depositTarget'], onCreateTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "";
    disableBtn(btns['approveSource'], onCreateSourceApprove);
    btns['create'].style.display = "none";

    await fetchCreateSig();
}

let createFinalProcess = function() {
    let btns = getCreateBtns();
    
    // show
    disableBtn(btns['approveTarget'], onCreateTargetApprove);

    // the rest are hided
    disableBtn(btns['depositTarget'], onCreateTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['approveSource'], onCreateSourceApprove);
    enableBtn(btns['create'], onCreate);
}

let getCreateBtns = function() {
    return {
        approveTarget: document.getElementById("btn-create-approve-target"),
        depositTarget: document.getElementById("btn-create-deposit-target"),
        waiting: document.getElementById("btn-create-waiting"),
        waitingBlocks: document.getElementById("provider-create-left-blocks"),
        waitingSig: document.getElementById("btn-create-sig"),
        approveSource: document.getElementById("btn-create-approve-source"),
        create: document.getElementById("btn-create")
    }
}

let onCreateTargetApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onCreateTargetApprove);

    let nextStep = getProviderCreateNextStep(STEP.APPROVE_TARGET)

    // check that user is in the source chain.
    if (isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onCreateTargetApprove);

        let errMessage = `You are on ${getSourceConf().name}' network. Please switch to '${getTargetConf().name}'`;

        return printErrorMessage(errMessage,  onCreateTargetApprove);
    }

    let targetTokenAmount = parseFloat(document.getElementById('provider-create-target-amount').value);
    if (isNaN(targetTokenAmount)) {
        return printErrorMessage(`Invalid Target Amount`);
    }
    let targetTokenAmountWei = web3.utils.toWei(targetTokenAmount.toString());

    let sourceTokenEl = document.getElementById('provider-create-source-list');
    let sourceTokenAmount = parseFloat(document.getElementById('provider-create-source-amount').value);
    let targetTokenEl = document.getElementById('provider-create-target-list');
    
    window.tokens[targetTokenEl.value].methods.approve(window.xdex._address, targetTokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Approving...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Approved", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            // get next position:
            // save source token, target token, user, source amount, target amount
            let data = {
                sourceToken: sourceTokenEl.value,
                sourceAmount: sourceTokenAmount,
                targetToken: targetTokenEl.value,
                targetAmount: targetTokenAmount,
                selectedAccount: window.selectedAccount
            }
            setProcessStep(NAV.PROVIDER, PROCESS.CREATE, nextStep, data);
            showProviderCreate(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onCreateSourceApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onCreateSourceApprove);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onCreateSourceApprove);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onCreateSourceApprove);
    }

    let tokenAmountWei = web3.utils.toWei(data.sourceAmount.toString());
    
    window.tokens[data.sourceToken].methods.approve(window.xdex._address, tokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Approving...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Approved", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            let nextStep = getProviderCreateNextStep(STEP.APPROVE_SOURCE)
            setProcessStep(NAV.PROVIDER, PROCESS.CREATE, nextStep, data);
            showProviderCreate(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onCreateTargetDeposit = async function() {
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;
    let targetTokenAmountWei = web3.utils.toWei(data.targetAmount.toString());

    window.xdex.methods.deposit(data.targetToken, targetTokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            data.hash = hash;

            showToast("Depositing...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Deposited", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            data.blockNumber = receipt.blockNumber;

            let nextStep = getProviderCreateNextStep(STEP.DEPOSIT)
            setProcessStep(NAV.PROVIDER, PROCESS.CREATE, nextStep, data);
            showProviderCreate(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let onCreate = async function() {
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let params = [
        [data.araResponse.source_token_address, data.araResponse.target_token_address],
        [web3.utils.toWei(data.araResponse.sourceAmount), web3.utils.toWei(data.araResponse.targetAmount)],
        data.araResponse.sig_v, data.araResponse.sig_r, data.araResponse.sig_s
    ]

    window.xdex.methods.create(params)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Creating...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Created", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            clearProcessStep();
            let nextStep = getProviderCreateNextStep(STEP.ACTION)
            showProviderCreate(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let fetchCreateSig = async function() {
    let targetId = parseInt(getSourceConf().pairedTo);
    let sourceId = parseInt(getTargetConf().pairedTo);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let type = 'create-lp';
    let params = {
        "txid": cacheDetail.data.hash,
        "sourceChainId": sourceId,
        "sourceTokenAddress": cacheDetail.data.sourceToken,
        "sourceAmount": web3.utils.toWei(cacheDetail.data.sourceAmount.toString()),
        "targetChainId": targetId
    }

    try {
        let araResponse = await fetchSig(type, params);

        if (araResponse.status === 'ERROR') {
            printErrorMessage(araResponse.message);
        } else {
            if (selectedAccount !== araResponse.wallet_address) {
                return printErrorMessage(`Signature returned for ${araResponse.wallet_address}`);
            }

            data.araResponse = araResponse;

            let nextStep = getProviderCreateNextStep(STEP.SIG)
            setProcessStep(NAV.PROVIDER, PROCESS.CREATE, nextStep, cacheDetail.data);
            showProviderCreate(nextStep, cacheDetail.data);
        }
    } catch (error) {
        printErrorMessage(error);
    }
}

/**
 * listen for events
 */
window.addEventListener('load', async () => {
    let content = document.getElementById('myTabContent');

    // Create a new event, allow bubbling, and provide any data you want to pass to the "detail" property
    content.addEventListener(`${NAV.PROVIDER}.${PROCESS.CREATE}`, async (e) => {
        showProviderCreate(e.detail.step, e.detail.data)
    })
});
