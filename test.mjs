import https from 'https';
const MONDAY_API_TOKEN = process.env.MONDAY_API_TOKEN;

function runQuery(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const req = https.request('https://api.monday.com/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_API_TOKEN,
        'API-Version': '2024-04'
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
    try {
        const query = `mutation { change_simple_column_value(item_id: 2835281868, board_id: 5093001619, column_id: "name", value: "TEST MONDAY RENAME") { id } }`;
        const res = await runQuery(query);
        console.log("Mutation response:", JSON.stringify(res, null, 2));
        
        const fetchq = `query { items(ids:[2835281868]) { id name } }`;
        const res2 = await runQuery(fetchq);
        console.log("Verification fetch:", JSON.stringify(res2, null, 2));
    } catch(e) {
        console.error(e);
    }
})();
