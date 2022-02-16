"use strict";

/**
 * nav: Provider 
 * process: Addition
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
let showProviderAdd = function(step, data) {
    // 
    //  Source
    //
    let sourceConf = getSourceConf();
    
    let sourceChainName = document.getElementById("provider-add-source-name");
    sourceChainName.setAttribute("value", sourceConf.name);

    let sourceList = document.getElementById("provider-add-source-list")
    sourceList.textContent = "";

    for (var token of sourceConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        sourceList.appendChild(option);
    }

    let targetConf = getTargetConf();

    let targetChainName = document.getElementById("provider-add-target-name");
    targetChainName.setAttribute("value", targetConf.name);

    let targetList = document.getElementById("provider-add-target-list")
    targetList.textContent = "";

    for (var token of targetConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        targetList.appendChild(option);
    }

    // show first step button on process
    if (step === null || step === STEP.APPROVE_TARGET) {
        addInitProcess();
    } else if (step === STEP.DEPOSIT) {
        addDepositProcess(data);
    } else if (step === STEP.BLOCK_WAITING) {
        addWaitingProcess(data);
    } else if (step === STEP.APPROVE_SOURCE) {
        addApproveSourceProcess();
    } else if (step === STEP.SIG) {
        addWaitingSigProcess(data);
    } else if (step === STEP.ACTION) {
        addFinalProcess(data);
    }
};

let addInitProcess = function() {
    let btns = getAddBtns();
    
    enableBtn(btns['approveTarget'], onAddTargetApprove);
    disableBtn(btns['depositTarget'], onAddTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    btns['approveSource'].style.display = "none";
    btns['add'].style.display = "none";
}

let addDepositProcess = function() {
    let btns = getAddBtns();
    
    disableBtn(btns['approveTarget'], onAddTargetApprove);
    enableBtn(btns['depositTarget'], onAddTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    btns['approveSource'].style.display = "none";
    btns['add'].style.display = "none";
}

let addWaitingProcess = function() {
    let btns = getAddBtns();
    
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    disableBtn(btns['approveTarget'], onAddTargetApprove);
    disableBtn(btns['depositTarget'], onAddTargetDeposit);
    btns['waiting'].style.display = "";
    btns['waitingBlocks'].style.display = "";

    if (!data.blockNumber) {
        return printErrorMessage(`Missing the block number. Please start from beginning`);
    }

    let interval = setInterval(async () => {
        let currentBlockNumber = await web3.eth.getBlockNumber();

        if (currentBlockNumber - data.blockNumber > 12) {
            clearInterval(interval);

            let nextStep = getProviderAddNextStep(STEP.BLOCK_WAITING)
            setProcessStep(NAV.PROVIDER, PROCESS.ADD, nextStep, data);
            showProviderAdd(nextStep, data);
        } else {
            let left = currentBlockNumber - data.blockNumber;
            btns['waitingBlocks'].innerText = left;
        }
    }, 1000);
    btns['waitingSig'].style.display = "none";
    btns['approveSource'].style.display = "none";
    btns['add'].style.display = "none";
}

let addApproveSourceProcess = function() {
    let btns = getAddBtns();
    
    disableBtn(btns['approveTarget'], onAddTargetApprove);
    disableBtn(btns['depositTarget'], onAddTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    enableBtn(btns['approveSource'], onAddSourceApprove);
    btns['add'].style.display = "none";
}

let addWaitingSigProcess = async function() {
    let btns = getAddBtns();
    
    disableBtn(btns['approveTarget'], onAddTargetApprove);
    disableBtn(btns['depositTarget'], onAddTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "";
    disableBtn(btns['approveSource'], onAddSourceApprove);
    btns['add'].style.display = "none";

    await fetchAddSig();
}

let addFinalProcess = function() {
    let btns = getAddBtns();
    
    // show
    disableBtn(btns['approveTarget'], onAddTargetApprove);

    // the rest are hided
    disableBtn(btns['depositTarget'], onAddTargetDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['approveSource'], onAddSourceApprove);
    enableBtn(btns['add'], onAdd);
}

let getAddBtns = function() {
    return {
        approveTarget: document.getElementById("btn-add-approve-target"),
        depositTarget: document.getElementById("btn-add-deposit-target"),
        waiting: document.getElementById("btn-add-waiting"),
        waitingBlocks: document.getElementById("provider-add-left-blocks"),
        waitingSig: document.getElementById("btn-add-sig"),
        approveSource: document.getElementById("btn-add-approve-source"),
        add: document.getElementById("btn-add")
    }
}

let onAddTargetApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onAddTargetApprove);

    let nextStep = getProviderAddNextStep(STEP.APPROVE_TARGET)

    // check that user is in the source chain.
    if (isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onAddTargetApprove);

        let errMessage = `You are on ${getSourceConf().name}' network. Please switch to '${getTargetConf().name}'`;

        return printErrorMessage(errMessage,  onAddTargetApprove);
    }

    let targetTokenAmount = parseFloat(document.getElementById('provider-add-target-amount').value);
    if (isNaN(targetTokenAmount)) {
        return printErrorMessage(`Invalid Target Amount`);
    }
    let targetTokenAmountWei = web3.utils.toWei(targetTokenAmount.toString());

    let sourceTokenEl = document.getElementById('provider-add-source-list');
    let sourceTokenAmount = parseFloat(document.getElementById('provider-add-source-amount').value);
    let targetTokenEl = document.getElementById('provider-add-target-list');
    
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
            setProcessStep(NAV.PROVIDER, PROCESS.ADD, nextStep, data);
            showProviderAdd(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onAddSourceApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onAddSourceApprove);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onAddSourceApprove);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onAddSourceApprove);
    }

    let tokenAmountWei = web3.utils.toWei(data.sourceAmount.toString());
    
    window.tokens[data.sourceToken].methods.approve(window.xdex._address, tokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Approving...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Approved", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            let nextStep = getProviderAddNextStep(STEP.APPROVE_SOURCE)
            setProcessStep(NAV.PROVIDER, PROCESS.ADD, nextStep, data);
            showProviderAdd(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onAddTargetDeposit = async function() {
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

            let nextStep = getProviderAddNextStep(STEP.DEPOSIT)
            setProcessStep(NAV.PROVIDER, PROCESS.ADD, nextStep, data);
            showProviderAdd(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let onAdd = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onAdd);

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onAdd);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onAdd);
    }

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let pairAddress = await xdex.methods.getPair(data.araResponse.source_token_address, data.araResponse.target_token_address).call();
    let empty = '0x0000000000000000000000000000000000000000';

    if (pairAddress === empty) {
        let errMessage = `The pair of ${sourceToken.value}-${targetToken.value} doesn't exist. please create it.`;

        return printErrorMessage(errMessage);
    }

    // now load the pair contract.
    loadPair(pairAddress);

    let params = [
        web3.utils.toWei(data.araResponse.sourceAmount.toString()), 
        web3.utils.toWei(data.araResponse.targetAmount.toString()),
        data.araResponse.sig_v, data.araResponse.sig_r, data.araResponse.sig_s
    ]

    window.pair.methods.mint(params)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Adding...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Added", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            clearProcessStep();
            let nextStep = getProviderAddNextStep(STEP.ACTION)
            showProviderAdd(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let fetchAddSig = async function() {
    let targetId = parseInt(getSourceConf().pairedTo);
    let sourceId = parseInt(getTargetConf().pairedTo);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let type = 'add-lp';
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

            let nextStep = getProviderAddNextStep(STEP.SIG)
            setProcessStep(NAV.PROVIDER, PROCESS.ADD, nextStep, cacheDetail.data);
            showProviderAdd(nextStep, cacheDetail.data);
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

    content.addEventListener(`${NAV.PROVIDER}.${PROCESS.ADD}`, async (e) => {
        showProviderAdd(e.detail.step, e.detail.data)
    })
});
