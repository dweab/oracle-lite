const chainLink = require ("./chainlink");

const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fetch = require('node-fetch');
//const mysql = require('mysql');

const hostname = '127.0.0.1';
const port = 8080;

chainLink.fetchLatestPrice();

const getData = async url => {
    try {
        const response = await fetch(url);
        const json = await response.json();
        console.log(json.market_data.current_price);
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
            "unused1":3,
            "unused2":2,
            "unused3":1,
            "signature":"\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0"};
        pr_out.signature = crypto.createHash("sha256").update(JSON.stringify(pr_out)).digest("hex");
        /*
        var pr_out = [pr.xag * ATOMIC_UNITS,
                  pr.xau * ATOMIC_UNITS,
                  pr.aud * ATOMIC_UNITS,
                  pr.btc * ATOMIC_UNITS,
                  pr.cad * ATOMIC_UNITS,
                  pr.chf * ATOMIC_UNITS,
                  pr.cny * ATOMIC_UNITS,
                  pr.eur * ATOMIC_UNITS,
                  pr.gbp * ATOMIC_UNITS,
                  pr.jpy * ATOMIC_UNITS,
                  pr.nok * ATOMIC_UNITS,
                  pr.nzd * ATOMIC_UNITS,
                  pr.usd * ATOMIC_UNITS,
                  0,
                  1,
                  2];
        pr_out.push(crypto.createHash("sha256").update(JSON.stringify(pr_out)).digest("hex"));
        */
        return {status:"ok", response:{"pr":pr_out}};
    } catch (err) {
        console.log(err);
        return {status:"error", response:err};
    }
};

const server = http.createServer((req, res) => {

    console.log("pricing record requested at: " + new Date());

    // Call the coingecko API to get the information
    var urlCG = "https://api.coingecko.com/api/v3/coins/haven";
    getData(urlCG)
        .then(function(json) {
            if (json.status === "ok") {
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
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);

    // Start a timer to collect the data from CoinGecko
    let interval = setInterval(function() {
        // Get the pricing record data
        //getPricingRecord();
        console.log("timeout - getting Pricing Record");
    }, 30000);
});
