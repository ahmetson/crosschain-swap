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
let showUserSwapToSource = function(step, data) {
    // 
    //  Source
    //
    let sourceConf = getSourceConf();
    
    let sourceChainName = document.getElementById("user-swap-to-source-source-name");
    sourceChainName.setAttribute("value", sourceConf.name);

    let sourceList = document.getElementById("user-swap-to-source-source-list")
    sourceList.textContent = "";

    for (var token of sourceConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        sourceList.appendChild(option);
    }

    let targetConf = getTargetConf();

    let targetChainName = document.getElementById("user-swap-to-source-target-name");
    targetChainName.setAttribute("value", targetConf.name);

    let targetList = document.getElementById("user-swap-to-source-target-list")
    targetList.textContent = "";

    for (var token of targetConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        targetList.appendChild(option);
    }

    // show first step button on process
    if (step === null || step === STEP.APPROVE_TARGET) {
        swapToSourceApproveTargetProcess();
    } else if (step === STEP.DEPOSIT) {
        swapToSourceDepositProcess(data);
    } else if (step === STEP.BLOCK_WAITING) {
        swapToSourceWaitingProcess(data);
    } else if (step === STEP.SIG) {
        swapToSourceSigProcess(data);
    } else if (step === STEP.ACTION) {
        swapToSourceSwapProcess();
    }
};

/**
 * First step of the process
 */
let swapToSourceApproveTargetProcess = function() {
    let btns = getToSourceBtns();

    enableBtn(btns['approveTarget'], onSwapToSourceApprove);
    disableBtn(btns['deposit'], onSwapToSourceDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['swap'], onSwapToSourceSwap);
}

/**
 * Second step of the process
 */
let swapToSourceSwapProcess = function() {
    let btns = getToSourceBtns();
    
    disableBtn(btns['approveTarget'], onSwapToSourceApprove);
    enableBtn(btns['swap'], onSwapToSourceSwap);
    disableBtn(btns['deposit'], onSwapToSourceDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
}

/**
 * Third step of the process
 */
let swapToSourceWaitingProcess = function() {
    let btns = getToSourceBtns();
    
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    disableBtn(btns['approveTarget'], onSwapToSourceApprove);
    disableBtn(btns['deposit'], onSwapToSourceDeposit);
    btns['waiting'].style.display = "";
    btns['waitingBlocks'].style.display = "";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['swap'], onSwapToSourceSwap);

    if (!data.blockNumber) {
        return printErrorMessage(`Missing the block number. Please start from beginning`);
    }

    let interval = setInterval(async () => {
        let currentBlockNumber = await web3.eth.getBlockNumber();

        if (currentBlockNumber - data.blockNumber > 12) {
            clearInterval(interval);

            let nextStep = getSwapToSourceNextStep(STEP.BLOCK_WAITING)
            setProcessStep(NAV.USER, PROCESS.SWAP_SOURCE, nextStep, data);
            showUserSwapToSource(nextStep, data);
        } else {
            let left = currentBlockNumber - data.blockNumber;
            btns['waitingBlocks'].innerText = left;
        }
    }, 1000);
}

/**
 * Fourth step of the process
 */
let swapToSourceSigProcess = async function() {
    let btns = getToSourceBtns();

    disableBtn(btns['approveTarget'], onSwapToSourceApprove);
    disableBtn(btns['deposit'], onSwapToSourceDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "";
    disableBtn(btns['swap'], onSwapToSourceSwap);

    await fetchSwapToSourceSig();
}

/**
 * Fifth (final) step of the process
 */
let swapToSourceDepositProcess = function() {
    let btns = getToSourceBtns();
    
    disableBtn(btns['approveTarget'], onSwapToSourceApprove);
    enableBtn(btns['deposit'], onSwapToSourceDeposit);
    btns['waiting'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['swap'], onSwapToSourceSwap);
}

let getToSourceBtns = function() {
    return {
        approveTarget: document.getElementById("btn-user-swap-to-source-approve-target"),
        deposit: document.getElementById("btn-user-swap-to-source-deposit"),
        waiting: document.getElementById("btn-user-swap-to-source-waiting"),
        waitingBlocks: document.getElementById("btn-user-swap-to-source-block"),
        waitingSig: document.getElementById("btn-user-swap-to-source-sig"),
        swap: document.getElementById("btn-user-swap-to-source-action")
    }
}

let onSwapToSourceApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onSwapToSourceApprove);

    // check that user is in the source chain.
    if (isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onSwapToSourceApprove);

        let errMessage = `You are on '${getSourceConf().name}' network. Please switch to '${getTargetConf().name}'`;

        return printErrorMessage(errMessage,  onSwapToSourceApprove);
    }

    let sourceAmount = parseFloat(document.getElementById('user-swap-to-source-source-amount').value);

    // todo calculate the output
    let amount = parseFloat(document.getElementById('user-swap-to-source-target-amount').value);
    if (isNaN(amount)) {
        return printErrorMessage(`Invalid Source Amount`);
    }
    let amountWei = web3.utils.toWei(amount.toString());

    // to load the pair address

    let sourceTokenEl = document.getElementById('user-swap-to-source-source-list');
    let targetTokenEl = document.getElementById('user-swap-to-source-target-list');

    window.tokens[targetTokenEl.value].methods.approve(window.xdex._address, amountWei)
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
                targetAmount: amount,
                sourceAmount: sourceAmount,
                selectedAccount: window.selectedAccount
            }

            let nextStep = getSwapToSourceNextStep(STEP.APPROVE_TARGET)
            setProcessStep(NAV.USER, PROCESS.SWAP_SOURCE, nextStep, data);
            showUserSwapToSource(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onSwapToSourceSwap = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onAdd);

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onAdd);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onAdd);
    }

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let pairAddress = await xdex.methods.getPair(data.sourceToken, data.targetToken).call();
    let empty = '0x0000000000000000000000000000000000000000';

    if (pairAddress === empty) {
        let errMessage = `The pair of ${sourceTokenEl.value}-${targetTokenEl.value} doesn't exist. please create it.`;

        return printErrorMessage(errMessage);
    }

    // now load the pair contract.
    loadPair(pairAddress);

    let params = [
        web3.utils.toWei(data.targetAmount.toString()), 
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

            clearProcessStep();
            showUserSwapToSource(null);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let fetchSwapToSourceSig = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', fetchSwapToSourceSig);

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', fetchSwapToSourceSig);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  fetchSwapToSourceSig);
    }


    let targetId = parseInt(getSourceConf().pairedTo);
    let sourceId = parseInt(getTargetConf().pairedTo);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let pairAddress = await xdex.methods.getPair(data.sourceToken, data.targetToken).call();
    let empty = '0x0000000000000000000000000000000000000000';

    if (pairAddress === empty) {
        let errMessage = `The pair of ${sourceTokenEl.value}-${targetTokenEl.value} doesn't exist. please create it.`;

        return printErrorMessage(errMessage);
    }

    let type = 'swap/to-source';
    let params = {
        "txid": cacheDetail.data.hash,
        "sourceChainId": sourceId,
        "targetChainId": targetId,
        "pairAddress": pairAddress,
        "sourceAmount": data.sourceAmount
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

            let nextStep = getSwapToSourceNextStep(STEP.SIG)
            setProcessStep(NAV.USER, PROCESS.SWAP_SOURCE, nextStep, data);
            showUserSwapToSource(nextStep, cacheDetail.data);
        }
    } catch (error) {
        printErrorMessage(error);
    }
}


let onSwapToSourceDeposit = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onSwapToSourceDeposit);

    // check that user is in the source chain.
    if (isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onSwapToSourceDeposit);

        let errMessage = `You are on ${getSourceConf().name}' network. Please switch to '${getTargetConf().name}'`;

        return printErrorMessage(errMessage,  onSwapToSourceDeposit);
    }


    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    window.xdex.methods.deposit(data.targetToken, web3.utils.toWei(data.targetAmount.toString()))
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            data.hash = hash;

            showToast("Withdrawing...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Withdrawn", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            
            data.blockNumber = receipt.blockNumber;

            let nextStep = getSwapToSourceNextStep(STEP.DEPOSIT)
            setProcessStep(NAV.USER, PROCESS.SWAP_SOURCE, nextStep, data);

            showUserSwapToSource(nextStep, data);

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

    content.addEventListener(`${NAV.USER}.${PROCESS.SWAP_SOURCE}`, async (e) => {
        showUserSwapToSource(e.detail.step, e.detail.data)
    })
});
