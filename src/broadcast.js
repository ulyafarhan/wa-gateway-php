// ponytail: broadcast — priority queue + scheduled broadcast + session pooling
import crypto from 'crypto';
import db from './db.js';
import { enqueueMessage } from './session.js';

const RATE_LIMIT_MS = parseInt(process.env.RATE_LIMIT_MS || '1500', 10);

// Ponytail: throttle per priority — high=1.5s, normal=3s, low=6s
const PRIORITY_THROTTLE = { high: 1, normal: 2, low: 4 };

let broadcastProcessorRunning = false;

export function enqueueBroadcast(sessionId, tenantId, targets, text, priority = 'normal', scheduleAt = null) {
    const broadcastId = crypto.randomUUID();
    const totalTargets = targets.length;

    const now = Date.now();
    if (scheduleAt) {
        db.prepare(`INSERT INTO broadcast_jobs (id, tenant_id, total_targets, message, status, created_at) VALUES (?, ?, ?, ?, 'scheduled', ?)`)
            .run(broadcastId, tenantId, totalTargets, text || '', now);
        db.prepare(`UPDATE broadcast_jobs SET schedule_at = ? WHERE id = ?`).run(new Date(scheduleAt).getTime(), broadcastId);
    } else {
        db.prepareInsertBroadcastJob.run(broadcastId, tenantId, totalTargets, text || '', now);
    }

    db.prepareInsertBroadcastAssignment.run(
        crypto.randomUUID(), broadcastId, sessionId, JSON.stringify(targets)
    );

    return {
        broadcast_id: broadcastId,
        total_targets: totalTargets,
        priority,
        schedule_at: scheduleAt,
        status: scheduleAt ? 'scheduled' : 'queued',
        estimated_duration_seconds: Math.ceil(totalTargets * RATE_LIMIT_MS * PRIORITY_THROTTLE[priority] / 1000),
    };
}

export function processScheduledBroadcasts() {
    const now = Date.now();
    const scheduled = db.prepare(`UPDATE broadcast_jobs SET status = 'queued' WHERE status = 'scheduled' AND schedule_at <= ?`).run(now);
    if (scheduled.changes) db.prepare(`UPDATE broadcast_jobs SET status = 'queued' WHERE status = 'scheduled' AND schedule_at IS NULL AND created_at <= ?`).run(now);
    return scheduled.changes;
}

// Start broadcast processor (processes queued broadcasts)
export function startBroadcastProcessor() {
    if (broadcastProcessorRunning) return;
    broadcastProcessorRunning = true;

    setInterval(async () => {
        processScheduledBroadcasts();

        const pending = db.prepareGetPendingBroadcasts.all();
        for (const job of pending) {
            const assignments = db.prepareGetBroadcastAssignments.all(job.id);
            for (const assignment of assignments) {
                if (assignment.status === 'completed') continue;
                const allTargets = JSON.parse(assignment.targets || '[]');
                const offset = assignment.offset || 0;
                const batch = allTargets.slice(offset, offset + 10);
                if (!batch.length) { db.prepareUpdateBroadcastProgress.run(0, 0, 'completed', assignment.id); continue; }

                const msg = job.message || '';
                let sent = 0, failed = 0;
                for (const target of batch) {
                    await sleep(RATE_LIMIT_MS * PRIORITY_THROTTLE[job.priority || 'normal']);
                    try {
                        enqueueMessage(assignment.session_id, {
                            type: 'text', chatId: target, text: msg,
                            priority: job.priority || 'normal'
                        });
                        sent++;
                    } catch (e) {
                        failed++;
                    }
                }

                const newOffset = offset + batch.length;
                const done = newOffset >= allTargets.length;
                db.prepare(`UPDATE broadcast_assignments SET offset = ?, sent = sent + ?, failed = failed + ?, status = ? WHERE id = ?`)
                    .run(newOffset, sent, failed, done ? 'completed' : 'running', assignment.id);
                db.prepareUpdateBroadcastJob.run(sent, failed, 'running', null, job.id);
            }

            // Check if all assignments completed
            const remaining = db.prepareGetBroadcastAssignments.all(job.id);
            if (remaining.every(a => a.status === 'completed')) {
                db.prepareUpdateBroadcastJob.run(0, 0, 'completed', Date.now(), job.id);
            }
        }
    }, 5000); // Check every 5 seconds
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
