const app = require('../dist/app.js').default;
const http = require('http');

const server = app.listen(5000, async () => {
  console.log('Test server listening on port 5000');

  try {
    // 1. Probe health check
    const health = await new Promise((resolve, reject) => {
      http.get('http://localhost:5000/api/health', (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(JSON.parse(data)));
      }).on('error', reject);
    });

    console.log('✅ Health check result:', JSON.stringify(health, null, 2));

    // 2. Probe Super Admin Login
    const loginPayload = JSON.stringify({
      email: 'superadmin@college.edu',
      password: 'SuperAdmin@123',
    });

    const loginRes = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/auth/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(loginPayload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(JSON.parse(data)));
        }
      );
      req.on('error', reject);
      req.write(loginPayload);
      req.end();
    });

    console.log('✅ Super Admin login result:');
    console.log('   Success:', loginRes.success);
    console.log('   User email:', loginRes.data?.user?.email);
    console.log('   User role:', loginRes.data?.user?.role);
    console.log('   Token generated:', !!loginRes.data?.token);

    // 3. Probe Defaulter Student Login (Jane Smith)
    const janePayload = JSON.stringify({
      email: 'jane.smith@student.college.edu',
      password: 'Student@123',
    });

    const janeRes = await new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/auth/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(janePayload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve(JSON.parse(data)));
        }
      );
      req.on('error', reject);
      req.write(janePayload);
      req.end();
    });

    console.log('✅ Defaulter Student login result:');
    console.log('   Success:', janeRes.success);
    console.log('   Student Name:', `${janeRes.data?.user?.studentProfile?.firstName} ${janeRes.data?.user?.studentProfile?.lastName}`);
    console.log('   Student Roll:', janeRes.data?.user?.studentProfile?.rollNumber);
  } catch (err) {
    console.error('Probe failed:', err);
  } finally {
    server.close(() => {
      console.log('Test server closed.');
      process.exit(0);
    });
  }
});

