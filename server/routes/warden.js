const express = require('express');
const router = express.Router();
const { query, queryOne, run, transaction } = require('../database/db');
const { requireWarden } = require('../middleware/auth');
const { cleanupExpiredReservations } = require('../utils/expiryWorker');

// Protect all routes in this router with requireWarden middleware
router.use(requireWarden);

/**
 * GET /api/warden/dashboard
 * Summary counters and analytics for warden dashboard
 */
router.get('/dashboard', (req, res) => {
  try {
    cleanupExpiredReservations();

    const stats = queryOne(`
      SELECT 
        (SELECT COUNT(*) FROM students) as total_students,
        (SELECT COUNT(*) FROM hostel_blocks) as total_blocks,
        (SELECT COUNT(*) FROM rooms) as total_rooms,
        (SELECT COUNT(*) FROM beds) as total_beds,
        (SELECT COUNT(*) FROM beds WHERE status = 'available') as available_beds,
        (SELECT COUNT(*) FROM beds WHERE status = 'booked') as occupied_beds,
        (SELECT COUNT(*) FROM beds WHERE status = 'reserved') as reserved_beds,
        (SELECT COUNT(*) FROM beds WHERE status = 'maintenance') as maintenance_beds,
        (SELECT COUNT(*) FROM bookings WHERE status = 'confirmed') as active_bookings
    `);

    // Block breakdown
    const blockBreakdown = query(`
      SELECT b.id, b.name, b.code, b.gender_type,
             COUNT(DISTINCT r.id) as room_count,
             COUNT(bd.id) as bed_count,
             SUM(CASE WHEN bd.status = 'available' THEN 1 ELSE 0 END) as available_beds,
             SUM(CASE WHEN bd.status = 'booked' THEN 1 ELSE 0 END) as occupied_beds,
             SUM(CASE WHEN bd.status = 'reserved' THEN 1 ELSE 0 END) as reserved_beds,
             SUM(CASE WHEN bd.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_beds
      FROM hostel_blocks b
      LEFT JOIN rooms r ON b.id = r.block_id
      LEFT JOIN beds bd ON r.id = bd.room_id
      GROUP BY b.id
      ORDER BY b.name ASC
    `);

    // Recent 5 bookings
    const recentBookings = query(`
      SELECT b.id, b.status, b.booked_at,
             s.full_name as student_name, s.student_id_code,
             bd.bed_number, r.room_number, hb.name as block_name
      FROM bookings b
      JOIN students s ON b.student_id = s.id
      JOIN beds bd ON b.bed_id = bd.id
      JOIN rooms r ON b.room_id = r.id
      JOIN hostel_blocks hb ON r.block_id = hb.id
      ORDER BY b.booked_at DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      stats,
      blockBreakdown,
      recentBookings
    });
  } catch (err) {
    console.error('[Warden Dashboard Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch warden dashboard data.' });
  }
});

// ==========================================
// 1. HOSTEL BLOCKS MANAGEMENT
// ==========================================

router.get('/blocks', (req, res) => {
  try {
    const blocks = query(`
      SELECT b.*,
             COUNT(DISTINCT f.id) as total_floors,
             COUNT(DISTINCT r.id) as total_rooms,
             COUNT(bd.id) as total_beds,
             SUM(CASE WHEN bd.status = 'available' THEN 1 ELSE 0 END) as available_beds,
             SUM(CASE WHEN bd.status = 'booked' THEN 1 ELSE 0 END) as occupied_beds
      FROM hostel_blocks b
      LEFT JOIN floors f ON b.id = f.block_id
      LEFT JOIN rooms r ON b.id = r.block_id
      LEFT JOIN beds bd ON r.id = bd.room_id
      GROUP BY b.id
      ORDER BY b.name ASC
    `);
    res.json({ success: true, blocks });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch blocks.' });
  }
});

router.post('/blocks', (req, res) => {
  try {
    const { name, code, description, genderType } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Block name and unique code are required.' });
    }

    const existing = queryOne('SELECT id FROM hostel_blocks WHERE UPPER(code) = UPPER(?)', [code.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A block with this code already exists.' });
    }

    const result = run(
      `INSERT INTO hostel_blocks (name, code, description, gender_type) VALUES (?, ?, ?, ?)`,
      [name.trim(), code.trim().toUpperCase(), description ? description.trim() : null, genderType || 'Co-ed']
    );

    res.status(201).json({
      success: true,
      message: 'Hostel block added successfully!',
      blockId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create block.' });
  }
});

router.put('/blocks/:id', (req, res) => {
  try {
    const { name, description, genderType } = req.body;
    const blockId = req.params.id;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Block name is required.' });
    }

    run(
      `UPDATE hostel_blocks SET name = ?, description = ?, gender_type = ? WHERE id = ?`,
      [name.trim(), description ? description.trim() : null, genderType || 'Co-ed', blockId]
    );

    res.json({ success: true, message: 'Block updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update block.' });
  }
});

router.delete('/blocks/:id', (req, res) => {
  try {
    const blockId = req.params.id;

    // Check if any beds have active bookings or reservations
    const activeBed = queryOne(
      `SELECT bd.id 
       FROM beds bd
       JOIN rooms r ON bd.room_id = r.id
       WHERE r.block_id = ? AND bd.status IN ('booked', 'reserved')`,
      [blockId]
    );

    if (activeBed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete block: Contains active allocations or reserved beds. Please vacate all rooms first.'
      });
    }

    run('DELETE FROM hostel_blocks WHERE id = ?', [blockId]);
    res.json({ success: true, message: 'Hostel block deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete block.' });
  }
});

// ==========================================
// 2. FLOORS & ROOMS MANAGEMENT
// ==========================================

router.post('/floors', (req, res) => {
  try {
    const { blockId, floorNumber, name } = req.body;
    if (!blockId || floorNumber === undefined) {
      return res.status(400).json({ success: false, message: 'blockId and floorNumber are required.' });
    }

    const existing = queryOne(
      'SELECT id FROM floors WHERE block_id = ? AND floor_number = ?',
      [blockId, floorNumber]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: 'This floor number already exists in the selected block.' });
    }

    const result = run(
      `INSERT INTO floors (block_id, floor_number, name) VALUES (?, ?, ?)`,
      [blockId, floorNumber, name ? name.trim() : `Floor ${floorNumber}`]
    );

    res.status(201).json({
      success: true,
      message: 'Floor added successfully!',
      floorId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add floor.' });
  }
});

router.get('/rooms', (req, res) => {
  try {
    cleanupExpiredReservations();

    const { blockId, floorId, search } = req.query;
    let sql = `
      SELECT r.*,
             b.name as block_name, b.code as block_code,
             f.name as floor_name, f.floor_number,
             COUNT(bd.id) as current_beds_count,
             SUM(CASE WHEN bd.status = 'available' THEN 1 ELSE 0 END) as available_beds,
             SUM(CASE WHEN bd.status = 'booked' THEN 1 ELSE 0 END) as occupied_beds,
             SUM(CASE WHEN bd.status = 'reserved' THEN 1 ELSE 0 END) as reserved_beds,
             SUM(CASE WHEN bd.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_beds
      FROM rooms r
      JOIN hostel_blocks b ON r.block_id = b.id
      JOIN floors f ON r.floor_id = f.id
      LEFT JOIN beds bd ON r.id = bd.room_id
      WHERE 1=1
    `;
    const params = [];

    if (blockId) {
      sql += ' AND r.block_id = ?';
      params.push(blockId);
    }
    if (floorId) {
      sql += ' AND r.floor_id = ?';
      params.push(floorId);
    }
    if (search) {
      sql += ' AND (r.room_number LIKE ? OR r.facilities LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ' GROUP BY r.id ORDER BY b.name ASC, f.floor_number ASC, r.room_number ASC';

    const rooms = query(sql, params);
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
  }
});

router.post('/rooms', (req, res) => {
  try {
    const { blockId, floorId, roomNumber, totalBeds, description, facilities, imageUrl } = req.body;

    if (!blockId || !floorId || !roomNumber) {
      return res.status(400).json({ success: false, message: 'Block, Floor, and Room Number are required.' });
    }

    const existing = queryOne(
      'SELECT id FROM rooms WHERE block_id = ? AND room_number = ?',
      [blockId, roomNumber.trim()]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: 'A room with this number already exists in this block.' });
    }

    const bedCount = parseInt(totalBeds, 10) || 3;
    const defaultImg = 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80';

    const newRoom = transaction(() => {
      const rRes = run(
        `INSERT INTO rooms (block_id, floor_id, room_number, total_beds, description, facilities, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          blockId,
          floorId,
          roomNumber.trim(),
          bedCount,
          description ? description.trim() : `Hostel room ${roomNumber.trim()}`,
          facilities ? facilities.trim() : 'Wi-Fi, Study Table, Fan, Wardrobe',
          imageUrl ? imageUrl.trim() : defaultImg
        ]
      );
      const roomId = rRes.lastInsertRowid;

      // Automatically generate beds for this room
      for (let i = 1; i <= bedCount; i++) {
        run(
          `INSERT INTO beds (room_id, bed_number, status) VALUES (?, ?, 'available')`,
          [roomId, `${roomNumber.trim()}-B${i}`]
        );
      }

      return { roomId };
    });

    res.status(201).json({
      success: true,
      message: `Room ${roomNumber} and ${bedCount} beds created successfully!`,
      roomId: newRoom.roomId
    });
  } catch (err) {
    console.error('[Create Room Error]', err);
    res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
});

router.put('/rooms/:id', (req, res) => {
  try {
    const roomId = req.params.id;
    const { roomNumber, description, facilities, imageUrl } = req.body;

    if (!roomNumber) {
      return res.status(400).json({ success: false, message: 'Room number is required.' });
    }

    run(
      `UPDATE rooms 
       SET room_number = ?, description = ?, facilities = ?, image_url = ?
       WHERE id = ?`,
      [roomNumber.trim(), description ? description.trim() : null, facilities ? facilities.trim() : null, imageUrl ? imageUrl.trim() : null, roomId]
    );

    res.json({ success: true, message: 'Room details updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update room.' });
  }
});

router.delete('/rooms/:id', (req, res) => {
  try {
    const roomId = req.params.id;

    // Check if any beds have active bookings or reservations
    const activeBed = queryOne(
      `SELECT id FROM beds WHERE room_id = ? AND status IN ('booked', 'reserved')`,
      [roomId]
    );

    if (activeBed) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete room: Bed(s) in this room are currently occupied or reserved. Vacate the room first.'
      });
    }

    run('DELETE FROM rooms WHERE id = ?', [roomId]);
    res.json({ success: true, message: 'Room and its unallocated beds deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete room.' });
  }
});

// ==========================================
// 3. BED MANAGEMENT
// ==========================================

router.get('/beds', (req, res) => {
  try {
    cleanupExpiredReservations();

    const { roomId, status } = req.query;
    let sql = `
      SELECT bd.*,
             r.room_number, r.facilities,
             hb.name as block_name, hb.code as block_code,
             f.name as floor_name,
             s.full_name as student_name, s.student_id_code, s.phone as student_phone
      FROM beds bd
      JOIN rooms r ON bd.room_id = r.id
      JOIN hostel_blocks hb ON r.block_id = hb.id
      JOIN floors f ON r.floor_id = f.id
      LEFT JOIN students s ON bd.reserved_by_student_id = s.id
      WHERE 1=1
    `;
    const params = [];

    if (roomId) {
      sql += ' AND bd.room_id = ?';
      params.push(roomId);
    }
    if (status) {
      sql += ' AND bd.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY hb.name ASC, r.room_number ASC, bd.bed_number ASC';

    const beds = query(sql, params);
    res.json({ success: true, beds });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch beds.' });
  }
});

router.post('/beds', (req, res) => {
  try {
    const { roomId, bedNumber, imageUrl } = req.body;
    if (!roomId || !bedNumber) {
      return res.status(400).json({ success: false, message: 'roomId and bedNumber are required.' });
    }

    const existing = queryOne(
      'SELECT id FROM beds WHERE room_id = ? AND bed_number = ?',
      [roomId, bedNumber.trim()]
    );
    if (existing) {
      return res.status(400).json({ success: false, message: 'This bed number already exists in the room.' });
    }

    const defaultBedImg = 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=600&q=80';

    const result = run(
      `INSERT INTO beds (room_id, bed_number, status, image_url) VALUES (?, ?, 'available', ?)`,
      [roomId, bedNumber.trim(), imageUrl ? imageUrl.trim() : defaultBedImg]
    );

    // Update room total_beds count
    run(
      `UPDATE rooms SET total_beds = (SELECT COUNT(*) FROM beds WHERE room_id = ?) WHERE id = ?`,
      [roomId, roomId]
    );

    res.status(201).json({
      success: true,
      message: `Bed ${bedNumber} added successfully!`,
      bedId: result.lastInsertRowid
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add bed.' });
  }
});

router.put('/beds/:id', (req, res) => {
  try {
    const bedId = req.params.id;
    const { bedNumber, imageUrl, status } = req.body;

    const bed = queryOne('SELECT * FROM beds WHERE id = ?', [bedId]);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found.' });
    }

    run(
      `UPDATE beds 
       SET bed_number = COALESCE(?, bed_number),
           image_url = COALESCE(?, image_url),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [
        bedNumber !== undefined && bedNumber !== null ? bedNumber.trim() : null,
        imageUrl !== undefined && imageUrl !== null ? imageUrl.trim() : null,
        status || null,
        bedId
      ]
    );

    res.json({
      success: true,
      message: `Bed ${bedNumber || bed.bed_number} updated successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update bed.' });
  }
});

router.put('/beds/:id/status', (req, res) => {
  try {
    const bedId = req.params.id;
    const { status } = req.body;

    if (!['available', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status can only be toggled between 'available' and 'maintenance'."
      });
    }

    const bed = queryOne('SELECT * FROM beds WHERE id = ?', [bedId]);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found.' });
    }

    if (bed.status === 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change status of a permanently booked bed. Student must vacate first.'
      });
    }

    run(
      `UPDATE beds SET status = ?, reserved_by_student_id = NULL, reserved_at = NULL, expires_at = NULL WHERE id = ?`,
      [status, bedId]
    );

    res.json({
      success: true,
      message: `Bed ${bed.bed_number} marked as ${status}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update bed status.' });
  }
});

router.post('/beds/:id/release', (req, res) => {
  try {
    const bedId = req.params.id;
    const bed = queryOne('SELECT * FROM beds WHERE id = ?', [bedId]);

    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found.' });
    }

    if (bed.status !== 'reserved') {
      return res.status(400).json({ success: false, message: 'Only temporarily reserved beds can be released here.' });
    }

    run(
      `UPDATE beds SET status = 'available', reserved_by_student_id = NULL, reserved_at = NULL, expires_at = NULL WHERE id = ?`,
      [bedId]
    );

    res.json({
      success: true,
      message: `Temporary reservation for Bed ${bed.bed_number} has been released.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to release reservation.' });
  }
});

router.delete('/beds/:id', (req, res) => {
  try {
    const bedId = req.params.id;
    const bed = queryOne('SELECT * FROM beds WHERE id = ?', [bedId]);

    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found.' });
    }

    if (bed.status === 'booked') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete bed with an active booking allocation. Must be vacated first.'
      });
    }

    run('DELETE FROM beds WHERE id = ?', [bedId]);

    // Update room total_beds
    run(
      `UPDATE rooms SET total_beds = (SELECT COUNT(*) FROM beds WHERE room_id = ?) WHERE id = ?`,
      [bed.room_id, bed.room_id]
    );

    res.json({ success: true, message: `Bed ${bed.bed_number} deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete bed.' });
  }
});

// ==========================================
// 4. STUDENT MANAGEMENT
// ==========================================

router.get('/students', (req, res) => {
  try {
    cleanupExpiredReservations();

    const { search } = req.query;
    let sql = `
      SELECT s.id, s.student_id_code, s.full_name, s.phone, s.created_at,
             u.id as user_id, u.email, u.is_active,
             b.id as booking_id, b.status as booking_status,
             bd.bed_number, r.room_number, hb.name as block_name
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN bookings b ON s.id = b.student_id AND b.status = 'confirmed'
      LEFT JOIN beds bd ON b.bed_id = bd.id
      LEFT JOIN rooms r ON b.room_id = r.id
      LEFT JOIN hostel_blocks hb ON r.block_id = hb.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      sql += ` AND (s.full_name LIKE ? OR s.student_id_code LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY s.student_id_code ASC';

    const students = query(sql, params);
    res.json({ success: true, students });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch students.' });
  }
});

router.get('/students/:id', (req, res) => {
  try {
    const studentId = req.params.id;

    const student = queryOne(
      `SELECT s.*, u.email, u.is_active
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [studentId]
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const currentBooking = queryOne(
      `SELECT b.*, bd.bed_number, r.room_number, hb.name as block_name
       FROM bookings b
       JOIN beds bd ON b.bed_id = bd.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       WHERE b.student_id = ? AND b.status = 'confirmed'`,
      [studentId]
    );

    const history = query(
      `SELECT b.*, bd.bed_number, r.room_number, hb.name as block_name
       FROM bookings b
       JOIN beds bd ON b.bed_id = bd.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       WHERE b.student_id = ?
       ORDER BY b.booked_at DESC`,
      [studentId]
    );

    res.json({
      success: true,
      student,
      currentBooking,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch student details.' });
  }
});

router.put('/students/:id/status', (req, res) => {
  try {
    const studentId = req.params.id;
    const { isActive } = req.body;

    const student = queryOne('SELECT user_id FROM students WHERE id = ?', [studentId]);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    run(
      `UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [isActive ? 1 : 0, student.user_id]
    );

    res.json({
      success: true,
      message: `Student account ${isActive ? 'activated' : 'deactivated'} successfully.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update student status.' });
  }
});

// ==========================================
// 5. BOOKING MANAGEMENT
// ==========================================

router.get('/bookings', (req, res) => {
  try {
    cleanupExpiredReservations();

    const { blockId, roomId, status, search } = req.query;
    let sql = `
      SELECT b.id, b.status, b.booked_at, b.vacated_at, b.notes,
             s.id as student_id, s.full_name as student_name, s.student_id_code, s.phone as student_phone,
             u.email as student_email,
             bd.id as bed_id, bd.bed_number,
             r.id as room_id, r.room_number,
             hb.id as block_id, hb.name as block_name, hb.code as block_code,
             f.name as floor_name
      FROM bookings b
      JOIN students s ON b.student_id = s.id
      JOIN users u ON s.user_id = u.id
      JOIN beds bd ON b.bed_id = bd.id
      JOIN rooms r ON b.room_id = r.id
      JOIN hostel_blocks hb ON r.block_id = hb.id
      JOIN floors f ON r.floor_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (blockId) {
      sql += ' AND hb.id = ?';
      params.push(blockId);
    }
    if (roomId) {
      sql += ' AND r.id = ?';
      params.push(roomId);
    }
    if (status) {
      sql += ' AND b.status = ?';
      params.push(status);
    }
    if (search) {
      sql += ' AND (s.student_id_code LIKE ? OR s.full_name LIKE ? OR r.room_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY b.booked_at DESC';

    const bookings = query(sql, params);
    res.json({ success: true, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings.' });
  }
});

router.post('/bookings/:id/cancel', (req, res) => {
  try {
    const bookingId = req.params.id;
    const { reason } = req.body;

    const booking = queryOne(
      `SELECT b.*, bd.bed_number, r.room_number 
       FROM bookings b 
       JOIN beds bd ON b.bed_id = bd.id 
       JOIN rooms r ON b.room_id = r.id 
       WHERE b.id = ?`,
      [bookingId]
    );

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only active confirmed bookings can be cancelled.' });
    }

    transaction(() => {
      // 1. Release bed
      run(
        `UPDATE beds SET status = 'available', reserved_by_student_id = NULL, reserved_at = NULL, expires_at = NULL WHERE id = ?`,
        [booking.bed_id]
      );

      // 2. Mark booking cancelled
      run(
        `UPDATE bookings 
         SET status = 'cancelled',
             vacated_at = datetime('now'),
             notes = COALESCE(notes, '') || ' | Cancelled by warden: ' || ?
         WHERE id = ?`,
        [reason ? reason.trim() : 'Administrative revocation', bookingId]
      );
    });

    res.json({
      success: true,
      message: `Booking for Room ${booking.room_number}, Bed ${booking.bed_number} has been cancelled by Warden.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking.' });
  }
});

// ==========================================
// 6. VACANCY MANAGEMENT REPORT
// ==========================================

router.get('/vacancy-report', (req, res) => {
  try {
    cleanupExpiredReservations();

    const blocks = query(`SELECT * FROM hostel_blocks ORDER BY name ASC`);
    const report = [];

    for (const b of blocks) {
      const floors = query(
        `SELECT * FROM floors WHERE block_id = ? ORDER BY floor_number ASC`,
        [b.id]
      );

      const blockReport = {
        blockId: b.id,
        blockName: b.name,
        blockCode: b.code,
        genderType: b.gender_type,
        floors: []
      };

      for (const f of floors) {
        const rooms = query(`
          SELECT r.id, r.room_number, r.total_beds,
                 COUNT(bd.id) as actual_beds,
                 SUM(CASE WHEN bd.status = 'available' THEN 1 ELSE 0 END) as available_beds,
                 SUM(CASE WHEN bd.status = 'booked' THEN 1 ELSE 0 END) as occupied_beds,
                 SUM(CASE WHEN bd.status = 'reserved' THEN 1 ELSE 0 END) as reserved_beds,
                 SUM(CASE WHEN bd.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_beds
          FROM rooms r
          LEFT JOIN beds bd ON r.id = bd.room_id
          WHERE r.floor_id = ?
          GROUP BY r.id
          ORDER BY r.room_number ASC
        `, [f.id]);

        // Load bed details for each room
        const roomDetails = [];
        for (const rm of rooms) {
          const bedList = query(`
            SELECT bd.id, bd.bed_number, bd.status,
                   s.full_name as student_name, s.student_id_code
            FROM beds bd
            LEFT JOIN students s ON bd.reserved_by_student_id = s.id
            WHERE bd.room_id = ?
            ORDER BY bd.bed_number ASC
          `, [rm.id]);

          roomDetails.push({
            ...rm,
            beds: bedList
          });
        }

        blockReport.floors.push({
          floorId: f.id,
          floorNumber: f.floor_number,
          floorName: f.name,
          rooms: roomDetails
        });
      }

      report.push(blockReport);
    }

    res.json({ success: true, report });
  } catch (err) {
    console.error('[Vacancy Report Error]', err);
    res.status(500).json({ success: false, message: 'Failed to generate vacancy report.' });
  }
});

// ==========================================
// 7. WARDEN NOTIFICATIONS
// ==========================================

router.get('/notifications', (req, res) => {
  try {
    const notifications = query(`
      SELECT n.*, s.student_id_code, s.full_name as student_name
      FROM notifications n
      LEFT JOIN students s ON n.student_id = s.id
      ORDER BY n.created_at DESC
      LIMIT 50
    `);

    const unreadCount = queryOne(`
      SELECT COUNT(*) as count FROM notifications WHERE is_read = 0
    `).count;

    res.json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (err) {
    console.error('[Notifications Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

router.put('/notifications/:id/read', (req, res) => {
  try {
    const notifId = req.params.id;
    run(`UPDATE notifications SET is_read = 1 WHERE id = ?`, [notifId]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

router.put('/notifications/read-all', (req, res) => {
  try {
    run(`UPDATE notifications SET is_read = 1 WHERE is_read = 0`);
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark notifications.' });
  }
});

router.delete('/notifications/clear', (req, res) => {
  try {
    run(`DELETE FROM notifications WHERE is_read = 1`);
    res.json({ success: true, message: 'Read notifications cleared.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications.' });
  }
});

module.exports = router;
