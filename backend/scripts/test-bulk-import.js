const http = require('http');

function postJSON(path, payload, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'POST',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function getRequest(path, token) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = [];
        res.on('data', (chunk) => body.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            buffer: Buffer.concat(body),
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('Testing Admin Login and Bulk Import...');

  // 1. Admin login
  const loginRes = await postJSON('/api/v1/auth/login', {
    identifier: 'admin@zeal.edu.in',
    password: 'Admin@123',
  });
  console.log('[1. Admin Login]', loginRes.status, loginRes.body.success);
  const token = loginRes.body?.data?.token;
  if (!token) {
    console.error('Failed to get token:', loginRes.body);
    process.exit(1);
  }

  // 2. Download template
  const templateRes = await getRequest('/api/v1/students/template', token);
  console.log('[2. Template Download]', templateRes.status, 'Content-Type:', templateRes.headers['content-type'], 'Size:', templateRes.buffer.length);

  // 3. Test Bulk Import with Real Student Records
  const realStudents = [
    {
      PRN: '1032240001',
      RollNumber: 'ZCOER-CSE-101',
      FirstName: 'Siddharth',
      LastName: 'Deshmukh',
      Email: 'siddharth.deshmukh@student.zeal.edu.in',
      Phone: '9822155555',
      Gender: 'MALE',
      DateOfBirth: '2004-03-12',
      DepartmentCode: 'CSE',
      Semester: 3,
      SectionName: 'Division A',
      Address: 'Zeal Education Society, Induri Campus, Pune',
      Password: 'Student@123',
    },
    {
      PRN: '1032240002',
      RollNumber: 'ZCOER-IT-102',
      FirstName: 'Ananya',
      LastName: 'Kulkarni',
      Email: 'ananya.kulkarni@student.zeal.edu.in',
      Phone: '9822166666',
      Gender: 'FEMALE',
      DateOfBirth: '2004-07-25',
      DepartmentCode: 'IT',
      Semester: 3,
      SectionName: 'Division A',
      Address: 'Zeal Education Society, Induri Campus, Pune',
      Password: 'Student@123',
    },
  ];

  const importRes = await postJSON(
    '/api/v1/students/bulk-import',
    { students: realStudents },
    token
  );
  console.log('[3. Bulk Import]', importRes.status, importRes.body);

  // 4. Verify Student Login using newly imported PRN
  const studentLogin = await postJSON('/api/v1/auth/login', {
    identifier: '1032240001',
    password: 'Student@123',
  });
  console.log('[4. New Real Student PRN Login]', studentLogin.status, studentLogin.body.data?.user?.email, 'Role:', studentLogin.body.data?.user?.role);
}

run().catch(console.error);

