const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/v1/internal/knowledge/sync-routine',
  method: 'POST',
  headers: {
    'x-internal-secret': process.env.INTERNAL_API_SECRET || 'dev_secret_123'
  }
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { console.log(data); });
});

req.on('error', error => {
  console.error(error);
});

req.end();
