const http = require('http');
const https = require('https');

// Test login and then create buyer
async function testBuyerCreationFlow() {
  console.log('🧪 Testing Buyer Creation Flow...\n');
  
  // First, let's try to login with default admin credentials
  const loginData = JSON.stringify({
    username: 'admin',
    password: 'admin123'
  });
  
  const loginOptions = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginData)
    }
  };

  return new Promise((resolve) => {
    const req = http.request(loginOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const loginResponse = JSON.parse(data);
          console.log('🔐 Login attempt:', res.statusCode);
          
          if (res.statusCode === 200 && loginResponse.token) {
            console.log('✅ Login successful, testing buyer creation...\n');
            
            // Now test creating a buyer with the token
            const buyerData = JSON.stringify({
              name: 'Test API Buyer',
              email: 'testapi@example.com',
              phone: '555-0123',
              address: '789 Test St',
              nic: 'TEST123'
            });
            
            const buyerOptions = {
              hostname: 'localhost',
              port: 3001,
              path: '/buyers',
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginResponse.token}`,
                'Content-Length': Buffer.byteLength(buyerData)
              }
            };
            
            const buyerReq = http.request(buyerOptions, (buyerRes) => {
              let buyerResponseData = '';
              buyerRes.on('data', (chunk) => {
                buyerResponseData += chunk;
              });
              buyerRes.on('end', () => {
                try {
                  const buyerResponse = JSON.parse(buyerResponseData);
                  console.log('👤 Buyer creation:', buyerRes.statusCode);
                  console.log('📄 Response:', buyerResponse);
                  
                  if (buyerRes.statusCode === 201) {
                    console.log('✅ Buyer creation successful!');
                  } else {
                    console.log('❌ Buyer creation failed');
                  }
                } catch (e) {
                  console.log('❌ Invalid JSON response from buyer creation');
                }
                resolve();
              });
            });
            
            buyerReq.on('error', (err) => {
              console.log('❌ Buyer creation error:', err.message);
              resolve();
            });
            
            buyerReq.write(buyerData);
            buyerReq.end();
            
          } else {
            console.log('❌ Login failed, cannot test buyer creation');
            console.log('💡 You may need to check the default admin credentials');
            resolve();
          }
        } catch (e) {
          console.log('❌ Invalid JSON response from login');
          resolve();
        }
      });
    });

    req.on('error', (err) => {
      console.log('❌ Login error:', err.message);
      resolve();
    });

    req.write(loginData);
    req.end();
  });
}

testBuyerCreationFlow().then(() => {
  console.log('\n🏁 Test completed!');
});
