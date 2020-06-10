const chainLink = require('./chainlink');





 setInterval( async () => {
 let result = await chainLink.fetchLatestPrice();
  console.log(result);

}, 10000 );


