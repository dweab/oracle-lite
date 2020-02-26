const chainLink = require('./chainlink');





 setInterval( async () => {
 const price = await chainLink.fetchLatestPrice();
 console.log(price);
}, 10000 );


