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
let showProviderRemove = function(step, data) {
    // 
    //  Source
    //
    let sourceConf = getSourceConf();
    
    let sourceChainName = document.getElementById("provider-remove-source-name");
    sourceChainName.setAttribute("value", sourceConf.name);

    let sourceList = document.getElementById("provider-remove-source-list")
    sourceList.textContent = "";

    for (var token of sourceConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        sourceList.appendChild(option);
    }

    let targetConf = getTargetConf();

    let targetChainName = document.getElementById("provider-remove-target-name");
    targetChainName.setAttribute("value", targetConf.name);

    let targetList = document.getElementById("provider-remove-target-list")
    targetList.textContent = "";

    for (var token of targetConf.tokens) {
        let option = document.createElement("option")
        option.text = token.name;
        option.value = token.address;

        targetList.appendChild(option);
    }

    // show first step button on process
    if (step === null || step === STEP.ACTION) {
        removeInitProcess();
    } else if (step === STEP.BLOCK_WAITING) {
        removeWaitingProcess(data);
    } else if (step === STEP.SIG) {
        removeWaitingSigProcess(data);
    } else if (step === STEP.WITHDRAW) {
        removeWithdrawProcess(data);
    } 
};

let showRemovePairAddress = async function() {
    let sourceToken = document.getElementById('provider-remove-source-list')
    let targetToken = document.getElementById('provider-remove-target-list')

    let empty = '0x0000000000000000000000000000000000000000';

    document.getElementById('provider-remove-lp-address').innerText = empty;
    document.getElementById('provider-remove-balance').innerText = "";

    let pairAddress = await xdex.methods.getPair(sourceToken.value, targetToken.value).call();

    if (pairAddress === empty) {
        let errMessage = `The pair of ${sourceToken.value}-${targetToken.value} doesn't exist. please create it.`;

        return printErrorMessage(errMessage);
    }

    document.getElementById('provider-remove-lp-address').innerText = pairAddress;

    // now load the pair contract.
    loadPair(pairAddress);

    // show user balance:
    let balance = await window.pair.methods.balanceOf(selectedAccount).call();
    let balanceWei = web3.utils.fromWei(balance);
    document.getElementById('provider-remove-balance').innerText = balanceWei;
}

let removeWithdrawProcess = async function() {
    let btns = getRemoveBtns();
    
    enableBtn(btns['withdrawTarget'], onRemoveWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['remove'], onRemove);

    await fetchRemoveSig();
}

let removeWaitingProcess = function() {
    showRemovePairAddress();

    let btns = getRemoveBtns();
    
    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    disableBtn(btns['withdrawTarget'], onRemoveWithdraw);
    btns['waiting'].style.display = "";
    btns['waitingBlocks'].style.display = "";

    if (!data.blockNumber) {
        return printErrorMessage(`Missing the block number. Please start from beginning`);
    }

    let interval = setInterval(async () => {
        let currentBlockNumber = await web3.eth.getBlockNumber();

        if (currentBlockNumber - data.blockNumber > 12) {
            clearInterval(interval);

            let nextStep = getProviderRemoveNextStep(STEP.BLOCK_WAITING)
            setProcessStep(NAV.PROVIDER, PROCESS.REMOVE, nextStep, data);
            showProviderRemove(nextStep, data);
        } else {
            let left = currentBlockNumber - data.blockNumber;
            btns['waitingBlocks'].innerText = left;
        }
    }, 1000);
    btns['waitingSig'].style.display = "none";
    disableBtn(btns['remove'], onRemove);
}

let removeWaitingSigProcess = async function() {
    showRemovePairAddress();
    
    let btns = getRemoveBtns();
    
    disableBtn(btns['withdrawTarget'], onRemoveWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "";
    disableBtn(btns['remove'], onRemove);

    await fetchRemoveSig();
}

let removeInitProcess = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', removeInitProcess);

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', removeInitProcess);
    
        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;
    
        return printErrorMessage(errMessage,  removeInitProcess);
    }
    let btns = getRemoveBtns();

    await showRemovePairAddress();
    
    disableBtn(btns['withdrawTarget'], onRemoveWithdraw);
    btns['waiting'].style.display = "none";
    btns['waitingBlocks'].style.display = "none";
    btns['waitingSig'].style.display = "none";
    enableBtn(btns['remove'], onRemove);
}

let getRemoveBtns = function() {
    return {
        withdrawTarget: document.getElementById("btn-remove-withdraw-target"),
        waiting: document.getElementById("btn-remove-waiting"),
        waitingBlocks: document.getElementById("provider-remove-left-blocks"),
        waitingSig: document.getElementById("btn-remove-sig"),
        remove: document.getElementById("btn-remove")
    }
}

let onRemove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onRemove);

    let sourceToken = document.getElementById('provider-remove-source-list')
    let targetToken = document.getElementById('provider-remove-target-list')

    let amount = parseFloat(document.getElementById('provider-remove-amount').value);
    if (isNaN(amount)) {
        let errMessage = `Invalid Remove amount'`;

        return printErrorMessage(errMessage,  onRemove);
    }

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onRemove);
    
        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;
    
        return printErrorMessage(errMessage,  onRemove);
    }

    // we are getting the pair address.

    let cacheDetail = defaultProviderProcess();
    cacheDetail.process = PROCESS.REMOVE;
    cacheDetail.step = getProvderNextStep(cacheDetail.process);
    let data = cacheDetail.data;

    let amountWei = web3.utils.toWei(amount.toString());

    window.pair.methods.burn(amountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            data.hash = hash;

            showToast("Depositing...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Deposited", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            data.blockNumber = receipt.blockNumber;

            let nextStep = getProviderRemoveNextStep(cacheDetail.step)
            setProcessStep(NAV.PROVIDER, PROCESS.REMOVE, nextStep, data);
            showProviderRemove(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let onRemoveWithdraw = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onRemoveWithdraw);

    // check that user is in the source chain.
    if (isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onRemoveWithdraw);
    
        let errMessage = `You are on ${getSourceConf().name}' network. Please switch to '${getTargetConf().name}'`;
    
        return printErrorMessage(errMessage,  onRemoveWithdraw);
    }

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let params = [
        data.araResponse.target_token_address,
        web3.utils.toWei(data.araResponse.targetAmount.toString()),
        data.araResponse.sig_v, data.araResponse.sig_r, data.araResponse.sig_s
    ]

    window.xdex.methods.withdraw(params)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Creating...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Created", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            clearProcessStep();
            let nextStep = getProviderRemoveNextStep(STEP.WITHDRAW)
            showProviderRemove(nextStep, data);
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let fetchRemoveSig = async function() {
    let targetId = parseInt(getSourceConf().pairedTo);
    let sourceId = parseInt(getTargetConf().pairedTo);

    let cacheDetail = getProcessStep();
    let data = cacheDetail.data;

    let type = 'remove-lp';
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
            if (selectedAccount !== araResponse.wallet_address) {
                return printErrorMessage(`Signature returned for ${araResponse.wallet_address}`);
            }

            data.araResponse = araResponse;

            let nextStep = getProviderRemoveNextStep(STEP.SIG)
            setProcessStep(NAV.PROVIDER, PROCESS.REMOVE, nextStep, cacheDetail.data);
            showProviderRemove(nextStep, cacheDetail.data);
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
    content.addEventListener(`${NAV.PROVIDER}.${PROCESS.REMOVE}`, async (e) => {
        showProviderRemove(e.detail.step, e.detail.data)
    })

    let sourceToken = document.getElementById('provider-remove-source-list');
    let targetToken = document.getElementById('provider-remove-target-list');

    sourceToken.addEventListener('change', async() => {
        showRemovePairAddress();
    })
    targetToken.addEventListener('change', async() => {
        showRemovePairAddress();
    });
});
