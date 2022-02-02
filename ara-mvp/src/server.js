var bodyParser 				= require('body-parser');
var express  				= require('express');

var nodeCleanup   			= require('node-cleanup');      // to close the database connection
const blockchain    		= require('./blockchain');
const ara                   = require('./ara');
const trackingModel 		= require('./models/tracking');
const { pairCreation }   	= require('./syncers/pair-creation');
let gasUpdate 				= './gas-update';

const { isPair } 			= require('./pair');

console.log(`Connecting to kafka at http://${process.env.KAFKA_URL}:${process.env.KAFKA_PORT}`);

const app 					= express();
const port 					= parseInt(process.env.APP_PORT) || 3000;

app.use(bodyParser.json());

/**
 * Main page
 */
app.get('/', () => {
	res.json({'status': 'OK!', 'author': 'Medet Ahmetson', 'link': 'https://github.com/ahmetson/xdex'});
});

/**
 * @description This one generates a signature
 * to use in "Create LP token" process.
 * 
 * Creating LP token is the second step, after depositing
 * Tokens on the Target chain.
 * 
 * @param txid a string of token deposit on the target chain
 * @param sourceChainId a number representing network id
 * @param targetChainId a number representing network id
 * @param sourceTokenAddress a string of token address
 * @param sourceAmount a string representing amount in WEI format.
 */
app.post('/create-lp', (req, res) => {
	let txid = req.body.txid;
	let sourceChainId = parseInt(req.body.sourceChainId);
	let sourceAddress = req.body.sourceAddress;
	let sourceAmount = req.body.sourceAmount;
	let targetChainId = parseInt(req.body.sourceChainId);

	if (!txid || !sourceChainId || !sourceAddress || !sourceAmount || !targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Invalid parameter'
		});
	}

	if (sourceChainId === targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Same chain id'
		});
	}

	if (!isPair(sourceChainId, targetChainId)) {
		return res.status(500).json({
			status: 'ERROR',
			message: `The ${sourceChainId}-${targetChainId} pair not supported`
		});
	}

	// initiate on target chain
	let targetWeb3 = blockchain.initWeb3(targetChainId);

	// check that txid exists
	let receipt;
	try {
		receipt = await targetWeb3.eth.getTransactionReceipt(txid);
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction doesn't exist! txid ${$txid}`
		});
	}

	if (!receipt.status) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction reverted! txid ${txid}`
		})
	}

	// check that passed 12 blocks
	try {
		let currentBlock = await targetWeb3.eth.getBlockNumber();
		let confirmation = parseInt(process.env.CONFIRMATION);
		if (receipt.blockNumber + confirmation > currentBlock) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Not confirmed yet. Waiting ${confirmation} blocks`
			});
		}
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Internal error while trying to connect to target chain for block number'
		});
	}
	// initiate on source chain
	let sourceWeb3 = blockchain.initWeb3(targetChainId);

	// now getting the parameters for signature
	let event = receipt.logs[0];
	let walletAddress = event.topics[1];
	let targetTokenAddress = event.topics[2];
	let targetAmount = event.data;

	// todo
	// check that transaction is a valid deposit transaction

	// todo
	// check that source token exists

	// todo
	// in the future
	// check that LP was not created.

	// sign
	let factory = await blockchain.factoryInstance(sourceWeb3, sourceChainId);
	let nonce;
	try {
		nonce = await factory.methods.depositNonceOf(walletAddress).call();
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch the deposit nonce'
		});
	}

    let arachyls = await ara.get(web3);

	let sig = await ara.signCreation(nonce, walletAddress,
		[sourceWeb.utils.toWei(sourceAmount), targetAmount],
		[sourceTokenAddress, targetTokenAddress],
		arachyls[0]);

	return res.json({
		status: 'OK!',
		sig_v: sig.v,
		sig_r: sig.r,
		sig_s: sig.s,
		wallet_address: walletAddress,
		targetAmount: sourceWeb3.utils.fromWei(targetAmount),
		sourceAmount: sourceAmount,
		target_chain_id: targetChainId,
		source_chain_id: sourceChainId,
		target_token_address: targetTokenAddress,
		source_token_address: sourceTokenAddress,
		arachyl: arachyls[0].address
	});
});

/**
 * @description This one generates a signature
 * to use in "Add LP token" process.
 * 
 * Adding LP token is the second step, after depositing
 * Tokens on the Target chain.
 * 
 * @param txid a string of token deposit on the target chain
 * @param sourceChainId a number representing network id
 * @param targetChainId a number representing network id
 * @param sourceTokenAddress a string of token address
 * @param sourceAmount a string representing amount in WEI format.
 */
app.post('/add-lp', (_req, res) => {
	let txid = req.body.txid;
	let sourceChainId = parseInt(req.body.sourceChainId);
	let sourceAddress = req.body.sourceAddress;
	let sourceAmount = req.body.sourceAmount;
	let targetChainId = parseInt(req.body.sourceChainId);

	if (!txid || !sourceChainId || !sourceAddress || !sourceAmount || !targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Invalid parameter'
		});
	}

	if (sourceChainId === targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Same chain id'
		});
	}

	if (!isPair(sourceChainId, targetChainId)) {
		return res.status(500).json({
			status: 'ERROR',
			message: `The ${sourceChainId}-${targetChainId} pair not supported`
		});
	}

	// initiate on target chain
	let targetWeb3 = blockchain.initWeb3(targetChainId);

	// check that txid exists
	let receipt;
	try {
		receipt = await targetWeb3.eth.getTransactionReceipt(txid);
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction doesn't exist! txid ${$txid}`
		});
	}

	if (!receipt.status) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction reverted! txid ${txid}`
		})
	}

	// check that passed 12 blocks
	try {
		let currentBlock = await targetWeb3.eth.getBlockNumber();
		let confirmation = parseInt(process.env.CONFIRMATION);
		if (receipt.blockNumber + confirmation > currentBlock) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Not confirmed yet. Waiting ${confirmation} blocks`
			});
		}
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Internal error while trying to connect to target chain for block number'
		});
	}
	// initiate on source chain
	let sourceWeb3 = blockchain.initWeb3(targetChainId);

	// now getting the parameters for signature
	let event = receipt.logs[0];
	let walletAddress = event.topics[1];
	let targetTokenAddress = event.topics[2];
	let targetAmount = event.data;

	// todo
	// check that transaction is a valid deposit transaction

	// todo
	// check that source token exists

	// todo
	// in the future
	// check that LP was not created.

	// sign
	let factory = await blockchain.factoryInstance(sourceWeb3, sourceChainId);
	let pairAddress;
	try {
		pairAddress = await factory.methods.getAddress([sourceTokenAddress, targetTokenAddress]).call();
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch the pair address from the factory'
		});
	}

	let pair = await blockchain.pairInstance(sourceWeb3, pairAddress);
    let arachyls = await ara.get(web3);

	let nonce;
	try {
		nonce = await pair.methods.nonceOf(walletAddress).call()
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch the nonce from pair'
		})
	}

	let sig = await ara.signMint(nonce, walletAddress, [sourceWeb.utils.toWei(sourceAmount), targetAmount], arachyls[0]);

	return res.json({
		status: 'OK!',
		sig_v: sig.v,
		sig_r: sig.r,
		sig_s: sig.s,
		wallet_address: walletAddress,
		targetAmount: sourceWeb3.utils.fromWei(targetAmount),
		sourceAmount: sourceAmount,
		target_chain_id: targetChainId,
		source_chain_id: sourceChainId,
		target_token_address: targetTokenAddress,
		source_token_address: sourceTokenAddress,
		pair_address: pairAddress,
		arachyl: arachyls[0].address
	});
});

/**
 * @description This one generates a signature
 * to use in "Remove LP token" process.
 * 
 * Remove LP token is the second step, after removing LP on source chain
 * 
 * @param txid a string of token deposit on the target chain
 * @param sourceChainId a number representing network id
 * @param targetChainId a number representing network id
 */
app.post('/remove-lp', (req, res) => {
	let txid = req.body.txid;
	let sourceChainId = parseInt(req.body.sourceChainId);
	let targetChainId = parseInt(req.body.sourceChainId);

	if (!txid || !sourceAddress || !targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Invalid parameter'
		});
	}

	if (sourceChainId === targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Same chain id'
		});
	}

	if (!isPair(sourceChainId, targetChainId)) {
		return res.status(500).json({
			status: 'ERROR',
			message: `The ${sourceChainId}-${targetChainId} pair not supported`
		});
	}

	// initiate on target chain
	let targetWeb3 = blockchain.initWeb3(targetChainId);
	// initiate on source chain
	let sourceWeb3 = blockchain.initWeb3(targetChainId);

	// check that txid exists
	let receipt;
	try {
		receipt = await sourceWeb3.eth.getTransactionReceipt(txid);
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction doesn't exist! txid ${$txid}`
		});
	}

	if (!receipt.status) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction reverted! txid ${txid}`
		})
	}

	// check that passed 12 blocks
	try {
		let currentBlock = await sourceWeb3.eth.getBlockNumber();
		let confirmation = parseInt(process.env.CONFIRMATION);
		if (receipt.blockNumber + confirmation > currentBlock) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Not confirmed yet. Waiting ${confirmation} blocks`
			});
		}
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Internal error while trying to connect to target chain for block number'
		});
	}

	// now getting the parameters for signature
	let event = receipt.logs[0];
	let walletAddress = event.topics[1];
	let targetAmount = event.topics[3];

	let pair = await blockchain.pairInstance(sourceWeb3, receipt.to);
	let targetTokenAddress;
	try {
		targetTokenAddress = await pair.methods.targetToken().call();
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch target token address from the pair'
		})
	}

	// sign
	let targetChain = await blockchain.targetChainInstance(targetWeb3, targetChainId);
	let nonce;
	try {
		nonce = await targetChain.methods.withdrawNonceOf(walletAddress).call();
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch the nonce from target chain'
		});
	}

    let arachyls = await ara.get(web3);

	let sig = await ara.signWithdraw(nonce, walletAddress, targetAmount, targetTokenAddress, arachyls[0]);

	return res.json({
		status: 'OK!',
		sig_v: sig.v,
		sig_r: sig.r,
		sig_s: sig.s,
		wallet_address: walletAddress,
		targetAmount: sourceWeb3.utils.fromWei(targetAmount),
		target_chain_id: targetChainId,
		source_chain_id: sourceChainId,
		target_token_address: targetTokenAddress,
		pair_address: pairAddress,
		arachyl: arachyls[0].address
	});
});

/**
 * @description This one generates a signature
 * to use in "Swap token from source to target" process.
 * 
 * This is the second step, after initating swap on source chain
 * 
 * @param txid a string of token deposit on the target chain
 * @param sourceChainId a number representing network id
 * @param targetChainId a number representing network id
 */
app.post('/swap/to-target', (req, res) => {
	let txid = req.body.txid;
	let sourceChainId = parseInt(req.body.sourceChainId);
	let targetChainId = parseInt(req.body.sourceChainId);

	if (!txid || !sourceAddress || !targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Invalid parameter'
		});
	}

	if (sourceChainId === targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Same chain id'
		});
	}

	if (!isPair(sourceChainId, targetChainId)) {
		return res.status(500).json({
			status: 'ERROR',
			message: `The ${sourceChainId}-${targetChainId} pair not supported`
		});
	}

	// initiate on target chain
	let targetWeb3 = blockchain.initWeb3(targetChainId);
	// initiate on source chain
	let sourceWeb3 = blockchain.initWeb3(targetChainId);

	// check that txid exists
	let receipt;
	try {
		receipt = await sourceWeb3.eth.getTransactionReceipt(txid);
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction doesn't exist! txid ${$txid}`
		});
	}

	if (!receipt.status) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction reverted! txid ${txid}`
		})
	}

	// check that passed 12 blocks
	try {
		let currentBlock = await sourceWeb3.eth.getBlockNumber();
		let confirmation = parseInt(process.env.CONFIRMATION);
		if (receipt.blockNumber + confirmation > currentBlock) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Not confirmed yet. Waiting ${confirmation} blocks`
			});
		}
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Internal error while trying to connect to target chain for block number'
		});
	}

	// now getting the parameters for signature
	let event = receipt.logs[0];
	let walletAddress = receipt.from;
	let params = sourceWeb3.eth.abi.decodeParameters(['uint256[4'], event.data);
	let targetAmount = params[3];

	let pair = await blockchain.pairInstance(sourceWeb3, receipt.to);
	let targetTokenAddress;
	try {
		targetTokenAddress = await pair.methods.targetToken().call();
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch target token address from the pair'
		})
	}

	// sign
	let targetChain = await blockchain.targetChainInstance(targetWeb3, targetChainId);
	let nonce;
	try {
		nonce = await targetChain.methods.withdrawNonceOf(walletAddress).call();
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch the nonce from target chain'
		});
	}

    let arachyls = await ara.get(web3);

	let sig = await ara.signWithdraw(nonce, walletAddress, targetAmount, targetTokenAddress, arachyls[0]);

	return res.json({
		status: 'OK!',
		sig_v: sig.v,
		sig_r: sig.r,
		sig_s: sig.s,
		wallet_address: walletAddress,
		targetAmount: sourceWeb3.utils.fromWei(targetAmount),
		target_chain_id: targetChainId,
		source_chain_id: sourceChainId,
		target_token_address: targetTokenAddress,
		pair_address: pairAddress,
		arachyl: arachyls[0].address
	});
});

/**
 * @description This one generates a signature
 * to use in "Swap token from target to source" process.
 * 
 * This is the second step, after initating swap on source chain
 * 
 * @param txid a string of token deposit on the target chain
 * @param sourceChainId a number representing network id
 * @param targetChainId a number representing network id
 */
app.post('/swap/to-source', (req, res) => {
	let txid = req.body.txid;
	let sourceChainId = parseInt(req.body.sourceChainId);
	let pairAddress = req.body.sourceAddress;
	let sourceAmount = req.body.sourceAmount;
	let targetChainId = parseInt(req.body.sourceChainId);

	if (!txid || !sourceChainId || !pairAddress || !sourceAmount || !targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Invalid parameter'
		});
	}

	if (sourceChainId === targetChainId) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Same chain id'
		});
	}

	if (!isPair(sourceChainId, targetChainId)) {
		return res.status(500).json({
			status: 'ERROR',
			message: `The ${sourceChainId}-${targetChainId} pair not supported`
		});
	}

	// initiate on target chain
	let targetWeb3 = blockchain.initWeb3(targetChainId);

	// check that txid exists
	let receipt;
	try {
		receipt = await targetWeb3.eth.getTransactionReceipt(txid);
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction doesn't exist! txid ${$txid}`
		});
	}

	if (!receipt.status) {
		return res.status(500).json({
			status: 'ERROR',
			message: `Transaction reverted! txid ${txid}`
		})
	}

	// check that passed 12 blocks
	try {
		let currentBlock = await targetWeb3.eth.getBlockNumber();
		let confirmation = parseInt(process.env.CONFIRMATION);
		if (receipt.blockNumber + confirmation > currentBlock) {
			return res.status(500).json({
				status: 'ERROR',
				message: `Not confirmed yet. Waiting ${confirmation} blocks`
			});
		}
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Internal error while trying to connect to target chain for block number'
		});
	}
	// initiate on source chain
	let sourceWeb3 = blockchain.initWeb3(targetChainId);

	// now getting the parameters for signature
	let event = receipt.logs[0];
	let walletAddress = event.topics[1];

	// todo
	// calculate right amount

	// sign
	let pair = await blockchain.pairInstance(sourceWeb3, pairAddress);
    let arachyls = await ara.get(web3);

	let nonce;
	try {
		nonce = await pair.methods.nonceOf(walletAddress).call()
	} catch (error) {
		return res.status(500).json({
			status: 'ERROR',
			message: 'Failed to fetch the nonce from pair'
		})
	}

	let sig = await ara.signSwap(nonce, walletAddress, sourceAmount, arachyls[0]);

	return res.json({
		status: 'OK!',
		sig_v: sig.v,
		sig_r: sig.r,
		sig_s: sig.s,
		wallet_address: walletAddress,
		sourceAmount: sourceAmount,
		target_chain_id: targetChainId,
		source_chain_id: sourceChainId,
		pair_address: pairAddress,
		arachyl: arachyls[0].address
	});
});

app.use(function (_req, res) {
	res.status(404).json({status: 'ERROR', message: 'Not found'});
})

app.listen(port, () => {
  console.log(`Ara MVP is live on ${port}`)
})
