const crypto = require('crypto');
const database = require('./database');
const fetch = require('node-fetch');
const fs = require('fs');
const http = require('http');
const https = require('https');
const mysql = require('mysql');
const util = require('util');

const hostname = '0.0.0.0';
const port = 8080;

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


const getData = async url => {
    try {
	const response = await fetch(url);
	const json = await response.json();
	//console.log(json.market_data.current_price);
	var pr = json.market_data.current_price;
	var ATOMIC_UNITS = 1000000000000;
	var pr_out = {"xAG":new Number(pr.xag * ATOMIC_UNITS).toFixed(0),
		      "xAU":new Number(pr.xau * ATOMIC_UNITS).toFixed(0),
		      "xAUD":new Number(pr.aud * ATOMIC_UNITS).toFixed(0),
		      "xBTC":new Number(pr.btc * ATOMIC_UNITS).toFixed(0),
		      "xCAD":new Number(pr.cad * ATOMIC_UNITS).toFixed(0),
		      "xCHF":new Number(pr.chf * ATOMIC_UNITS).toFixed(0),
		      "xCNY":new Number(pr.cny * ATOMIC_UNITS).toFixed(0),
		      "xEUR":new Number(pr.eur * ATOMIC_UNITS).toFixed(0),
		      "xGBP":new Number(pr.gbp * ATOMIC_UNITS).toFixed(0),
		      "xJPY":new Number(pr.jpy * ATOMIC_UNITS).toFixed(0),
		      "xNOK":new Number(pr.nok * ATOMIC_UNITS).toFixed(0),
		      "xNZD":new Number(pr.nzd * ATOMIC_UNITS).toFixed(0),
		      "xUSD":new Number(pr.usd * ATOMIC_UNITS).toFixed(0),
		      "MA1":0,
		      "MA2":0,
		      "MA3":0,
		      "signature":"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"};
	pr_out.signature = crypto.createHash("sha256").update(JSON.stringify(pr_out)).digest("hex");

	// Store the record in the DB
	var sql = "INSERT INTO PricingRecord (xAG,xAU,xAUD,xBTC,xCAD,xCHF,xCNY,xEUR,xGBP,xJPY,xNOK,xNZD,xUSD,unused1,unused2,unused3,Signature) VALUES (?)";
	var values = [[pr_out.xAG, pr_out.xAU, pr_out.xAUD, pr_out.xBTC, pr_out.xCAD, pr_out.xCHF, pr_out.xCNY,
		       pr_out.xEUR, pr_out.xGBP, pr_out.xJPY, pr_out.xNOK, pr_out.xNZD, pr_out.xUSD,
		       pr_out.MA1, pr_out.MA2, pr_out.MA3, pr_out.signature]];
	const db = initDb(dbConfig);
	try {
	    const resultInsert = await db.query(sql, values);
	    sql = "UPDATE PricingRecord SET unused1=(SELECT AVG(xUSD) FROM (SELECT xUSD FROM PricingRecord PR ORDER BY PR.PricingRecordPK DESC LIMIT 360) AS ma1), " +
		"unused2=(SELECT AVG(xUSD) FROM (SELECT xUSD FROM PricingRecord PR ORDER BY PR.PricingRecordPK DESC LIMIT 1080) AS ma2), " +
		"unused3=(SELECT AVG(xUSD) FROM (SELECT xUSD FROM PricingRecord PR ORDER BY PR.PricingRecordPK DESC LIMIT 2160) AS ma3) WHERE PricingRecordPK=?";
	    values = [resultInsert.insertId];
	    const resultUpdate = await db.query(sql, values);
	    console.log(" ... received (sig = " + pr_out.signature + ")");
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
    /*
	    if (json.status == "ok") {
		res.writeHead(200, "Content-Type: application/json");
		res.write(JSON.stringify(json.response));
		res.end();
		console.log(JSON.stringify(json.response));
	    } else {
		res.writeHead(404, "Content-Type: text/plain");
		res.write(json.response);
		res.end();
	    }
	});
    */
});

server.listen(port, hostname, () => {

    console.log(`Server running at https://${hostname}:${port}/`);

    // Start a timer to collect the data from CoinGecko
    var interval = setInterval(function() {
	// Get the pricing record data
	console.log(new Date().toUTCString() + " : fetching updated Pricing Record");
	var urlCG = "https://api.coingecko.com/api/v3/coins/haven";	
	getData(urlCG);
    }, 30000);
});
