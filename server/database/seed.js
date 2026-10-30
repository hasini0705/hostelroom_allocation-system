const bcrypt = require('bcryptjs');
const { initDatabase, queryOne, query, run, transaction, createNotification } = require('./db');

const ROOM_IMAGES = [
  'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80'
];

const BED_IMAGES = [
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1540518614846-7ede433c4ef4?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=600&q=80'
];

function seedDatabase() {
  initDatabase();

  // Populate bed images if existing beds are missing photos
  try {
    const bedsWithoutImg = query(`SELECT id FROM beds WHERE image_url IS NULL OR image_url = ''`);
    if (bedsWithoutImg.length > 0) {
      console.log(`[Seed] Updating ${bedsWithoutImg.length} beds with default bed photos...`);
      bedsWithoutImg.forEach((b, idx) => {
        run(`UPDATE beds SET image_url = ? WHERE id = ?`, [BED_IMAGES[idx % BED_IMAGES.length], b.id]);
      });
    }
  } catch (err) {
    console.error('[Seed Error updating beds]', err);
  }

  // Check if warden already exists
  const existingWarden = queryOne("SELECT * FROM users WHERE email = 'warden@hostel.edu'");
  if (existingWarden) {
    console.log('[Seed] Database is already seeded.');
    return;
  }

  console.log('[Seed] Seeding sample data for Hostel Room Allocation System...');

  transaction(() => {
    // 1. Create Default Warden
    const wardenPassHash = bcrypt.hashSync('Warden@123', 10);
    const wardenUser = run(
      `INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'warden', 1)`,
      ['warden@hostel.edu', wardenPassHash]
    );
    run(
      `INSERT INTO wardens (user_id, full_name, phone) VALUES (?, ?, ?)`,
      [wardenUser.lastInsertRowid, 'Dr. K. S. Sharma (Chief Warden)', '+91 98765 43210']
    );

    // 2. Create Sample Students
    const studentPassHash = bcrypt.hashSync('Student@123', 10);

    // Student 1: Aarav Mehta (CS2024001) - Has active booking
    const s1User = run(
      `INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'student', 1)`,
      ['student@hostel.edu', studentPassHash]
    );
    const s1 = run(
      `INSERT INTO students (user_id, student_id_code, full_name, phone) VALUES (?, ?, ?, ?)`,
      [s1User.lastInsertRowid, 'CS2024001', 'Aarav Mehta', '+91 98111 22334']
    );

    // Student 2: Priya Sharma (CS2024002) - No active bed, ready to book
    const s2User = run(
      `INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'student', 1)`,
      ['priya.sharma@hostel.edu', studentPassHash]
    );
    const s2 = run(
      `INSERT INTO students (user_id, student_id_code, full_name, phone) VALUES (?, ?, ?, ?)`,
      [s2User.lastInsertRowid, 'CS2024002', 'Priya Sharma', '+91 98222 33445']
    );

    // Student 3: Rohan Verma (CS2024003) - Has past vacated history
    const s3User = run(
      `INSERT INTO users (email, password_hash, role, is_active) VALUES (?, ?, 'student', 1)`,
      ['rohan.verma@hostel.edu', studentPassHash]
    );
    const s3 = run(
      `INSERT INTO students (user_id, student_id_code, full_name, phone) VALUES (?, ?, ?, ?)`,
      [s3User.lastInsertRowid, 'CS2024003', 'Rohan Verma', '+91 98333 44556']
    );

    // 3. Create Hostel Blocks
    const blocksData = [
      { name: 'Block A - Tagore Hall', code: 'BLK-A', description: "Boys' Deluxe Residential Complex with attached study rooms", gender: 'Boys' },
      { name: 'Block B - Sarojini Hall', code: 'BLK-B', description: "Girls' Residential Complex with 24x7 biometric security", gender: 'Girls' },
      { name: 'Block C - Ramanujan Wing', code: 'BLK-C', description: 'Co-ed Senior & Postgraduate Engineering Wing', gender: 'Co-ed' }
    ];

    const blockIds = {};
    for (const b of blocksData) {
      const res = run(
        `INSERT INTO hostel_blocks (name, code, description, gender_type) VALUES (?, ?, ?, ?)`,
        [b.name, b.code, b.description, b.gender]
      );
      blockIds[b.code] = res.lastInsertRowid;
    }

    // 4. Create Floors and Rooms
    const facilitiesList = [
      'High-Speed Wi-Fi, Study Table & Chair, Ceiling Fan, Personal Wardrobe, Attached Bathroom',
      'Air Conditioner, High-Speed Wi-Fi, Study Table, Wardrobe, Balcony View, Geyser',
      'High-Speed Wi-Fi, Fan, Study Desk, Cupboard, Common Washroom, Reading Lamp',
      'Air Conditioner, Ergonomic Chairs, High-Speed LAN, Water Purifier, Attached Bath'
    ];

    let allocatedBedId = null;
    let allocatedRoomId = null;

    let pastBedId = null;
    let pastRoomId = null;

    for (const [code, blockId] of Object.entries(blockIds)) {
      // Create 2 floors per block
      for (let fNum = 1; fNum <= 2; fNum++) {
        const floorRes = run(
          `INSERT INTO floors (block_id, floor_number, name) VALUES (?, ?, ?)`,
          [blockId, fNum, `Floor ${fNum}`]
        );
        const floorId = floorRes.lastInsertRowid;

        // Create 3 rooms per floor
        for (let rNum = 1; rNum <= 3; rNum++) {
          const roomNumber = `${code.replace('BLK-', '')}-${fNum}0${rNum}`;
          const facilities = facilitiesList[(fNum + rNum) % facilitiesList.length];
          const imgUrl = ROOM_IMAGES[(fNum * 3 + rNum) % ROOM_IMAGES.length];
          const totalBeds = 3;

          const roomRes = run(
            `INSERT INTO rooms (block_id, floor_id, room_number, total_beds, description, facilities, image_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              blockId,
              floorId,
              roomNumber,
              totalBeds,
              `Spacious room ${roomNumber} with modern amenities, natural ventilation, and quiet academic atmosphere.`,
              facilities,
              imgUrl
            ]
          );
          const roomId = roomRes.lastInsertRowid;

          // Create 3 beds per room with bed pictures
          for (let bIndex = 1; bIndex <= totalBeds; bIndex++) {
            const bedNumber = `${roomNumber}-B${bIndex}`;
            const bedImg = BED_IMAGES[(fNum * 3 + rNum + bIndex) % BED_IMAGES.length];
            let status = 'available';
            let reservedBy = null;

            // Mark one specific bed for active allocation to Student 1 (Aarav Mehta)
            if (code === 'BLK-A' && fNum === 1 && rNum === 1 && bIndex === 1) {
              status = 'booked';
              reservedBy = s1.lastInsertRowid;
            } else if (code === 'BLK-A' && fNum === 1 && rNum === 1 && bIndex === 2) {
              // Mark one bed under maintenance
              status = 'maintenance';
            } else if (code === 'BLK-C' && fNum === 2 && rNum === 2 && bIndex === 3) {
              status = 'available';
            }

            const bedRes = run(
              `INSERT INTO beds (room_id, bed_number, status, reserved_by_student_id, image_url)
               VALUES (?, ?, ?, ?, ?)`,
              [roomId, bedNumber, status, reservedBy, bedImg]
            );

            if (code === 'BLK-A' && fNum === 1 && rNum === 1 && bIndex === 1) {
              allocatedBedId = bedRes.lastInsertRowid;
              allocatedRoomId = roomId;
            }
            if (code === 'BLK-C' && fNum === 2 && rNum === 2 && bIndex === 3) {
              pastBedId = bedRes.lastInsertRowid;
              pastRoomId = roomId;
            }
          }
        }
      }
    }

    // 5. Create Booking Records
    if (allocatedBedId && allocatedRoomId) {
      run(
        `INSERT INTO bookings (student_id, bed_id, room_id, status, booked_at, notes)
         VALUES (?, ?, ?, 'confirmed', datetime('now', '-15 days'), 'Initial semester room allocation')`,
        [s1.lastInsertRowid, allocatedBedId, allocatedRoomId]
      );

      createNotification({
        type: 'booking_confirmed',
        title: 'New Bed Allocation Confirmed',
        message: 'Aarav Mehta (CS2024001) successfully booked Bed A-101-B1 in Block A - Tagore Hall.',
        studentId: s1.lastInsertRowid,
        roomId: allocatedRoomId,
        bedId: allocatedBedId
      });
    }

    // Past vacated booking for Student 3 (Rohan Verma)
    if (pastBedId && pastRoomId) {
      run(
        `INSERT INTO bookings (student_id, bed_id, room_id, status, booked_at, vacated_at, notes)
         VALUES (?, ?, ?, 'vacated', datetime('now', '-90 days'), datetime('now', '-10 days'), 'Previous semester stay, successfully vacated')`,
        [s3.lastInsertRowid, pastBedId, pastRoomId]
      );
    }
  });

  console.log('[Seed] Seeding completed successfully!');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
