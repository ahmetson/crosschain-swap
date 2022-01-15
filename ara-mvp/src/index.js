const { Kafka } 			= require('kafkajs');
var nodeCleanup   			= require('node-cleanup');      // to close the database connection
const blockchain    		= require('./blockchain');
const ara                   = require('./ara');
const trackingModel 		= require('./models/tracking');
const { pairCreation }   	= require('./syncers/pair-creation');
let gasUpdate 				= './gas-update';


console.log(`Connecting to kafka at http://${process.env.KAFKA_URL}:${process.env.KAFKA_PORT}`);


const kafka = new Kafka({
	clientId: 'lighthouse-sync-app',
	brokers: [`${process.env.KAFKA_URL||'kafka'}:${process.env.KAFKA_PORT||19092}`],
	requestTimeout: 3000,
	connectionTimeout: 6000,
	ssl: false
})

let consume = async (eventName, callback) => {
	const consumer = kafka.consumer({
		groupId: 'lighthouse-sync-group-0025',
		maxBytes: 1048576000, // 1GB
		maxBytesPerPartition: 1048576000, // 1GB
		sessionTimeout: 60000,
		heartbeatInterval: 6000,
		rebalanceTimeout: 30000
	})

	// event kafka consumer notification
	await consumer.on('consumer.connect', ()                    => console.info('consumer kafka connected'))
	await consumer.on('consumer.disconnect', ()                 => console.error('consumer kafka disconnect'))
	await consumer.on('consumer.crash', ()                      => console.error('consumer kafka crash'))
	await consumer.on('consumer.stop', ()                       => console.error('consumer kafka stop'))
	await consumer.on('consumer.network.request_timeout', ()    => console.error('consumer kafka network timeout'))

	await consumer.connect()
	await consumer.subscribe({ topic: eventName, fromBeginning: true })
	await consumer.run({ autoCommit: true, eachMessage: callback })
};

(async () => {
	signer = fork(gasUpdate, ['child'], { });

	signer.on('close', () => {
	  console.warn(chalk.redBright(chalk.bold(`> Smartcontract Signer`) + ` stopped!`));

	  signer = undefined;
	});

	// Close db when nodejs exits unexpctedly or expectedly.
	nodeCleanup(function (_exitCode, _signal) {
        console.log(`Pre exit from the ARA MVP!`);
	});

	let web3 = await blockchain.reInit();

    let arachyls = await ara.get(web3);

	// Listening contract-events topic of KAFKA.
	// contract-events is the default name of the topic given by eventeum.
	// and eventeum is the Java service that listens the blockchain.
  	await consume('contract-events', async (data) => {
		console.log(`Consumed an event`);
		let event;
		try {
			event = JSON.parse(data.message.value.toString());
		} catch (error) {
			return console.error(`Failed to parse the JSON data`);
		}

		// Skip unconfirmed transactions
		if (event.details.status !== 'CONFIRMED') {
			console.log(`Not yet confirmed!`);
			return;
		}

		let network = blockchain.nameAndId(event.details.filterId);
		if (network.networkId === 0) {
			console.error(`Unsupported network id on event name '${event.details.filterId}'`);
			return;
		}

		let targetNetwork = blockchain.oppositeNetwork(event.details.filterId);
		if (targetNetwork.networkId === 0) {
			console.error(`Unsupported target network id ${targetNetwork.networkId} on event name '${event.details.filterId}'`);
			return;
		}

		let tracked = await trackingModel.isTracked(networkId, event.details.transactionHash, event.details.logIndex);
		if (tracked) {
			console.log(`Already tracked`);
		  	return;
		}

		try {
			await pairCreation(arachyls, network, targetNetwork, event.details, web3);
		} catch (error) {
			console.log(`\n\nAn error occured when catched pair creation!`);
			console.error(error);
		}
	});
})();
