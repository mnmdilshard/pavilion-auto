const http = require('http');

const endpoints = [
  { path: '/buyers', method: 'GET', description: 'Buyers list' },
  { path: '/vehicle-sales', method: 'GET', description: 'Vehicle sales list' },
  { path: '/invoices', method: 'GET', description: 'Invoices list' },
  { path: '/api/users', method: 'GET', description: 'Users list (should require auth)' },
  { path: '/sellers/outstanding', method: 'GET', description: 'Sellers outstanding' },
  { path: '/vehicles', method: 'GET', description: 'Vehicles list' },
  { path: '/sellers', method: 'GET', description: 'Sellers list' },
  { path: '/api/vehicle-summary', method: 'GET', description: 'Vehicle summary' },
];

function testEndpoint(path, method, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            path,
            status: res.statusCode,
            description,
            success: res.statusCode < 400,
            responseType: Array.isArray(json) ? 'array' : 'object',
            dataLength: Array.isArray(json) ? json.length : Object.keys(json).length
          });
        } catch (e) {
          resolve({
            path,
            status: res.statusCode,
            description,
            success: false,
            error: 'Invalid JSON response'
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        path,
        status: 'ERROR',
        description,
        success: false,
        error: err.message
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        path,
        status: 'TIMEOUT',
        description,
        success: false,
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint.path, endpoint.method, endpoint.description);
    results.push(result);
    
    const statusIcon = result.success ? '✅' : '❌';
    const statusInfo = result.success ? 
      `${result.status} - ${result.responseType} (${result.dataLength} items)` : 
      `${result.status} - ${result.error || 'Failed'}`;
    
    console.log(`${statusIcon} ${endpoint.path} - ${endpoint.description}`);
    console.log(`   Status: ${statusInfo}\n`);
  }
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Summary: ${successCount}/${totalCount} endpoints working correctly`);
  
  if (successCount === totalCount) {
    console.log('🎉 All endpoints are working! The server is ready for frontend connections.');
  } else {
    console.log('⚠️  Some endpoints need attention.');
  }
}

runTests().catch(console.error);
