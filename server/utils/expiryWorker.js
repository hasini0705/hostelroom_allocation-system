const { query, run, transaction } = require('../database/db');

/**
 * Release all expired temporary bed reservations
 */
function cleanupExpiredReservations() {
  try {
    const expiredBeds = query(
      `SELECT id, room_id, bed_number, reserved_by_student_id, expires_at 
       FROM beds 
       WHERE status = 'reserved' AND expires_at <= datetime('now')`
    );

    if (expiredBeds.length > 0) {
      console.log(`[Expiry Worker] Found ${expiredBeds.length} expired reservation(s). Releasing...`);

      transaction(() => {
        for (const bed of expiredBeds) {
          run(
            `UPDATE beds 
             SET status = 'available', 
                 reserved_by_student_id = NULL, 
                 reserved_at = NULL, 
                 expires_at = NULL 
             WHERE id = ?`,
            [bed.id]
          );
          console.log(`[Expiry Worker] Released Bed #${bed.id} (${bed.bed_number})`);
        }
      });
    }
  } catch (err) {
    console.error('[Expiry Worker Error]', err);
  }
}

let intervalTimer = null;

function startExpiryWorker(intervalMs = 5000) {
  // Run immediately on boot
  cleanupExpiredReservations();

  if (intervalTimer) clearInterval(intervalTimer);
  intervalTimer = setInterval(cleanupExpiredReservations, intervalMs);
  console.log(`[Expiry Worker] Running background cleanup every ${intervalMs / 1000}s`);
}

function stopExpiryWorker() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
}

module.exports = {
  cleanupExpiredReservations,
  startExpiryWorker,
  stopExpiryWorker
};
