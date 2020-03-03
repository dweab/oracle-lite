const chainLink = require('./chainlink');
const app3 = require('./app3');





 setInterval( async () => {
 let result = await app3.getData();
 console.log(result);

}, 10000 );


