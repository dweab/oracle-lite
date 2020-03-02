const Web3 = require('web3');


//const rpcURL = 'https://main-rpc.linkpool.io/';
//const rpcURL = 'http://localhost:8545';
const rpcURL = 'https://ropsten.infura.io/v3/955437c1ed1b44f1a8b4328b787d7e84';

const web3 = new Web3(rpcURL);


// Chainlink Reference Contract for BTC/USD
const contractAddress = '0x882906a758207FeA9F21e0bb7d2f24E561bd0981';
const contractABI = [{"constant":false,"inputs":[{"name":"_requestId","type":"bytes32"},{"name":"_payment","type":"uint256"},{"name":"_expiration","type":"uint256"}],"name":"cancelRequest","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"","type":"address"}],"name":"authorizedRequesters","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"jobIds","outputs":[{"name":"","type":"bytes32"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"latestAnswer","outputs":[{"name":"","type":"int256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"minimumResponses","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"","type":"uint256"}],"name":"oracles","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_recipient","type":"address"},{"name":"_amount","type":"uint256"}],"name":"transferLINK","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"latestRound","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_clRequestId","type":"bytes32"},{"name":"_response","type":"int256"}],"name":"chainlinkCallback","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"renounceOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_paymentAmount","type":"uint128"},{"name":"_minimumResponses","type":"uint128"},{"name":"_oracles","type":"address[]"},{"name":"_jobIds","type":"bytes32[]"}],"name":"updateRequestDetails","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"latestTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"destroy","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_roundId","type":"uint256"}],"name":"getAnswer","outputs":[{"name":"","type":"int256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_roundId","type":"uint256"}],"name":"getTimestamp","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"paymentAmount","outputs":[{"name":"","type":"uint128"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[],"name":"requestRateUpdate","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_requester","type":"address"},{"name":"_allowed","type":"bool"}],"name":"setAuthorization","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"_newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[{"name":"_link","type":"address"},{"name":"_paymentAmount","type":"uint128"},{"name":"_minimumResponses","type":"uint128"},{"name":"_oracles","type":"address[]"},{"name":"_jobIds","type":"bytes32[]"}],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"response","type":"int256"},{"indexed":true,"name":"answerId","type":"uint256"},{"indexed":true,"name":"sender","type":"address"}],"name":"ResponseReceived","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"}],"name":"OwnershipRenounced","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"previousOwner","type":"address"},{"indexed":true,"name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"id","type":"bytes32"}],"name":"ChainlinkRequested","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"id","type":"bytes32"}],"name":"ChainlinkFulfilled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"id","type":"bytes32"}],"name":"ChainlinkCancelled","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"current","type":"int256"},{"indexed":true,"name":"roundId","type":"uint256"},{"indexed":false,"name":"timestamp","type":"uint256"}],"name":"AnswerUpdated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"roundId","type":"uint256"},{"indexed":true,"name":"startedBy","type":"address"}],"name":"NewRound","type":"event"}];


const contract = new web3.eth.Contract(contractABI, contractAddress);




module.exports.fetchLatestPrice = () => {


    return contract.methods.latestAnswer().call()


};


