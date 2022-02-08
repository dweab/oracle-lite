const fetch = require('node-fetch');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const mysql = require('mysql');
const util = require('util');
const chainLink = require('./chainlink');
const sig = require('./signature-crypto');
const constants = require('constants');

const hostname = '127.0.0.1';
const port = 80;

const HF_VERSION_XASSET_FEES_V2 = 17;

const INTERVAL = 30 * 1000; // 30s

const CHAINLINK_REQUEST_TIMEOUT = 15 * 1000 // 15s
const CHAINLINK_MAX_ALLOWED_DEVIATION_PERCENT = 15;
const CHAINLINK_MAX_ALLOWED_PRICE_INCREASE = (100 + CHAINLINK_MAX_ALLOWED_DEVIATION_PERCENT) / 100;
const CHAINLINK_MAX_ALLOWED_PRICE_DECREASE = (100 - CHAINLINK_MAX_ALLOWED_DEVIATION_PERCENT) / 100;

const logPrefix = (logId) => new Date().toUTCString() + ': ' + logId + ': '
const logRequestPricingRecord = (reqId) => logPrefix('requesting pricing record: ' + reqId)
const logUpdatePricingRecord = (intervalCount) => logPrefix('updating pricing record: ' + intervalCount)

const emptyRecord = {
	"xAG":0,
	"xAU":0,
	"xAUD":0,
	"xBTC":0,
	"xCAD":0,
	"xCHF":0,
	"xCNY":0,
	"xEUR":0,
	"xGBP":0,
	"xJPY":0,
	"xNOK":0,
	"xNZD":0,
	"xUSD":0,
	"MA1":0,
	"MA2":0,
	"MA3":0,
	"signature":"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"
};

const dbConfig = {
    host: "localhost",
    user: "oracle",
    password: "oracle",
    database: "oracle"
};

function initDb( config ) {
    const connection = mysql.createConnection( config );
    return {
	query( sql, args ) {
	    return util.promisify( connection.query )
	        .call( connection, sql, args );
	},
	close() {
	    return util.promisify( connection.end ).call( connection );
	},
	beginTransaction() {
	    return util.promisify( connection.beginTransaction ).call( connection );
	},
	commit() {
	    return util.promisify( connection.commit ).call( connection );
	},
	rollback() {
	    return util.promisify( connection.rollback ).call( connection );
	},
    };
}

adjustPrice = (chainRecord) => {
	let val = Math.pow(10,8) / chainRecord;
	val *= Math.pow(10,12);
	val -= val % Math.pow(10,4);
	return val;
}

const makeRequest = (request, error, timeout, log) => {
	return new Promise(async (resolve, reject) => {
		let timedOut = false;
		const timer = setTimeout(() => {
			reject(error);
			timedOut = true;
		}, timeout);

		try {
			const response = await request();
			resolve(response);
			log(response, timedOut);
		} catch (e) {
			reject(e);
		} finally {
			clearTimeout(timer);
		}
	})
}

const getPriceRecordFromChainlink = async (intervalCount) => {
	const chainResponse  = await makeRequest(
		() => chainLink.fetchLatestPrice(),
		'Chainlink request timed out',
		CHAINLINK_REQUEST_TIMEOUT,
		(response, timedOut) => console.log(logUpdatePricingRecord(intervalCount), 'Response from Chainlink: ', timedOut ? '(timed out)' : '', response)
	);

	const validResponses = chainResponse.filter(response => response.state === 'fullfilled');

	// if a record is not present or not a valid value we cannot update oracles price records
	for (let record of validResponses) {
		// parseFloat() will return an integer is the value was integer, and a float number if the value
		// was a float number. Then we can check whether if it is integer or not. If not,
		// still let the record go into database so that we can see something is wrong.
		record.value = parseFloat(record.value)
		if (!Number.isInteger(record.value)) {
			console.warn(logUpdatePricingRecord(intervalCount), 'Ticker is NOT valid: ', record.ticker, ' val: ', record.value);
			record.value = 0;
		}
	}

	const priceRecords = validResponses.reduce((acc, chainRecord)=> {
		if (chainRecord.ticker === 'xUSD') {
			acc[chainRecord.ticker] = chainRecord.value * Math.pow(10,4);
		} else if (chainRecord.value != 0 && chainRecord.ticker !== 'xJPY') {
			acc[chainRecord.ticker] = adjustPrice(chainRecord.value);
		} else {
			acc[chainRecord.ticker] = 0;
		}
		return acc;
	}, {});

	const pr_out = {...emptyRecord, ...priceRecords};
	console.log(logUpdatePricingRecord(intervalCount), 'pr_out: ', pr_out);

	return pr_out;
}

getData = async (intervalCount) => {
    try {
		// get prices from both Chainlink and Coingecko, and sanity check Chainlink prices against Coingecko
		const [pr_out] = await Promise.all([
			getPriceRecordFromChainlink(intervalCount)
		]);

		// Store the record in the DB
		let sql = "INSERT INTO PricingRecord (xAG,xAU,xAUD,xBTC,xCAD,xCHF,xCNY,xEUR,xGBP,xJPY,xNOK,xNZD,xUSD,unused1,unused2,unused3,xBTCMA,Signature) VALUES (?)";
		let values = [[pr_out.xAG, pr_out.xAU, pr_out.xAUD, pr_out.xBTC, pr_out.xCAD, pr_out.xCHF, pr_out.xCNY,
				pr_out.xEUR, pr_out.xGBP, pr_out.xJPY, pr_out.xNOK, pr_out.xNZD, pr_out.xUSD,
				pr_out.MA1, pr_out.MA2, pr_out.MA3, pr_out.xBTC, pr_out.signature]];

		const db = initDb(dbConfig);
		try {
		  await db.beginTransaction();
		  const resultInsert = await db.query(sql, values);
		  sql = "UPDATE PricingRecord SET xBTCMA=(SELECT IFNULL((AVG(xBTC) DIV 10000)*10000, 0) FROM (SELECT xBTC FROM PricingRecord PR WHERE xBTC != 0 AND PR.Timestamp>DATE_SUB(NOW(), INTERVAL 30 MINUTE) " +
			"ORDER BY PR.PricingRecordPK DESC LIMIT 60) AS maBTC), " +
			"unused1=(SELECT ((AVG(xUSD) DIV 100000000)*100000000) FROM (SELECT xUSD FROM PricingRecord PR WHERE xUSD != 0 ORDER BY PR.PricingRecordPK DESC LIMIT 2880) AS ma1), " +
			"unused2=(SELECT ((AVG(xUSD) DIV 100000000)*100000000) FROM (SELECT xUSD FROM PricingRecord PR WHERE xUSD != 0 ORDER BY PR.PricingRecordPK DESC LIMIT 4320) AS ma2), " +
			"unused3=(SELECT ((AVG(xUSD) DIV 100000000)*100000000) FROM (SELECT xUSD FROM PricingRecord PR WHERE xUSD != 0 ORDER BY PR.PricingRecordPK DESC LIMIT 8640) AS ma3) WHERE PricingRecordPK=?";
		  values = [resultInsert.insertId];
		  const resultUpdate = await db.query(sql, values);

			//Now get the MA values
			var resultQuery = await db.query("SELECT * FROM PricingRecord WHERE PricingRecordPK=?", values);

			// Erase the empty signature & (superfluous) timestamp
			delete resultQuery[0].PricingRecordPK;
			delete resultQuery[0].Signature;
			delete resultQuery[0].Timestamp;

			// move btc to mv avg
			resultQuery[0].xBTC = resultQuery[0].xBTCMA;
			delete resultQuery[0].xBTCMA;

			console.log(logUpdatePricingRecord(intervalCount), "JSON='" + JSON.stringify(resultQuery[0]) + "'");
			
			//TODO comment out for regular running
			//const signature = "\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0";
			const signature = sig.getSignature(JSON.stringify(resultQuery[0]));
		
			console.log(logUpdatePricingRecord(intervalCount), " ... received (sig = " + signature + ")");
			//Update the PR
			values = [signature, resultInsert.insertId];
			const resultUpdatePR = await db.query("UPDATE PricingRecord SET Signature=? WHERE PricingRecordPK=?", values);
			await db.commit();
			console.log(logUpdatePricingRecord(intervalCount), 'Successfully written to db!');
		} catch(err) {
		    // Something went wrong
		    console.log(logUpdatePricingRecord(intervalCount), 'Failed to write to db!', err);
		    await db.rollback();
		} finally {
		    db.close();
		    return;
		}
    } catch (err) {
		console.log(logUpdatePricingRecord(intervalCount), err);
		return;
    }
};

let reqCount = 0;
const server = http.createServer(async (req, res) => {
    const currReqCount = reqCount;
    console.log(logRequestPricingRecord(currReqCount), "requesting record...");

	let version = HF_VERSION_XASSET_FEES_V2;
	/*
	try {
		const baseURL = 'https://' + req.headers.host + '/';
		const reqUrl = new URL(req.url, baseURL);
		version = Number(reqUrl.searchParams.get('version'));
	} catch {
		version = 0;
	}
	*/
	console.log(logRequestPricingRecord(currReqCount), "requesting version", version);

    let response;
    const db = initDb(dbConfig);
    try {
		const result = await db.query("SELECT * FROM PricingRecord ORDER BY PricingRecordPK DESC LIMIT 1");
		console.log(logRequestPricingRecord(currReqCount), "record from DB: ", result);

		// make sure record is recent enough - don't want to allow an old record through
		// used INTERVAL + buffer to allow for latency variation in Chainlink + Coingecko + DB logic
		const recordTimestamp = new Date(result[0].Timestamp);
		if (new Date() - recordTimestamp > (INTERVAL + 10000)) {
			console.log(logRequestPricingRecord(currReqCount), "Something is wrong, record is not recent enough.");
			res.writeHead(404, "Content-Type: text/plain");
			response = "Recent record not found";
		} else {
			// move btc to mv avg
			result[0].xBTC = result[0].xBTCMA;
			delete result[0].xBTCMA;

			// set timestamp based on time of request
			result[0].timestamp = Math.floor(Date.now() / 1000);

			if (version < HF_VERSION_XASSET_FEES_V2) {
				result[0].signature = result[0].Signature;
			}

			// delete unused values
			delete result[0].Signature;
			delete result[0].Timestamp;
			
			if (version >= HF_VERSION_XASSET_FEES_V2) {
				// don't sign PricingRecordPK, but save it to return in response
				const PricingRecordPK = result[0].PricingRecordPK;
				delete result[0].PricingRecordPK;

				// sign result and include in response
				console.log(logRequestPricingRecord(currReqCount), "JSON Result='" + JSON.stringify(result[0]) + "'");
				const signature = sig.getSignature(JSON.stringify(result[0]));
				console.log(logRequestPricingRecord(currReqCount), " ... result (sig = " + signature + ")");
				result[0].signature = signature;

				// reset PricingRecordPK for response
				result[0].PricingRecordPK = PricingRecordPK;
			}

			response = JSON.stringify({"pr": result[0]});
			res.writeHead(200, "Content-Type: application/json");
		}
		console.log(logRequestPricingRecord(currReqCount), "Final response: " + response);
		res.write(response);
		res.end();
    } catch(err) {
	// Something went wrong
	console.log(logRequestPricingRecord(currReqCount), err);
	//res.writeHead(404, "Content-Type: text/plain");
	//res.write(json.response);
	//res.end();
    } finally {
	db.close();
	reqCount += 1;
	return;
    }
});

server.listen(port, hostname, () => {

    console.log(`Server running at https://${hostname}:${port}/`);

    // Start a timer to collect the data from CoinGecko
    let intervalCount = 0;
    const interval = setInterval(function() {
        // Get the pricing record data
        console.log(logUpdatePricingRecord(intervalCount), "fetching updated Pricing Record");
        getData(intervalCount);
        intervalCount += 1;
    }, INTERVAL);
});
