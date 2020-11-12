const chainLink = require('./chainlink');
  var fetch = require('node-fetch');





 /* setInterval( async () => {
 let result = await chainLink.fetchLatestPrice();
  console.log(result);

 }, 10000);
 */


const testDiscordHook = () => {
   

const WEBHOOK_URL = "https://discord.com/api/webhooks/776142510228766751/UCr-n_Z6RJnSqIu8OtzpMpQKvkWpIRr_K39pHQxJwFu7gLLpXWCC7CR7Tu81-0GsHZKW"




fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({"username": "The only true Oracle", "content": "Latest fetched price 1.72 xhv/usd"})
});
} 
 

testDiscordHook();


