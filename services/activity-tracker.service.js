const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * ActivityTracker Service (Main Process)
 * 
 * Tracks:
 * - Mouse/keyboard activity (from renderer via IPC)
 * - Active window changes (via active-win)
 * - Idle detection after 5 minutes of no activity
 * - Active/Idle time using timestamps (not setInterval drift)
 * - Offline queue for failed snapshot requests
 */
class ActivityTracker {
    constructor() {
        this.isTracking = false;
        this.status = 'idle'; // 'working' | 'idle'

        // Timestamp-based time tracking (avoids setInterval drift)
        this.activeSeconds = 0;
        this.idleSeconds = 0;
        this.sessionStartAt = null;
        this.lastTickAt = null;
        this.lastActivityAt = null;

        // Active window
        this.currentApp = 'Unknown';
        this.windowTitle = 'N/A';
        this.lastWindowTitle = null;

        // Idle threshold: 5 minutes
        this.IDLE_THRESHOLD_MS = 5 * 60 * 1000;

        // Polling interval handles
        this._tickInterval = null;
        this._windowInterval = null;

        // Offline queue path
        this._queuePath = path.join(
            process.env.APPDATA || os.homedir(),
            'TargetupApp',
            'activity-queue.json'
        );
        this._ensureQueueDir();

        // active-win (loaded lazily)
        this._activeWin = null;
    }

    _ensureQueueDir() {
        const dir = path.dirname(this._queuePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    async _loadActiveWin() {
        if (!this._activeWin) {
            try {
                this._activeWin = (await import('active-win')).default;
            } catch (e) {
                console.warn('[ActivityTracker] active-win not available:', e.message);
                this._activeWin = null;
            }
        }
        return this._activeWin;
    }

    /**
     * Call this from IPC when renderer detects mouse/keyboard event
     */
    recordActivity() {
        this.lastActivityAt = Date.now();
    }

    /**
     * Tick — called every second internally
     * Uses timestamp deltas instead of trusting setInterval timing
     */
    _tick() {
        const now = Date.now();
        const delta = this.lastTickAt ? (now - this.lastTickAt) / 1000 : 0;
        this.lastTickAt = now;

        // Check idle: no mouse/keyboard/window-change for IDLE_THRESHOLD_MS
        const timeSinceActivity = now - (this.lastActivityAt || now);
        const wasActive = this.status === 'working';

        if (timeSinceActivity < this.IDLE_THRESHOLD_MS) {
            this.status = 'working';
            this.activeSeconds += delta;
        } else {
            this.status = 'idle';
            this.idleSeconds += delta;
        }
    }

    /**
     * Poll active window every 10 seconds
     * Window title change counts as activity
     */
    async _pollWindow() {
        try {
            const activeWin = await this._loadActiveWin();
            if (!activeWin) return;

            const win = await activeWin();
            const newApp   = win?.owner?.name  || 'Unknown';
            const newTitle = win?.title        || 'N/A';

            // Window change = activity (watching video, reading, etc.)
            if (newTitle !== this.lastWindowTitle && newTitle !== 'N/A') {
                this.recordActivity();
            }

            this.currentApp        = newApp;
            this.windowTitle       = newTitle;
            this.lastWindowTitle   = newTitle;
        } catch (err) {
            // Silently ignore window polling errors
        }
    }

    /**
     * Start tracking. Call after employee checks in.
     */
    start() {
        if (this.isTracking) return;
        this.isTracking = true;
        this.sessionStartAt = Date.now();
        this.lastTickAt = Date.now();
        this.lastActivityAt = Date.now();
        this.activeSeconds = 0;
        this.idleSeconds = 0;
        this.status = 'working';

        // Tick every second
        this._tickInterval = setInterval(() => this._tick(), 1000);

        // Poll active window every 10 seconds
        this._windowInterval = setInterval(() => this._pollWindow(), 10000);
        this._pollWindow(); // immediate first poll

        console.log('[ActivityTracker] Started');
    }

    /**
     * Stop tracking. Call on checkout.
     */
    stop() {
        if (!this.isTracking) return;
        this.isTracking = false;
        clearInterval(this._tickInterval);
        clearInterval(this._windowInterval);
        this._tickInterval = null;
        this._windowInterval = null;
        console.log('[ActivityTracker] Stopped');
    }

    /**
     * Get a snapshot of current metrics for sending to backend
     */
    getSnapshot() {
        return {
            status: this.isTracking ? this.status : 'offline',
            activeSeconds: Math.round(this.activeSeconds),
            idleSeconds:   Math.round(this.idleSeconds),
            currentApp:    this.currentApp  || 'Unknown',
            windowTitle:   this.windowTitle || 'N/A',
            timestamp:     new Date().toISOString()
        };
    }

    // ─── Offline Queue ────────────────────────────────────────────────────────

    /**
     * Push a failed snapshot to local queue
     */
    queueSnapshot(snapshot) {
        try {
            let queue = this.readQueue();
            queue.push(snapshot);
            // Keep max 200 items to prevent unbounded growth
            if (queue.length > 200) queue = queue.slice(-200);
            fs.writeFileSync(this._queuePath, JSON.stringify(queue), 'utf8');
        } catch (e) {
            console.warn('[ActivityTracker] Failed to write offline queue:', e.message);
        }
    }

    /**
     * Read all queued snapshots
     */
    readQueue() {
        try {
            if (!fs.existsSync(this._queuePath)) return [];
            return JSON.parse(fs.readFileSync(this._queuePath, 'utf8')) || [];
        } catch {
            return [];
        }
    }

    /**
     * Clear the queue after successful flush
     */
    clearQueue() {
        try {
            fs.writeFileSync(this._queuePath, '[]', 'utf8');
        } catch (e) {
            console.warn('[ActivityTracker] Failed to clear queue:', e.message);
        }
    }

    /**
     * Check if there are queued snapshots
     */
    hasQueuedSnapshots() {
        return this.readQueue().length > 0;
    }
}

module.exports = new ActivityTracker();
