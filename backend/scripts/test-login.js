const app = require('../dist/app.js').default;
const http = require('http');

const server = app.listen(5000, async () => {
  console.log('Testing authentication against port 5000...');

  async function testLogin(identifier, password, label) {
    const payload = JSON.stringify({
      usernameOrEmail: identifier,
      password: password,
    });

    return new Promise((resolve) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/v1/auth/login',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (d) => (body += d));
          res.on('end', () => {
            const json = JSON.parse(body);
            console.log(`[${label}] Status: ${res.statusCode} | Success: ${json.success} | Name/Email: ${json.data?.user?.email || json.message}`);
            resolve(json);
          });
        }
      );
      req.on('error', (err) => {
        console.error(`[${label}] Error:`, err.message);
        resolve(null);
      });
      req.write(payload);
      req.end();
    });
  }

  try {
    // 1. Test PRN Login (Student Aarav Sharma)
    await testLogin('1032230001', 'Student@123', 'PRN Login (1032230001)');

    // 2. Test Roll Number Login (Student Aarav Sharma & Priya Singh)
    await testLogin('ZCOER-CSE-001', 'Student@123', 'Roll No Login (ZCOER-CSE-001)');
    await testLogin('ZCOER-MECH-004', 'Student@123', 'Roll No Login (ZCOER-MECH-004)');

    // 3. Test Student Email Login
    await testLogin('aarav.sharma1@student.zeal.edu.in', 'Student@123', 'Email Login (aarav.sharma1@student.zeal.edu.in)');

    // 4. Test Super Admin Login
    await testLogin('superadmin@zeal.edu.in', 'SuperAdmin@123', 'Super Admin Login');

    // 5. Test Admin Login
    await testLogin('admin@zeal.edu.in', 'Admin@123', 'Admin Login');

    // 6. Test Faculty Login
    await testLogin('turing@zeal.edu.in', 'Faculty@123', 'Faculty Turing Login');

    // 7. Test Faculty Employee ID Login
    await testLogin('FAC-ZCOER-001', 'Faculty@123', 'Faculty Employee ID Login');

  } finally {
    server.close(() => {
      console.log('Authentication verification tests complete.');
      process.exit(0);
    });
  }
});

