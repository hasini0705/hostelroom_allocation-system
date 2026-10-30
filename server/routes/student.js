const express = require('express');
const router = express.Router();
const { query, queryOne, run, transaction, createNotification } = require('../database/db');
const { requireStudent } = require('../middleware/auth');
const { cleanupExpiredReservations } = require('../utils/expiryWorker');

/**
 * GET /api/student/dashboard
 * Return complete student dashboard data
 */
router.get('/dashboard', requireStudent, (req, res) => {
  try {
    cleanupExpiredReservations();

    const studentId = req.user.studentId;

    // Student profile
    const student = queryOne(
      `SELECT s.id, s.student_id_code, s.full_name, s.phone, u.email, s.created_at
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [studentId]
    );

    // Current active confirmed allocation
    const currentAllocation = queryOne(
      `SELECT b.id as booking_id, b.booked_at, b.status as booking_status,
              bd.id as bed_id, bd.bed_number,
              r.id as room_id, r.room_number, r.facilities, r.image_url, r.description as room_description,
              hb.id as block_id, hb.name as block_name, hb.code as block_code, hb.gender_type,
              f.id as floor_id, f.name as floor_name, f.floor_number
       FROM bookings b
       JOIN beds bd ON b.bed_id = bd.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       JOIN floors f ON r.floor_id = f.id
       WHERE b.student_id = ? AND b.status = 'confirmed' AND bd.status = 'booked'
       ORDER BY b.booked_at DESC LIMIT 1`,
      [studentId]
    );

    // Current temporary reservation if holding one
    const activeHold = queryOne(
      `SELECT bd.id as bed_id, bd.bed_number, bd.reserved_at, bd.expires_at,
              r.id as room_id, r.room_number, r.facilities, r.image_url,
              hb.name as block_name, hb.code as block_code,
              f.name as floor_name
       FROM beds bd
       JOIN rooms r ON bd.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       JOIN floors f ON r.floor_id = f.id
       WHERE bd.reserved_by_student_id = ? AND bd.status = 'reserved' AND bd.expires_at > datetime('now')`,
      [studentId]
    );

    let holdRemainingSeconds = 0;
    if (activeHold) {
      const expiresAtMs = new Date(activeHold.expires_at.replace(' ', 'T') + 'Z').getTime();
      holdRemainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
    }

    // Booking History
    const history = query(
      `SELECT b.id, b.status, b.booked_at, b.vacated_at, b.notes,
              bd.bed_number, r.room_number, hb.name as block_name, f.name as floor_name
       FROM bookings b
       JOIN beds bd ON b.bed_id = bd.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       JOIN floors f ON r.floor_id = f.id
       WHERE b.student_id = ?
       ORDER BY b.booked_at DESC`,
      [studentId]
    );

    // Available hostel rooms summary count
    const summary = queryOne(`
      SELECT 
        (SELECT COUNT(*) FROM hostel_blocks) as total_blocks,
        (SELECT COUNT(*) FROM rooms) as total_rooms,
        (SELECT COUNT(*) FROM beds WHERE status = 'available') as available_beds
    `);

    res.json({
      success: true,
      student,
      currentAllocation,
      activeHold: activeHold ? { ...activeHold, remainingSeconds: holdRemainingSeconds } : null,
      history,
      summary
    });
  } catch (err) {
    console.error('[Student Dashboard Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch student dashboard details.' });
  }
});

/**
 * POST /api/student/vacate
 * Student vacates their currently allocated bed
 */
router.post('/vacate', requireStudent, (req, res) => {
  try {
    const studentId = req.user.studentId;

    // Find active booking
    const activeBooking = queryOne(
      `SELECT b.id as booking_id, b.bed_id, b.room_id, bd.bed_number, r.room_number, hb.name as block_name
       FROM bookings b
       JOIN beds bd ON b.bed_id = bd.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       WHERE b.student_id = ? AND b.status = 'confirmed' AND bd.status = 'booked'`,
      [studentId]
    );

    if (!activeBooking) {
      return res.status(404).json({
        success: false,
        message: 'You do not have any currently active allocated room/bed to vacate.'
      });
    }

    transaction(() => {
      // 1. Set bed status back to available
      run(
        `UPDATE beds 
         SET status = 'available',
             reserved_by_student_id = NULL,
             reserved_at = NULL,
             expires_at = NULL
         WHERE id = ?`,
        [activeBooking.bed_id]
      );

      // 2. Mark booking as vacated
      run(
        `UPDATE bookings 
         SET status = 'vacated',
             vacated_at = datetime('now'),
             notes = COALESCE(notes, '') || ' | Vacated by student on ' || datetime('now')
         WHERE id = ?`,
        [activeBooking.booking_id]
      );
    });

    console.log(`[Vacate] Student ID ${studentId} successfully vacated Bed ${activeBooking.bed_number} (Room ${activeBooking.room_number})`);

    // Notify Warden
    createNotification({
      type: 'room_vacated',
      title: 'Room & Bed Vacated',
      message: `${req.user.fullName || 'Student'} (${req.user.studentCode || ''}) vacated Bed ${activeBooking.bed_number} in Room ${activeBooking.room_number} (${activeBooking.block_name}). Bed is now Available.`,
      studentId,
      roomId: activeBooking.room_id,
      bedId: activeBooking.bed_id
    });

    res.json({
      success: true,
      message: `Room ${activeBooking.room_number}, Bed ${activeBooking.bed_number} in ${activeBooking.block_name} has been successfully vacated and is now open for new allocations.`
    });
  } catch (err) {
    console.error('[Vacate Room Error]', err);
    res.status(500).json({ success: false, message: 'Failed to vacate room.' });
  }
});

module.exports = router;
