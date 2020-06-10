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


/**
 * Signs a message and returns a crypto.Signature (as a hex string)
 *
 * @param message the stringified data to sign
 * @param private_key the encryption key to sign with
 * @return a crypto.Signature (as a hex string)
 **/
function sign(message, private_key) {

    // Create the hash of the message we are signing
    const signer = crypto.createSign('sha256');
    signer.update(message);
    signer.end();

    // Sign the hash
    const signature = signer.sign(private_key);
    return signature.toString('hex');
}


/**
 * Converts a crypto.Signature into a 128-char fixed-length hex sig (r+s)
 *
 * @param crypto.Signature (as a hex string)
 * @return a rs_signature 128-byte hex string output
 **/
function signature_to_rs(signature_hex) {
    
    const signature_bin = Uint8Array.from(Buffer.from(signature_hex, 'hex'));

    // Sanity check the signature
    if (signature_bin[0] != 0x30) {
	console.error("Error - invalid start byte:" + signature_hex.substr(0,2));
	console.error(signature_hex);
	return -1;
    }
    if (signature_bin[1] != ((signature_hex.length - 4)>>1)) {
	console.error("Error - invalid signature length:" + signature_bin[1]);
	console.error(signature_hex);
	return -2;
    }
    // Generate r+s from the signature
    const r_start = 2;
    const r_length = signature_bin[r_start + 1];
    const r_padded = (signature_bin[r_start + 2] == 0);
    const r = signature_hex.substr((r_start + 2 + (r_padded ? 1 : 0))*2, (r_length + (r_padded ? -1 : 0))*2);

    const s_start = r_start + r_length + 2;
    const s_length = signature_bin[s_start + 1];
    const s_padded = (signature_bin[s_start + 2] == 0);
    const s = signature_hex.substr((s_start + 2 + (s_padded ? 1 : 0))*2, (s_length + (s_padded ? -1 : 0))*2);

    // Return the 128-byte version of the signature
    const rs_signature = (r.length == 62 ? "00" : "") + r + (s.length == 62 ? "00" : "") + s;
    return rs_signature;
}


/**
 * Converts a 128-char fixed-length hex sig (r+s) into a usable crypto.Signature
 *
 * @param rs_signature 128-byte hex string output
 * @return a crypto.Signature (as a hex string)
 **/
function rs_to_signature(rs_signature) {

    const compact = Uint8Array.from(Buffer.from(rs_signature, 'hex'));
    const sig_buffer = Buffer.from(compact).toString('hex');
    var sig_rebuilt = "30";
    var r_rebuilt = (compact[0] == 0) ? sig_buffer.substr(2, 62) : sig_buffer.substr(0,64);
    if (compact[0] & 0x80)
	r_rebuilt = "00" + r_rebuilt;
    var s_rebuilt = (compact[32] == 0) ? sig_buffer.substr(66, 62) : sig_buffer.substr(64,64);
    if (compact[32] & 0x80)
	s_rebuilt = "00" + s_rebuilt;
    sig_rebuilt += new Number((r_rebuilt.length + s_rebuilt.length + 8)/2).toString(16).padStart(2, '0');
    sig_rebuilt += "02";
    sig_rebuilt += new Number(r_rebuilt.length / 2).toString(16).padStart(2, '0');
    sig_rebuilt += r_rebuilt;
    sig_rebuilt += "02";
    sig_rebuilt += new Number(s_rebuilt.length / 2).toString(16).padStart(2, '0');
    sig_rebuilt += s_rebuilt;

    return sig_rebuilt;
}


/**
 * Verifies a message against a provided signature
 *
 * @param message the stringified data to sign
 * @param public_key the encryption key to verify with
 * @param signature the signature to verify the message against
 * @return true if the signature matches the message, false otherwise
 **/
function verify(message, public_key, signature) {

    const verifier = crypto.createVerify('sha256');
    verifier.update(message);
    verifier.end();

    return verifier.verify(public_key, signature, 'hex');
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
	pr_out.signature = signature_to_rs(sign(JSON.stringify(pr_out), private_key));

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

const private_key = fs.readFileSync("certs/ec_private.pem");

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
