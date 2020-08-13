const fetch = require('node-fetch');
const fs = require('fs');
const http = require('http');
const https = require('https');
const mysql = require('mysql');
const util = require('util');
const chainLink = require('./chainlink');
const sig = require('./signature-crypto');

const hostname = '0.0.0.0';
const port = 8443;

const emptyRecord = {"xAG":0,
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
	"signature":"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"};

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
	}
    };
}


getData = async () => {
    try {
	const chainResponse  = await chainLink.fetchLatestPrice();

	const validResponses = chainResponse
		.filter( response => response.state === 'fullfilled' );



	// we need usd record to calc other values
	const xUSDRecord = validResponses.find( chainRecord => chainRecord.ticker === 'xUSD' );


	const priceRecords = validResponses.reduce( (acc, chainRecord)=> {

		if (chainRecord.ticker === "xUSD") {
			acc[chainRecord.ticker] = chainRecord.value * Math.pow(10,4);
		}
		else {
			acc[chainRecord.ticker] = parseInt(( xUSDRecord.value / chainRecord.value) * Math.pow(10,12));
		}

		return acc;

	}, {});


	const pr_out = {...emptyRecord, ...priceRecords};

	// Store the record in the DB
	let sql = "INSERT INTO PricingRecord (xAG,xAU,xAUD,xBTC,xCAD,xCHF,xCNY,xEUR,xGBP,xJPY,xNOK,xNZD,xUSD,unused1,unused2,unused3,Signature) VALUES (?)";
	let values = [[pr_out.xAG, pr_out.xAU, pr_out.xAUD, pr_out.xBTC, pr_out.xCAD, pr_out.xCHF, pr_out.xCNY,
		       pr_out.xEUR, pr_out.xGBP, pr_out.xJPY, pr_out.xNOK, pr_out.xNZD, pr_out.xUSD,
		       pr_out.MA1, pr_out.MA2, pr_out.MA3, pr_out.signature]];
	const db = initDb(dbConfig);
	try {
	  const resultInsert = await db.query(sql, values);
	  sql = "UPDATE PricingRecord SET unused1=(SELECT ((AVG(xUSD) DIV 100000000)*100000000) FROM (SELECT xUSD FROM PricingRecord PR ORDER BY PR.PricingRecordPK DESC LIMIT 720) AS ma1), " +
	    "unused2=(SELECT ((AVG(xUSD) DIV 100000000)*100000000) FROM (SELECT xUSD FROM PricingRecord PR ORDER BY PR.PricingRecordPK DESC LIMIT 1080) AS ma2), " +
	    "unused3=(SELECT ((AVG(xUSD) DIV 100000000)*100000000) FROM (SELECT xUSD FROM PricingRecord PR ORDER BY PR.PricingRecordPK DESC LIMIT 2160) AS ma3) WHERE PricingRecordPK=?";
	  values = [resultInsert.insertId];
	  const resultUpdate = await db.query(sql, values);

          // Now get the MA values
	  var resultQuery = await db.query("SELECT * FROM PricingRecord WHERE PricingRecordPK=?", values);

          // Erase the empty signature & (superfluous) timestamp
          delete resultQuery[0].PricingRecordPK;
          delete resultQuery[0].Signature;
          delete resultQuery[0].Timestamp;

          console.log("JSON='" + JSON.stringify(resultQuery[0]) + "'");
          const signature = sig.getSignature(JSON.stringify(resultQuery[0]));
	  console.log(" ... received (sig = " + signature + ")");

          // Update the PR
          values = [signature, resultInsert.insertId];
          const resultUpdatePR = await db.query("UPDATE PricingRecord SET Signature=? WHERE PricingRecordPK=?", values);
          
	} catch(err) {
	    // Something went wrong
	    console.log(err);
	} finally {
	    db.close();
	    return;
	}
    } catch (err) {
	console.log(err);
	return;
    }	
};

const https_options = {
	key: fs.readFileSync("key.pem"),
	cert: fs.readFileSync("cert.pem")
};

const server = https.createServer(https_options, (req, res) => {

    let objResponse;

    console.log(new Date().toUTCString() + " : " + req.connection.remoteAddress + " : requesting record...");

    const db = initDb(dbConfig);
    try {
	db.query("SELECT *, UNIX_TIMESTAMP(Timestamp) AS UT FROM PricingRecord ORDER BY PricingRecordPK DESC LIMIT 1")
	    .then(result => {
		result[0].signature = result[0].Signature;
		result[0].timestamp = result[0].UT;
		delete result[0].Signature;
		delete result[0].Timestamp;
		delete result[0].UT;
		objResponse = {"pr":result[0]};
		res.writeHead(200, "Content-Type: application/json");
		res.write(JSON.stringify(objResponse));
		console.log(JSON.stringify(objResponse));
		res.end();
	    });
    } catch(err) {
	// Something went wrong
	console.log(err);
	//res.writeHead(404, "Content-Type: text/plain");
	//res.write(json.response);
	//res.end();
    } finally {
	db.close();
	return;
    }
});

server.listen(port, hostname, () => {

    console.log(`Server running at https://${hostname}:${port}/`);

    // Start a timer to collect the data from CoinGecko
    const interval = setInterval(function() {
	// Get the pricing record data
	console.log(new Date().toUTCString() + " : fetching updated Pricing Record");
	getData();
    }, 30000);
});
