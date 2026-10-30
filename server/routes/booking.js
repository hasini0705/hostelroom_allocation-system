const express = require('express');
const router = express.Router();
const { query, queryOne, run, transaction, createNotification } = require('../database/db');
const { requireStudent } = require('../middleware/auth');
const { cleanupExpiredReservations } = require('../utils/expiryWorker');

const RESERVATION_MINUTES = 5;

/**
 * POST /api/booking/reserve
 * Student selects an available bed - temporarily locks it for 5 minutes
 */
router.post('/reserve', requireStudent, (req, res) => {
  try {
    cleanupExpiredReservations();

    const studentId = req.user.studentId;
    const { bedId } = req.body;

    if (!bedId) {
      return res.status(400).json({ success: false, message: 'bedId is required.' });
    }

    // 1. Check if student already has an active confirmed booking
    const activeBooking = queryOne(
      `SELECT b.*, bd.bed_number, r.room_number, hb.name as block_name
       FROM bookings b
       JOIN beds bd ON b.bed_id = bd.id
       JOIN rooms r ON b.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       WHERE b.student_id = ? AND b.status = 'confirmed'`,
      [studentId]
    );

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: `You already have an active room allocation: Room ${activeBooking.room_number}, Bed ${activeBooking.bed_number} in ${activeBooking.block_name}. You must vacate your current room before booking another.`
      });
    }

    // 2. Check if student already holds another active temporary reservation
    const existingHold = queryOne(
      `SELECT bd.*, r.room_number 
       FROM beds bd
       JOIN rooms r ON bd.room_id = r.id
       WHERE bd.reserved_by_student_id = ? AND bd.status = 'reserved' AND bd.expires_at > datetime('now')`,
      [studentId]
    );

    if (existingHold && existingHold.id !== Number(bedId)) {
      return res.status(400).json({
        success: false,
        message: `You already hold a temporary reservation for Bed ${existingHold.bed_number} (Room ${existingHold.room_number}). Confirm or cancel it before reserving another bed.`
      });
    }

    // 3. Atomically lock the bed using a transaction
    const reservation = transaction(() => {
      const targetBed = queryOne(
        `SELECT bd.*, r.room_number, r.block_id, hb.name as block_name, f.name as floor_name
         FROM beds bd
         JOIN rooms r ON bd.room_id = r.id
         JOIN hostel_blocks hb ON r.block_id = hb.id
         JOIN floors f ON r.floor_id = f.id
         WHERE bd.id = ?`,
        [bedId]
      );

      if (!targetBed) {
        throw new Error('Bed not found.');
      }

      if (targetBed.status === 'booked') {
        throw new Error('This bed is already permanently occupied.');
      }

      if (targetBed.status === 'maintenance') {
        throw new Error('This bed is currently under maintenance.');
      }

      // If reserved by someone else and still valid
      if (
        targetBed.status === 'reserved' &&
        targetBed.reserved_by_student_id !== studentId &&
        new Date(targetBed.expires_at.replace(' ', 'T') + 'Z') > new Date()
      ) {
        throw new Error('This bed has just been temporarily reserved by another student. Please select another bed.');
      }

      // Lock the bed for 5 minutes
      run(
        `UPDATE beds 
         SET status = 'reserved',
             reserved_by_student_id = ?,
             reserved_at = datetime('now'),
             expires_at = datetime('now', '+${RESERVATION_MINUTES} minutes')
         WHERE id = ?`,
        [studentId, bedId]
      );

      const updatedBed = queryOne(
        `SELECT bd.*, r.room_number, hb.name as block_name, f.name as floor_name
         FROM beds bd
         JOIN rooms r ON bd.room_id = r.id
         JOIN hostel_blocks hb ON r.block_id = hb.id
         JOIN floors f ON r.floor_id = f.id
         WHERE bd.id = ?`,
        [bedId]
      );

      return updatedBed;
    });

    const expiresAtMs = new Date(reservation.expires_at.replace(' ', 'T') + 'Z').getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    // Notify Warden
    createNotification({
      type: 'bed_reserved',
      title: 'Temporary 5-Min Hold Placed',
      message: `${req.user.fullName || 'Student'} (${req.user.studentCode || ''}) placed a 5-minute hold on Bed ${reservation.bed_number} in Room ${reservation.room_number} (${reservation.block_name}).`,
      studentId,
      roomId: reservation.room_id,
      bedId: reservation.id
    });

    res.json({
      success: true,
      message: `Bed ${reservation.bed_number} locked for 5 minutes. Please confirm your booking before the timer expires.`,
      bed: reservation,
      expiresAt: reservation.expires_at,
      remainingSeconds
    });
  } catch (err) {
    console.error('[Booking Reserve Error]', err.message);
    res.status(400).json({ success: false, message: err.message || 'Failed to reserve bed.' });
  }
});

/**
 * POST /api/booking/confirm
 * Student confirms the booking before the 5-minute timer expires
 */
router.post('/confirm', requireStudent, (req, res) => {
  try {
    cleanupExpiredReservations();

    const studentId = req.user.studentId;
    const { bedId } = req.body;

    if (!bedId) {
      return res.status(400).json({ success: false, message: 'bedId is required.' });
    }

    const booking = transaction(() => {
      // 1. Verify bed is currently reserved by this student and NOT expired
      const targetBed = queryOne(
        `SELECT bd.*, r.id as room_id, r.room_number, hb.name as block_name
         FROM beds bd
         JOIN rooms r ON bd.room_id = r.id
         JOIN hostel_blocks hb ON r.block_id = hb.id
         WHERE bd.id = ?`,
        [bedId]
      );

      if (!targetBed) {
        throw new Error('Bed record not found.');
      }

      if (targetBed.status !== 'reserved' || targetBed.reserved_by_student_id !== studentId) {
        throw new Error('You do not hold an active reservation for this bed.');
      }

      const now = new Date();
      const expiresAt = new Date(targetBed.expires_at.replace(' ', 'T') + 'Z');
      if (now > expiresAt) {
        // Release bed
        run(
          `UPDATE beds SET status = 'available', reserved_by_student_id = NULL, reserved_at = NULL, expires_at = NULL WHERE id = ?`,
          [bedId]
        );
        throw new Error('Your 5-minute reservation timer has expired. The bed has been released.');
      }

      // 2. Mark bed as booked permanently
      run(
        `UPDATE beds 
         SET status = 'booked',
             expires_at = NULL
         WHERE id = ?`,
        [bedId]
      );

      // 3. Insert into bookings table
      const bRes = run(
        `INSERT INTO bookings (student_id, bed_id, room_id, status, booked_at, notes)
         VALUES (?, ?, ?, 'confirmed', datetime('now'), 'Student self-service booking confirmed')`,
        [studentId, bedId, targetBed.room_id]
      );

      return {
        bookingId: bRes.lastInsertRowid,
        bedId,
        roomId: targetBed.room_id,
        bedNumber: targetBed.bed_number,
        roomNumber: targetBed.room_number,
        blockName: targetBed.block_name
      };
    });

    // Notify Warden of permanent allocation
    createNotification({
      type: 'booking_confirmed',
      title: 'Bed Allocation Confirmed',
      message: `${req.user.fullName || 'Student'} (${req.user.studentCode || ''}) confirmed permanent booking for Room ${booking.roomNumber}, Bed ${booking.bedNumber} in ${booking.blockName}.`,
      studentId,
      roomId: booking.roomId,
      bedId: booking.bedId
    });

    res.json({
      success: true,
      message: `Congratulations! Room ${booking.roomNumber}, Bed ${booking.bedNumber} in ${booking.blockName} has been successfully allocated to you.`,
      booking
    });
  } catch (err) {
    console.error('[Booking Confirm Error]', err.message);
    res.status(400).json({ success: false, message: err.message || 'Booking confirmation failed.' });
  }
});

/**
 * POST /api/booking/cancel
 * Student cancels their temporary 5-minute reservation
 */
router.post('/cancel', requireStudent, (req, res) => {
  try {
    const studentId = req.user.studentId;
    const { bedId } = req.body;

    const targetBed = queryOne(
      `SELECT * FROM beds WHERE id = ? AND reserved_by_student_id = ? AND status = 'reserved'`,
      [bedId, studentId]
    );

    if (!targetBed) {
      return res.status(404).json({ success: false, message: 'No active reservation found to cancel.' });
    }

    run(
      `UPDATE beds 
       SET status = 'available',
           reserved_by_student_id = NULL,
           reserved_at = NULL,
           expires_at = NULL
       WHERE id = ?`,
      [bedId]
    );

    // Notify Warden
    createNotification({
      type: 'reservation_cancelled',
      title: 'Temporary Hold Cancelled',
      message: `${req.user.fullName || 'Student'} (${req.user.studentCode || ''}) cancelled their reservation on Bed ${targetBed.bed_number}. Bed is now Available.`,
      studentId,
      roomId: targetBed.room_id,
      bedId
    });

    res.json({
      success: true,
      message: `Temporary reservation for Bed ${targetBed.bed_number} cancelled. The bed is now available for other students.`
    });
  } catch (err) {
    console.error('[Booking Cancel Error]', err);
    res.status(500).json({ success: false, message: 'Failed to cancel reservation.' });
  }
});

/**
 * GET /api/booking/current-hold
 * Fetch current reservation hold for student if active
 */
router.get('/current-hold', requireStudent, (req, res) => {
  try {
    cleanupExpiredReservations();

    const studentId = req.user.studentId;
    const hold = queryOne(
      `SELECT bd.*, r.room_number, r.image_url, r.facilities,
              hb.name as block_name, hb.code as block_code,
              f.name as floor_name
       FROM beds bd
       JOIN rooms r ON bd.room_id = r.id
       JOIN hostel_blocks hb ON r.block_id = hb.id
       JOIN floors f ON r.floor_id = f.id
       WHERE bd.reserved_by_student_id = ? AND bd.status = 'reserved' AND bd.expires_at > datetime('now')`,
      [studentId]
    );

    if (!hold) {
      return res.json({ success: true, hold: null });
    }

    const expiresAtMs = new Date(hold.expires_at.replace(' ', 'T') + 'Z').getTime();
    const remainingSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

    res.json({
      success: true,
      hold,
      remainingSeconds
    });
  } catch (err) {
    console.error('[Current Hold Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch reservation status.' });
  }
});

module.exports = router;
