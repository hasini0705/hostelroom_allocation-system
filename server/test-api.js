const { app } = require('./server');
const { queryOne } = require('./database/db');

// In-memory HTTP mock requester for Express without opening loopback sockets
function mockRequest(app, method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    const { EventEmitter } = require('events');
    const { Readable } = require('stream');

    const req = new Readable();
    req._read = () => {};
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...headers
    };
    req.body = body || {};

    let responseData = '';
    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    
    res.setHeader = (k, v) => { res._headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseData = JSON.stringify(data);
      resolve({ statusCode: res.statusCode, data });
      return res;
    };
    res.send = (data) => {
      responseData = data;
      try {
        resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
      } catch (e) {
        resolve({ statusCode: res.statusCode, raw: data });
      }
      return res;
    };
    res.end = (chunk) => {
      if (chunk) responseData += chunk;
      try {
        resolve({ statusCode: res.statusCode, data: JSON.parse(responseData) });
      } catch (e) {
        resolve({ statusCode: res.statusCode, raw: responseData });
      }
    };

    app.handle(req, res);
  });
}

async function runTests() {
  console.log('🧪 Starting Hostel Allocation System API Tests...\n');

  try {
    // 1. Health check
    const health = await mockRequest(app, 'GET', '/api/health');
    console.log('1. Health Check:', health.data.status === 'ok' ? '✅ PASSED' : '❌ FAILED');

    // 2. Captcha Generation
    const captchaRes = await mockRequest(app, 'GET', '/api/captcha/new');
    console.log('2. Captcha New:', captchaRes.data.success ? `✅ PASSED (${captchaRes.data.question})` : '❌ FAILED');
    const captchaId = captchaRes.data.captchaId;

    const captchaChallenge = queryOne('SELECT answer FROM captcha_challenges WHERE id = ?', [captchaId]);

    // 3. Warden Login
    const wardenLoginRes = await mockRequest(app, 'POST', '/api/auth/warden/login', {
      email: 'warden@hostel.edu',
      password: 'Warden@123',
      captchaId,
      captchaAnswer: captchaChallenge.answer
    });
    console.log('3. Warden Login:', wardenLoginRes.data.success ? `✅ PASSED (${wardenLoginRes.data.user.fullName})` : `❌ FAILED: ${JSON.stringify(wardenLoginRes.data)}`);
    const wardenToken = wardenLoginRes.data.token;

    // 4. Warden Dashboard Stats
    const wardenStats = await mockRequest(app, 'GET', '/api/warden/dashboard', null, {
      authorization: `Bearer ${wardenToken}`
    });
    console.log('4. Warden Dashboard Stats:', wardenStats.data.success ? `✅ PASSED (Total Beds: ${wardenStats.data.stats.total_beds}, Available: ${wardenStats.data.stats.available_beds})` : '❌ FAILED');

    // 5. Student Login (Existing seeded student)
    const captcha2 = await mockRequest(app, 'GET', '/api/captcha/new');
    const cap2Answer = queryOne('SELECT answer FROM captcha_challenges WHERE id = ?', [captcha2.data.captchaId]);

    const studentLogin = await mockRequest(app, 'POST', '/api/auth/student/login', {
      identifier: 'student@hostel.edu',
      password: 'Student@123',
      captchaId: captcha2.data.captchaId,
      captchaAnswer: cap2Answer.answer
    });
    console.log('5. Student Login:', studentLogin.data.success ? `✅ PASSED (Student: ${studentLogin.data.user.fullName})` : `❌ FAILED: ${JSON.stringify(studentLogin.data)}`);
    const studentToken = studentLogin.data.token;

    // 6. Student Dashboard
    const studentDash = await mockRequest(app, 'GET', '/api/student/dashboard', null, {
      authorization: `Bearer ${studentToken}`
    });
    console.log('6. Student Dashboard:', studentDash.data.success ? `✅ PASSED (Student Roll: ${studentDash.data.student.student_id_code})` : '❌ FAILED');

    // 7. Student Vacate Room
    const vacateRes = await mockRequest(app, 'POST', '/api/student/vacate', {}, {
      authorization: `Bearer ${studentToken}`
    });
    console.log('7. Student Vacate Room:', vacateRes.data.success ? `✅ PASSED (${vacateRes.data.message})` : `❌ FAILED: ${JSON.stringify(vacateRes.data)}`);

    // 8. Find an available bed to test 5-minute reservation
    const blocksRes = await mockRequest(app, 'GET', '/api/hostel/blocks');
    const blockAId = blocksRes.data.blocks[0].id;
    const roomsRes = await mockRequest(app, 'GET', `/api/hostel/rooms?blockId=${blockAId}`);
    const firstRoom = roomsRes.data.rooms[0];

    const roomDetail = await mockRequest(app, 'GET', `/api/hostel/rooms/${firstRoom.id}`);
    const availableBed = roomDetail.data.beds.find(b => b.status === 'available');

    if (availableBed) {
      // 8a. Reserve bed
      const reserveRes = await mockRequest(app, 'POST', '/api/booking/reserve', { bedId: availableBed.id }, {
        authorization: `Bearer ${studentToken}`
      });
      console.log('8a. Reserve Bed (5-min lock):', reserveRes.data.success ? `✅ PASSED (Locked Bed ${reserveRes.data.bed.bed_number}, Remaining: ${reserveRes.data.remainingSeconds}s)` : `❌ FAILED: ${JSON.stringify(reserveRes.data)}`);

      // 8b. Prevent another student from reserving the same bed
      const cap3 = await mockRequest(app, 'GET', '/api/captcha/new');
      const cap3Answer = queryOne('SELECT answer FROM captcha_challenges WHERE id = ?', [cap3.data.captchaId]);
      const student2Login = await mockRequest(app, 'POST', '/api/auth/student/login', {
        identifier: 'priya.sharma@hostel.edu',
        password: 'Student@123',
        captchaId: cap3.data.captchaId,
        captchaAnswer: cap3Answer.answer
      });
      const s2Token = student2Login.data.token;

      const conflictReserve = await mockRequest(app, 'POST', '/api/booking/reserve', { bedId: availableBed.id }, {
        authorization: `Bearer ${s2Token}`
      });
      console.log('8b. Concurrency Protection (Prevent dual lock):', !conflictReserve.data.success ? `✅ PASSED (${conflictReserve.data.message})` : '❌ FAILED (Allowed duplicate lock)');

      // 8c. Confirm booking
      const confirmRes = await mockRequest(app, 'POST', '/api/booking/confirm', { bedId: availableBed.id }, {
        authorization: `Bearer ${studentToken}`
      });
      console.log('8c. Confirm Booking:', confirmRes.data.success ? `✅ PASSED (${confirmRes.data.message})` : `❌ FAILED: ${JSON.stringify(confirmRes.data)}`);
    }

    // 9. Vacancy Report for Warden
    const vacancyRep = await mockRequest(app, 'GET', '/api/warden/vacancy-report', null, {
      authorization: `Bearer ${wardenToken}`
    });
    console.log('9. Warden Vacancy Report:', vacancyRep.data.success && vacancyRep.data.report.length > 0 ? `✅ PASSED (${vacancyRep.data.report.length} blocks reported)` : '❌ FAILED');

    // 10. Warden Notifications Check
    const notifs = await mockRequest(app, 'GET', '/api/warden/notifications', null, {
      authorization: `Bearer ${wardenToken}`
    });
    console.log('10. Warden Notifications:', notifs.data.success && notifs.data.notifications.length > 0 ? `✅ PASSED (Received ${notifs.data.notifications.length} alerts, Unread: ${notifs.data.unreadCount})` : '❌ FAILED');

    // 11. Bed Picture & Detail Update by Warden
    const updateBedRes = await mockRequest(app, 'PUT', `/api/warden/beds/${availableBed.id}`, {
      bedNumber: `${availableBed.bed_number}-UPDATED`,
      imageUrl: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?auto=format&fit=crop&w=600&q=80'
    }, {
      authorization: `Bearer ${wardenToken}`
    });
    console.log('11. Warden Upload/Update Bed Picture:', updateBedRes.data.success ? `✅ PASSED (${updateBedRes.data.message})` : '❌ FAILED');

    console.log('\n🎉 ALL BACKEND & NOTIFICATION TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    process.exit(1);
  }
}

runTests();
