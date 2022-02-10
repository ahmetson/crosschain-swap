"use strict";

let NAV = {
    PROVIDER:       'provider',
    USER:           'user',
    DEVELOPER:      'developer'
};

let PROCESS = {
    SWAP_TARGET:    'user-swap-target',
    SWAP_SOURCE:    'user-swap-source',
    CREATE:         'provider-create',
    ADD:            'provider-add',
    REMOVE:         'provider-remove'
}

let STEP    = {
    APPROVE_SOURCE: 'approve-source',       // approve token on source
    APPROVE_TARGET: 'approve-target',       // approve token on target
    SIG:            'sig',                  // waiting for signature
    BLOCK_WAITING:  'waiting-blog',         // waiting for block confirmation
    DEPOSIT:        'deposit',              // deposit on target chain
    WITHDRAW:       'withdraw',             // withdraw on target chain
    ACTION:         'ACTION'                // process's itself.
}

/**
 * @description Returns the first Process that user will see, if he wasn't on another process before.
 */
let defaultProcessStep = function() {
    return defaultProviderProcess();
}


let defaultProviderProcess = function() {
    return {
        nav:        NAV.PROVIDER,
        process:    PROCESS.CREATE,
        step:       getProviderCreateNextStep(),
        data:       {}
    };
}

let defaultDeveloperProcess = function() {
    return {
        nav:        NAV.DEVELOPER,
        process:    null,
        step:       null,
        data:       {}
    };
}

let defaultUserProcess = function() {
    return {
        nav:        NAV.USER,
        process:    PROCESS.SWAP_SOURCE,
        step:       STEP.ACTION,
        data:       {}
    };
}

/**
 * In the process, get the next step
 * @param {*} type 
 * @returns STEP | null if step is last one.
 */
let getProviderCreateNextStep = function(step) {
    if (!step) {
        return STEP.APPROVE_TARGET
    } else if (step === STEP.APPROVE_TARGET) {
        return STEP.DEPOSIT
    } else if (step === STEP.DEPOSIT) {
        return STEP.BLOCK_WAITING
    } else if (step === STEP.BLOCK_WAITING) {
        return STEP.APPROVE_SOURCE
    } else if (step === STEP.APPROVE_SOURCE) {
        return STEP.SIG
    } else if (step === STEP.SIG) {
        return STEP.ACTION
    } 

    return null;
}

let getProvderNextStep = function(process, step) {
    if (process === PROCESS.CREATE) {
        return getProviderCreateNextStep(step);
    } else if (process === PROCESS.REMOVE) {
        return getProviderRemoveNextStep(step);
    }
}

let getProviderRemoveNextStep = function(step) {
    if (!step) {
        return STEP.ACTION
    } else if (step === STEP.ACTION) {
        return STEP.BLOCK_WAITING
    } else if (step === STEP.BLOCK_WAITING) {
        return STEP.SIG
    } else if (step === STEP.SIG) {
        return STEP.WITHDRAW
    } 

    return null;
}


/**
 * @param {*} process   - could be swap,  create|add|remove
 * @param {*} part      - could be source-target|target-source, 
 * @param {*} data 
 */
let setProcessStep = function(nav, process, step, data) {
    localStorage.setItem("nav", nav.toString());
    localStorage.setItem("process", process.toString());
    localStorage.setItem("step", step.toString());
    localStorage.setItem("data", JSON.stringify(data));
}

let clearProcessStep = function() {
    localStorage.removeItem("nav");
    localStorage.removeItem("process");
    localStorage.removeItem("step");
    localStorage.removeItem("data");
}

let getProcessStep = function() {
    //nav, process, step, data) {
    let nav = localStorage.getItem("nav");
    if (nav === null) {
        return defaultProcessStep();
    }

    return {
        nav:        localStorage.getItem("nav"),
        process:    localStorage.getItem("process"),
        step:       localStorage.getItem("step"),
        data:       JSON.parse(localStorage.getItem("data"))
    };
}

