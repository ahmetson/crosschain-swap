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
let showUserSwapToTarget = function(step, data) {
    // 
    //  Source
    //
    let sourceConf = getSourceConf();
    
    let sourceChainName = document.getElementById("user-swap-to-target-source-name");
    sourceChainName.setAttribute("value", sourceConf.name);

    let sourceList = document.getElementById("user-swap-to-target-source-list")
    sourceList.textContent = "";

    for (var token of sourceConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        sourceList.appendChild(option);
    }

    let targetConf = getTargetConf();

    let targetChainName = document.getElementById("user-swap-to-target-target-name");
    targetChainName.setAttribute("value", targetConf.name);

    let targetList = document.getElementById("user-swap-to-target-target-list")
    targetList.textContent = "";

    for (var token of targetConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        targetList.appendChild(option);
    }

    // show first step button on process
    if (step === null || step === STEP.APPROVE_SOURCE) {
        swapToTargetApproveSourceProcess();
    } else if (step === STEP.ACTION) {
        swapToTargetSwapProcess();
    } else if (step === STEP.BLOCK_WAITING) {
        swapToTargetWaitingProcess(data);
    } else if (step === STEP.SIG) {
        swapToTargetSigProcess(data);
    } else if (step === STEP.WITHDRAW) {
        swapToTargetWithdrawProcess(data);
    }
};

/**
 * First step of the process
 */
let swapToTargetApproveSourceProcess = function() {
    let btns = getToTargetBtns();

    enableBtn(btns['approveSource'], onSwapToTargetSourceApprove);
    disableBtn(btns['withdraw'], onSwapToTargetWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['swap'], onSwapToTargetSwap);
}

/**
 * Second step of the process
 */
let swapToTargetSwapProcess = function() {
    let btns = getToTargetBtns();
    
    disableBtn(btns['approveSource'], onSwapToTargetSourceApprove);
    enableBtn(btns['swap'], onSwapToTargetSwap);
    disableBtn(btns['withdraw'], onSwapToTargetWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
}

/**
 * Third step of the process
 */
let swapToTargetWaitingProcess = function() {
    let btns = getToTargetBtns();
    
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    disableBtn(btns['approveSource'], onSwapToTargetSourceApprove);
    disableBtn(btns['withdraw'], onSwapToTargetWithdraw);
    btns['waiting'].style.display = "";
    btns['waitingBlocks'].style.display = "";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['swap'], onSwapToTargetSwap);

    if (!data.blockNumber) {
        return printErrorMessage(`Missing the block number. Please start from beginning`);
    }

    let interval = setInterval(async () => {
        let currentBlockNumber = await web3.eth.getBlockNumber();

        if (currentBlockNumber - data.blockNumber > 12) {
            clearInterval(interval);

            let nextStep = getSwapToTargetNextStep(STEP.BLOCK_WAITING)
            setProcessStep(NAV.USER, PROCESS.SWAP_TARGET, nextStep, data);
            showUserSwapToTarget(nextStep, data);
        } else {
            let left = currentBlockNumber - data.blockNumber;
            btns['waitingBlocks'].innerText = left;
        }
    }, 1000);
}

/**
 * Fourth step of the process
 */
let swapToTargetSigProcess = async function() {
    let btns = getToTargetBtns();

    disableBtn(btns['approveSource'], onSwapToTargetSourceApprove);
    disableBtn(btns['withdraw'], onSwapToTargetWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "";
    disableBtn(btns['swap'], onSwapToTargetSwap);

    await fetchSwapToTargetSig();
}

/**
 * Fifth (final) step of the process
 */
let swapToTargetWithdrawProcess = function() {
    let btns = getToTargetBtns();
    
    disableBtn(btns['approveSource'], onSwapToTargetSourceApprove);
    enableBtn(btns['withdraw'], onSwapToTargetWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['swap'], onSwapToTargetSwap);
}

let getToTargetBtns = function() {
    return {
        approveSource: document.getElementById("btn-user-swap-to-target-approve-source"),
        withdraw: document.getElementById("btn-user-swap-to-target-withdraw"),
        waiting: document.getElementById("btn-user-swap-to-target-waiting"),
        waitingBlocks: document.getElementById("btn-user-swap-to-target-block"),
        waitingSig: document.getElementById("btn-user-swap-to-target-sig"),
        swap: document.getElementById("btn-user-swap-to-target-action")
    }
}

let onSwapToTargetSourceApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onSwapToTargetSourceApprove);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onSwapToTargetSourceApprove);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onSwapToTargetSourceApprove);
    }

    let amount = parseFloat(document.getElementById('user-swap-to-target-source-amount').value);
    if (isNaN(amount)) {
        return printErrorMessage(`Invalid Source Amount`);
    }
    let amountWei = web3.utils.toWei(amount.toString());

    let sourceTokenEl = document.getElementById('user-swap-to-target-source-list');
    let targetTokenEl = document.getElementById('user-swap-to-target-target-list');

    let pairAddress = await xdex.methods.getPair(sourceTokenEl.value, targetTokenEl.value).call();
    let empty = '0x0000000000000000000000000000000000000000';

    if (pairAddress === empty) {
        let errMessage = `The pair of ${sourceTokenEl.value}-${targetTokenEl.value} doesn't exist. please create it.`;

        return printErrorMessage(errMessage);
    }

    // now load the pair contract.
    loadPair(pairAddress);

    window.tokens[sourceTokenEl.value].methods.approve(window.pair._address, amountWei)
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
                targetToken: targetTokenEl.value,
                pairAddress: pairAddress,
                sourceAmount: amount,
                selectedAccount: window.selectedAccount
            }

            let nextStep = getSwapToTargetNextStep(STEP.APPROVE_SOURCE)
            setProcessStep(NAV.USER, PROCESS.SWAP_TARGET, nextStep, data);
            showUserSwapToTarget(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onSwapToTargetSwap = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onAdd);

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onAdd);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onAdd);
    }

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    // now load the pair contract.
    loadPair(data.pairAddress);

    let params = [
        web3.utils.toWei(data.sourceAmount.toString()), 
        28, "0x753ee6b8cf90b180c43076a3cad6e0677af32cf8fccd11b94c23ba6a0edd7ddb", "0x69aaf9f2ac858d4bc72d12311e01431f28ff2fc23816c6966caa2c926fa728a0"
    ]

    window.pair.methods.swapToTarget(params)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            data.hash = hash;

            showToast("Swapping...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Swapped", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            data.blockNumber = receipt.blockNumber;

            let nextStep = getSwapToTargetNextStep(STEP.ACTION)
            setProcessStep(NAV.USER, PROCESS.SWAP_TARGET, nextStep, data);

            showUserSwapToTarget(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let fetchSwapToTargetSig = async function() {
    let targetId = parseInt(getSourceConf().pairedTo);
    let sourceId = parseInt(getTargetConf().pairedTo);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let type = 'swap/to-target';
    let params = {
        "txid": cacheDetail.data.hash,
        "sourceChainId": sourceId,
        "targetChainId": targetId
    }

    try {
        let araResponse = await fetchSig(type, params);

        if (araResponse.status === 'ERROR') {
            printErrorMessage(araResponse.message);
        } else {
            if (selectedAccount.toLowerCase() !== araResponse.wallet_address.toLowerCase()) {
                return printErrorMessage(`Signature returned for ${araResponse.wallet_address}`);
            }

            data.araResponse = araResponse;

            let nextStep = getSwapToTargetNextStep(STEP.SIG)
            setProcessStep(NAV.USER, PROCESS.SWAP_TARGET, nextStep, data);
            showUserSwapToTarget(nextStep, cacheDetail.data);
        }
    } catch (error) {
        printErrorMessage(error);
    }
}


let onSwapToTargetWithdraw = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onSwapToTargetWithdraw);

    // check that user is in the source chain.
    if (isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onSwapToTargetWithdraw);

        let errMessage = `You are on ${getSourceConf().name}' network. Please switch to '${getTargetConf().name}'`;

        return printErrorMessage(errMessage,  onSwapToTargetWithdraw);
    }


    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let params = [
        data.araResponse.target_token_address,
        web3.utils.toWei(data.araResponse.targetAmount), 
        data.araResponse.sig_v, data.araResponse.sig_r, data.araResponse.sig_s
    ]

    window.xdex.methods.withdraw(params)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Withdrawing...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Withdrawn", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            clearProcessStep();
            showUserSwapToTarget(null);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

/**
 * listen for events
 */
window.addEventListener('load', async () => {
    let content = document.getElementById('myTabContent');

    content.addEventListener(`${NAV.USER}.${PROCESS.SWAP_TARGET}`, async (e) => {
        showUserSwapToTarget(e.detail.step, e.detail.data)
    })
});
