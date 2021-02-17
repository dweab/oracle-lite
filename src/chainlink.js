const Web3 = require('web3');


//const rpcURL = 'https://main-rpc.linkpool.io/';
//const rpcURL = 'http://localhost:8545';
const testnetUrl = 'https://ropsten.infura.io/v3/955437c1ed1b44f1a8b4328b787d7e84';
const mainnetUrl = 'https://mainnet.infura.io/v3/955437c1ed1b44f1a8b4328b787d7e84';

const web3Test = new Web3(testnetUrl);
const web3Main = new Web3(mainnetUrl);

const xhvAddress = '0xeccBeEd9691d8521385259AE596CF00D68429de0';
const btcAddress = '0xF5fff180082d6017036B771bA883025c654BC935';
const audAddress = '0x05cf62c4ba0ccea3da680f9a8744ac51116d6231';
const eurAddress = '0x25Fa978ea1a7dc9bDc33a2959B9053EaE57169B5';
const chfAddress = '0x02d5c618dbc591544b19d0bf13543c0728a3c4ec';
const gbpAddress = '0x151445852b0cfdf6a4cc81440f2af99176e8ad08';
const jpyAddress = '0xe1407BfAa6B5965BAd1C9f38316A3b655A09d8A6';
const xagAddress = '0x8946a183bfafa95becf57c5e08fe5b7654d2807b';
const xauAddress = '0xafce0c7b7fe3425adb3871eae5c0ec6d93e01935';
const cnyAddress = '0xeF8A4aF35cd47424672E3C590aBD37FBB7A7759a';
const dpiAddress = '0xD2A593BF7594aCE1faD597adb697b5645d5edDB2';

const contractABI = [{"constant":false,"inputs":[{"name":"_requestId","type":"bytes32"},{"name":"_payment","type":"uint256"},{"name":"_expiration","type":"uint256"}],"name":"cancelRequest","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"authorizedRequesters","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"jobIds","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"latestAnswer","outputs":[{"name":"","type":"int256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"minimumResponses","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"oracles","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_recipient","type":"address"},{"name":"_amount","type":"uint256"}],"name":"transferLINK","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"latestRound","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_clRequestId","type":"bytes32"},{"name":"_response","type":"int256"}],"name":"chainlinkCallback","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_paymentAmount","type":"uint128"},{"name":"_minimumResponses","type":"uint128"},{"name":"_oracles","type":"address[]"},{"name":"_jobIds","type":"bytes32[]"}],"name":"updateRequestDetails","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"latestTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_roundId","type":"uint256"}],"name":"getAnswer","outputs":[{"name":"","type":"int256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_roundId","type":"uint256"}],"name":"getTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"paymentAmount","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"requestRateUpdate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_requester","type":"address"},{"name":"_allowed","type":"bool"}],"name":"setAuthorization","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_link","type":"address"},{"name":"_paymentAmount","type":"uint128"},{"name":"_minimumResponses","type":"uint128"},{"name":"_oracles","type":"address[]"},{"name":"_jobIds","type":"bytes32[]"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"response","type":"int256"},{"indexed":true,"name":"answerId","type":"uint256"},{"indexed":true,"name":"sender","type":"address"}],"name":"ResponseReceived","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"}],"name":"OwnershipRenounced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"id","type":"bytes32"}],"name":"ChainlinkRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"id","type":"bytes32"}],"name":"ChainlinkFulfilled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"id","type":"bytes32"}],"name":"ChainlinkCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"current","type":"int256"},{"indexed":true,"name":"roundId","type":"uint256"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"AnswerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"roundId","type":"uint256"},{"indexed":true,"name":"startedBy","type":"address"}],"name":"NewRound","type":"event"}];

const xhvContract = new web3Main.eth.Contract(contractABI, xhvAddress);
const btcContract = new web3Main.eth.Contract(contractABI, btcAddress);
const audContract = new web3Main.eth.Contract(contractABI, audAddress);
const eurContract = new web3Main.eth.Contract(contractABI, eurAddress);
const chfContract = new web3Main.eth.Contract(contractABI, chfAddress);
const gbpContract = new web3Main.eth.Contract(contractABI, gbpAddress);
const jpyContract = new web3Main.eth.Contract(contractABI, jpyAddress);
const xagContract = new web3Main.eth.Contract(contractABI, xagAddress);
const xauContract = new web3Main.eth.Contract(contractABI, xauAddress);
const cnyContract = new web3Main.eth.Contract(contractABI, cnyAddress);
const dpiContract = new web3Main.eth.Contract(contractABI, dpiAddress);


const requestList = [
    {contract:xhvContract, ticker:'xUSD'},
    {contract:btcContract, ticker:'xBTC'},
    {contract:audContract, ticker:'xAUD'},
    {contract:eurContract, ticker:'xEUR'},
    {contract:chfContract, ticker:'xCHF'},
    {contract:gbpContract, ticker:'xGBP'},
    {contract:jpyContract, ticker:'xJPY'},
    {contract:xagContract, ticker:'xAG'},
    {contract:xauContract, ticker:'xAU'},
    {contract:cnyContract, ticker:'xCNY'},
    // {contract:dpiContract, ticker:'xDPI'}
];

module.exports.fetchLatestPrice = async () => {
    return Promise.all(requestList.map(requestItem => settlePromise(requestItem)));
};

const settlePromise = (requestItem) => {

    const {contract, ticker} = requestItem;

    return new Promise( (resolve, reject) => {
        contract.methods.latestAnswer().call()
        .then(res => {
            resolve({state:'fullfilled', ticker, value:res})
        })
        .catch(err => {
            resolve({state:'rejected', ticker, value:err})
        })
    });
};

