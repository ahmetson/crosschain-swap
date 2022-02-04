"use strict";

/**
 * Calculates the amount of Tokens that an investor could Claim.
 * @param {Object} pool of total investment information
 * @param {Object} grant of the investor 
 * @returns Float
 */
window.claimable = function(pool, grant) {
    let startTime = parseInt(pool.startTime);
    if (startTime == 0) {
        return 0;
    }

    let endTime = parseInt(pool.endTime);
    let currentTime = parseInt(new Date().getTime() / 1000);

    let cap = currentTime > endTime ? endTime : currentTime;
    let perSecond = web3.utils.fromWei(grant.perSecond, "ether");
    
    if (perSecond <= 0) {
        return 0;
    }

    let difference = parseInt(cap) - startTime;

    let claimed = web3.utils.fromWei(grant.totalClaimed, "ether");

    return (difference * perSecond) - claimed;
};

window.init = async function() {
    try {
        window.scape      = await getContract("scape");
    } catch (e) {
        printErrorMessage(e);
        return;
    }

    // document.querySelector("#pool-info-name").textContent = selectedPool;
    // document.querySelector("#pool-info-contract").textContent = window.vesting._address;
}

function secondsToDhms(seconds) {
    if (seconds < 0) {
        return "Timeout";
    }
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600*24));
    var h = Math.floor(seconds % (3600*24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 60);
    
    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    return dDisplay + hDisplay + mDisplay + sDisplay;
}

/**
 * Main entry point.
 */
window.addEventListener('load', async () => {
    document.querySelector("#scape-transfer").addEventListener("click", onTransfer);
    document.querySelector("#fetch-scape-id").addEventListener("click", onFetch);

    let toastEl = document.querySelector("#toast");
    window.toast = new bootstrap.Toast(toastEl);
});
 
/**
       * On add wallet button pressed.
       */
async function onFetch() {
    window.scapeID = undefined;
    document.querySelector("#scape-id").textContent = 0;

    if (!web3) {
        printErrorMessage("No web3 library. Please check your internet connection");
        return;
    }

    if (!web3.eth) {
        printErrorMessage("Please connect your wallet!");
        return;
    }

    if (!window.scape) {
        printErrorMessage("Scape NFT doesn't exist");
        return;
    }

    try {
        let nftID = await window.scape.methods.tokenOfOwnerByIndex(window.selectedAccount, 0).call();
        window.scapeID = parseInt(nftID);
        document.querySelector("#scape-id").textContent = nftID;
    } catch (error) {
        printErrorMessage(`Account ${window.selectedAccount} doesn't have any Scape NFT`);
    }
}

async function onTransfer() {
    if (!web3) {
        printErrorMessage("No web3 library. Please check your internet connection");
        return;
    }

    if (!web3.eth) {
        printErrorMessage("Please connect your wallet!");
        return;
    }

    if (!window.scape) {
        printErrorMessage("Scape NFT doesn't exist");
        return;
    }

    if (window.scapeID === undefined) {
        printErrorMessage("Please fetch Scape NFT first");
        return;
    }

    let to = document.querySelector("#scape-to").value;
    if (to.length === 0) {
        printErrorMessage("Please type the address to send to");
    }

    window.scape.methods.transferFrom(window.selectedAccount, to, window.scapeID)
        .send({from: window.selectedAccount})
        .on('transactionHash', function(hash) {
            window.scapeID = undefined;
            document.querySelector("#scape-id").textContent = 0;
            
          document.querySelector("#toast-title").textContent = "Waiting...";
          document.querySelector(".toast-body").innerHTML = `See TX on
            <a href="https://rinkeby.etherscan.io/tx/${hash}" target="_blank">explorer</a>
          `;

          toast.show();
        })
        .on('receipt', async function(receipt){
          toast.hide();

          document.querySelector("#toast-title").textContent = "Transferred!";
          document.querySelector(".toast-body").innerHTML = `See TX on
            <a href="https://rinkeby.etherscan.io/tx/${receipt.transactionHash}" target="_blank">explorer</a><br>
          `;

          toast.show();

          onFetch();
        })
        .on('error', function(error, receipt) { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
          printErrorMessage(error.message);
          console.error(error.message);

          document.querySelector("#btn-claim").removeAttribute("disabled", "");
        });
}
