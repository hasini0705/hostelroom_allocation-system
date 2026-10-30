const express = require('express');
const router = express.Router();
const { query, queryOne } = require('../database/db');
const { cleanupExpiredReservations } = require('../utils/expiryWorker');

/**
 * GET /api/hostel/blocks
 * List all blocks with summary counters
 */
router.get('/blocks', (req, res) => {
  try {
    cleanupExpiredReservations();

    const blocks = query(`
      SELECT b.id, b.name, b.code, b.description, b.gender_type,
             COUNT(DISTINCT f.id) as total_floors,
             COUNT(DISTINCT r.id) as total_rooms,
             COUNT(bd.id) as total_beds,
             SUM(CASE WHEN bd.status = 'available' THEN 1 ELSE 0 END) as available_beds,
             SUM(CASE WHEN bd.status = 'booked' THEN 1 ELSE 0 END) as occupied_beds,
             SUM(CASE WHEN bd.status = 'reserved' THEN 1 ELSE 0 END) as reserved_beds,
             SUM(CASE WHEN bd.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_beds
      FROM hostel_blocks b
      LEFT JOIN floors f ON b.id = f.block_id
      LEFT JOIN rooms r ON b.id = r.block_id
      LEFT JOIN beds bd ON r.id = bd.room_id
      GROUP BY b.id
      ORDER BY b.name ASC
    `);

    res.json({ success: true, blocks });
  } catch (err) {
    console.error('[Hostel Blocks Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch hostel blocks.' });
  }
});

/**
 * GET /api/hostel/floors
 * Fetch floors for a block
 */
router.get('/floors', (req, res) => {
  try {
    const { blockId } = req.query;
    if (!blockId) {
      return res.status(400).json({ success: false, message: 'blockId is required.' });
    }

    const floors = query(
      `SELECT f.id, f.block_id, f.floor_number, f.name,
              COUNT(r.id) as total_rooms
       FROM floors f
       LEFT JOIN rooms r ON f.id = r.floor_id
       WHERE f.block_id = ?
       GROUP BY f.id
       ORDER BY f.floor_number ASC`,
      [blockId]
    );

    res.json({ success: true, floors });
  } catch (err) {
    console.error('[Hostel Floors Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch floors.' });
  }
});

/**
 * GET /api/hostel/rooms
 * Fetch rooms filtered by block and floor
 */
router.get('/rooms', (req, res) => {
  try {
    cleanupExpiredReservations();

    const { blockId, floorId, search } = req.query;
    let sql = `
      SELECT r.id, r.block_id, r.floor_id, r.room_number, r.total_beds,
             r.description, r.facilities, r.image_url,
             b.name as block_name, b.code as block_code, b.gender_type,
             f.name as floor_name, f.floor_number,
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
    console.error('[Hostel Rooms Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch rooms.' });
  }
});

/**
 * GET /api/hostel/rooms/:id
 * Fetch room details and all its individual beds
 */
router.get('/rooms/:id', (req, res) => {
  try {
    cleanupExpiredReservations();

    const roomId = req.params.id;

    const room = queryOne(
      `SELECT r.*, b.name as block_name, b.code as block_code, b.gender_type,
              f.name as floor_name, f.floor_number
       FROM rooms r
       JOIN hostel_blocks b ON r.block_id = b.id
       JOIN floors f ON r.floor_id = f.id
       WHERE r.id = ?`,
      [roomId]
    );

    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found.' });
    }

    const beds = query(
      `SELECT bd.id, bd.room_id, bd.bed_number, bd.status, bd.reserved_by_student_id,
              bd.reserved_at, bd.expires_at, bd.image_url,
              s.full_name as student_name, s.student_id_code
       FROM beds bd
       LEFT JOIN students s ON bd.reserved_by_student_id = s.id
       WHERE bd.room_id = ?
       ORDER BY bd.bed_number ASC`,
      [roomId]
    );

    res.json({
      success: true,
      room,
      beds
    });
  } catch (err) {
    console.error('[Hostel Room Detail Error]', err);
    res.status(500).json({ success: false, message: 'Failed to fetch room details.' });
  }
});

module.exports = router;
