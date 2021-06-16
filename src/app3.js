const fetch = require('node-fetch');
const fs = require('fs');
const http = require('http');
const https = require('https');
const mysql = require('mysql');
const util = require('util');
const chainLink = require('./chainlink');
const sig = require('./signature-crypto');
const constants = require('constants');

const hostname = '0.0.0.0';
const port = 443;

const INTERVAL = 30 * 1000; // 30s

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

const getPriceRecordFromChainlink = async (intervalCount) => {
	const chainResponse  = await chainLink.fetchLatestPrice();
	console.log(logUpdatePricingRecord(intervalCount), 'Response from Chainlink: ', chainResponse);

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
		} else if (chainRecord.value != 0) {
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

const getPriceRecordFromCoingecko = async (intervalCount) => {
	const response = await fetch("https://api.coingecko.com/api/v3/coins/haven");
	const json = await response.json();
	var pr = json.market_data.current_price;
	console.log(logUpdatePricingRecord(intervalCount), 'Response from Coingecko: ', pr);
	var ATOMIC_UNITS = 100000000000;
	
	// leaves out MA's and signature, since not expected to be used later on
	var pr_out = {
		"xAG": Number((pr.xag * ATOMIC_UNITS).toFixed(0)),
		"xAU": Number((pr.xau * ATOMIC_UNITS).toFixed(0)),
		"xAUD": Number((pr.aud * ATOMIC_UNITS).toFixed(0)),
		"xBTC": Number((pr.btc * ATOMIC_UNITS).toFixed(0)),
		"xCAD": Number((pr.cad * ATOMIC_UNITS).toFixed(0)),
		"xCHF": Number((pr.chf * ATOMIC_UNITS).toFixed(0)),
		"xCNY": Number((pr.cny * ATOMIC_UNITS).toFixed(0)),
		"xEUR": Number((pr.eur * ATOMIC_UNITS).toFixed(0)),
		"xGBP": Number((pr.gbp * ATOMIC_UNITS).toFixed(0)),
		"xJPY": Number((pr.jpy * ATOMIC_UNITS).toFixed(0)),
		"xNOK": Number((pr.nok * ATOMIC_UNITS).toFixed(0)),
		"xNZD": Number((pr.nzd * ATOMIC_UNITS).toFixed(0)),

		// USD price from Coingecko requires separate adjustment to make equivalent to Chainlink adjustment for xUSD
		"xUSD": Number((pr.usd * ATOMIC_UNITS * 10).toFixed(0)),
	};
	console.log(logUpdatePricingRecord(intervalCount), 'Coingecko pr_out: ', pr_out);

	return pr_out;
}

const sanityCheckChainlinkPrices = (intervalCount, chainlink_pr_out, coingecko_pr_out) => {
	for (const asset in coingecko_pr_out) {
		const coingeckoPrice = coingecko_pr_out[asset];
		const chainlinkPrice = chainlink_pr_out[asset];

		// make sure Chainlink price is not too much higher or lower than Coingecko's
		if (chainlinkPrice > 0 && coingeckoPrice > 0 && (
			(chainlinkPrice > coingeckoPrice * CHAINLINK_MAX_ALLOWED_PRICE_INCREASE) ||
			(chainlinkPrice < coingeckoPrice * CHAINLINK_MAX_ALLOWED_PRICE_DECREASE)
		)) {
			console.warn(logUpdatePricingRecord(intervalCount), `Chainlink price for ${asset} deviated too far from Coingecko. Chainlink: ${chainlinkPrice} vs. Coingecko: ${coingeckoPrice}`);
			chainlink_pr_out[asset] = 0;
		} else if (chainlinkPrice > 0 && coingeckoPrice <= 0) {
			console.warn(logUpdatePricingRecord(intervalCount), `Coingekco price for ${asset} is missing.`);
			chainlink_pr_out[asset] = 0;
		}
	}
	console.log(logUpdatePricingRecord(intervalCount), 'Sanity check complete: ', chainlink_pr_out);
}

getData = async (intervalCount) => {
    try {
		// get prices from both Chainlink and Coingecko, and sanity check Chainlink prices against Coingecko
		const [pr_out, coingecko_pr_out] = await Promise.all([
			getPriceRecordFromChainlink(intervalCount),

			// secondary price check disabled until we harden the source
			// getPriceRecordFromCoingecko(intervalCount),
		]);

		// sanityCheckChainlinkPrices(intervalCount, pr_out, coingecko_pr_out);

		// Store the record in the DB
		let sql = "INSERT INTO PricingRecord (xAG,xAU,xAUD,xBTC,xCAD,xCHF,xCNY,xEUR,xGBP,xJPY,xNOK,xNZD,xUSD,unused1,unused2,unused3,xBTCMA,Signature) VALUES (?)";
		let values = [[pr_out.xAG, pr_out.xAU, pr_out.xAUD, pr_out.xBTC, pr_out.xCAD, pr_out.xCHF, pr_out.xCNY,
				pr_out.xEUR, pr_out.xGBP, pr_out.xJPY, pr_out.xNOK, pr_out.xNZD, pr_out.xUSD,
				pr_out.MA1, pr_out.MA2, pr_out.MA3, pr_out.xBTC, pr_out.signature]];

		const db = initDb(dbConfig);
		try {
		  await db.beginTransaction();
		  const resultInsert = await db.query(sql, values);
		  sql = "UPDATE PricingRecord SET xBTCMA=(SELECT IFNULL((AVG(xBTC) DIV 10000)*10000, 0) FROM (SELECT xBTC FROM PricingRecord PR WHERE xBTC != 0 AND PR.Timestamp>DATE_SUB(NOW(), INTERVAL 1 HOUR) " +
			"ORDER BY PR.PricingRecordPK DESC LIMIT 120) AS maBTC), " +
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

const https_options = {
	secureOptions: constants.SSL_OP_NO_SSLv3 | constants.SSL_OP_NO_SSLv2 | constants.SSL_OP_NO_TLSv1 | constants.SSL_OP_NO_TLSv1_1,
	key: fs.readFileSync("key.pem"),
	cert: fs.readFileSync("cert.pem")
};

let reqCount = 0;
const server = https.createServer(https_options, async (req, res) => {
    const currReqCount = reqCount;
    console.log(logRequestPricingRecord(currReqCount), "requesting record...");

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

			result[0].signature = result[0].Signature;
		
			// delete unused values
			delete result[0].Signature;
			delete result[0].Timestamp;

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
