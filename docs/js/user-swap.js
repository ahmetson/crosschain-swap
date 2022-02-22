"use strict";

/**
 * Show the UI. Unless user didn't have the data set on.
 * 
 * Then move to the next page.
 * 
 * @param {cache-js.STEP} step 
 * @param {} data 
 */
let showUserSwapTabs = function(step, data) {
    // 
    //  Source
    //
    let sourceConf = getSourceConf();
    let targetConf = getTargetConf();

    let sourceToTargetTitle = `${sourceConf.name} -> ${targetConf.name}`;
    let targetToSourceTitle = `${targetConf.name} -> ${sourceConf.name}`;
    
    let toSourceTab = document.getElementById("user-swap-to-source-tab");
    toSourceTab.innerText = sourceToTargetTitle;

    let toTargetTab = document.getElementById("user-swap-to-target-tab");
    toTargetTab.innerText = targetToSourceTitle;
};

/**
 * listen for events
 */
window.addEventListener('load', async () => {
    showUserSwapTabs();
});
