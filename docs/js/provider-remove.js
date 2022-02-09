"use strict";


let showProviderRemove = function() {
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

    // load factory or targetchain

    // show first step button on process
    createLpInitProcess();
};

let createLpInitProcess = function() {
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
    
    disableBtn(btns['approveTarget'], onCreateTargetApprove);
    disableBtn(btns['depositTarget'], onCreateTargetDeposit);
    btns['waiting'].style.display = "";
    btns['waitingBlocks'].style.display = "";

    if (!window.blockNumber) {
        return printErrorMessage(`Missing the block number. Please start from beginning`);
    }

    let interval = setInterval(async () => {
        let currentBlockNumber = await web3.eth.getBlockNumber();

        if (currentBlockNumber - window.blockNumber > 12) {
            clearInterval(interval);
            createApproveSourceProcess();
        } else {
            let left = currentBlockNumber - window.blockNumber;
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

    let targetTokenEl = document.getElementById('provider-create-target-list');
    
    window.tokens[targetTokenEl.value].methods.approve(window.xdex._address, targetTokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Approving...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            showToast("Approved", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            createDepositProcess();
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onCreateSourceApprove = async function() {
    window.errorModalEl.removeEventListener('hidden.bs.modal', onCreateSourceApprove);

    // check that user is in the source chain.
    if (!isSource(chainId)) {
        window.errorModalEl.addEventListener('hidden.bs.modal', onCreateSourceApprove);

        let errMessage = `You are on ${getTargetConf().name}' network. Please switch to '${getSourceConf().name}'`;

        return printErrorMessage(errMessage,  onCreateSourceApprove);
    }

    let tokenAmount = parseFloat(document.getElementById('provider-create-source-amount').value);
    if (isNaN(tokenAmount)) {
        return printErrorMessage(`Invalid Target Amount`);
    }
    let tokenAmountWei = web3.utils.toWei(tokenAmount.toString());

    let tokenEl = document.getElementById('provider-create-source-list');
    
    window.tokens[tokenEl.value].methods.approve(window.xdex._address, tokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            showToast("Approving...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            console.log(receipt);
            showToast("Approved", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            createWaitingSigProcess();
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
    });
}

let onCreateTargetDeposit = async function() {
    let targetTokenAmount = parseFloat(document.getElementById('provider-create-target-amount').value);
    let targetTokenAmountWei = web3.utils.toWei(targetTokenAmount.toString());

    let targetTokenEl = document.getElementById('provider-create-target-list');
    
    window.xdex.methods.deposit(targetTokenEl.value, targetTokenAmountWei)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            window.hash = hash;
            showToast("Depositing...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            console.log(receipt);
            showToast("Deposited", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            window.blockNumber = receipt.blockNumber;
            createWaitingProcess();
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let onCreate = async function() {
    let params = [
        [window.araResponse.source_token_address, window.araResponse.target_token_address],
        [web3.utils.toWei(window.araResponse.sourceAmount), web3.utils.toWei(window.araResponse.targetAmount)],
        window.araResponse.sig_v, window.araResponse.sig_r, window.araResponse.sig_s
    ]

    window.xdex.methods.create(params)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            window.hash = hash;
            showToast("Creating...", `See TX on <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>`);
        })
        .on('receipt', async function(receipt){
            console.log(receipt);
            showToast("Created", `See TX on <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>`);

            createLpInitProcess();
        })
        .on('error', function(error, _receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            printErrorMessage(error.message);
            console.error(error.message);
        });
}

let fetchCreateSig = async function() {
    let targetId = parseInt(getSourceConf().pairedTo);
    let sourceId = parseInt(getTargetConf().pairedTo);

    let tokenAmount = web3.utils.toWei(document.getElementById('provider-create-source-amount').value);
    let tokenEl = document.getElementById('provider-create-source-list');

    let type = 'create-lp';
    let params = {
        "txid": window.hash,
        "sourceChainId": sourceId,
        "sourceTokenAddress": tokenEl.value,
        "sourceAmount": tokenAmount,
        "targetChainId": targetId
    }

    try {
        window.araResponse = await fetchSig(type, params);

        if (window.araResponse.status === 'ERROR') {
            printErrorMessage(window.araResponse.message);
        } else {
            if (window.selectedAccount !== window.araResponse.wallet_address) {
                return printErrorMessage(`Signature returned for ${window.araResponse.wallet_address}`);
            }

            createFinalProcess();
        }
    } catch (error) {
        printErrorMessage(error);
    }
}

/**
 * listen for events
 */
window.addEventListener('load', async () => {
    // document.querySelector("#scape-transfer").addEventListener("click", onTransfer);
    // document.querySelector("#fetch-scape-id").addEventListener("click", onFetch);

    let toastEl = document.querySelector("#toast");
    window.toast = new bootstrap.Toast(toastEl);

    var tabElems = document.querySelectorAll('#myTab button[data-bs-toggle="tab"]')
    for (var tabEl of tabElems) {
      tabEl.addEventListener('shown.bs.tab', function (event) {
        if (window.onMainTabSwitch) {
          window.onMainTabSwitch(event);
        }
      })
    }
});
