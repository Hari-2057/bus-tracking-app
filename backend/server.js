const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDb, openDb } = require('./database');
const routeData = require('../frontend/src/data/routeData.json');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Initialize Database
let db;
initDb().then(database => {
    db = database;
});

// Real-time connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

app.post('/api/location', async (req, res) => {
    const { busId, lat, lng } = req.body;
    if (!busId || !lat || !lng) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        if (db) {
            await db.run(
                `INSERT INTO bus_locations (busId, lat, lng) VALUES (?, ?, ?)`,
                [busId, lat, lng]
            );
        }
        io.emit('busUpdate', { busId, lat, lng, timestamp: new Date() });
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- ADVANCED SIMULATOR ---

// Using Real Road Coordinates from OSRM
const PATH_NC = routeData.nc.map(p => ({ lat: p[0], lng: p[1] })); // Nellore -> Chennai
const PATH_TC_MAIN = routeData.tc_main.map(p => ({ lat: p[0], lng: p[1] })); // Chennai -> Tirupati
const PATH_TC_KAL = routeData.tc_alt.map(p => ({ lat: p[0], lng: p[1] })); // Chennai -> Tirupati (Alt)

// Helper to interpolate between two points
function getPointAt(start, end, t) {
    return {
        lat: start.lat + (end.lat - start.lat) * t,
        lng: start.lng + (end.lng - start.lng) * t
    };
}

class Bus {
    constructor(id, routeName, type, path, originName, destName, speedPoints = 3, reverse = false) {
        this.id = id;
        this.routeName = routeName;
        this.type = type;
        this.path = path;
        this.totalPoints = path.length;
        this.originName = originName;
        this.destName = destName;
        this.speedPoints = speedPoints; // Points to skip per tick
        this.reverse = reverse;

        // Start random position
        this.currentPointIndex = Math.floor(Math.random() * (this.totalPoints - 2));
        this.progress = Math.random(); // Start at random sub-point progress
    }

    move() {
        if (!this.path || this.path.length < 2) return null;

        // Update Progress
        this.progress += this.speedPoints;

        // If progress exceeds 1, move to next index
        if (this.progress >= 1.0) {
            const steps = Math.floor(this.progress);
            this.progress -= steps;

            if (this.reverse) {
                this.currentPointIndex -= steps;
                if (this.currentPointIndex < 0) {
                    this.currentPointIndex = 0;
                    this.reverse = false; // Turn around
                    this.progress = 0;
                }
            } else {
                this.currentPointIndex += steps;
                if (this.currentPointIndex >= this.totalPoints - 1) {
                    this.currentPointIndex = this.totalPoints - 2; // Stay at second to last
                    this.reverse = true; // Turn around
                    this.progress = 0;
                }
            }
        }

        // Interpolate Position (LERP)
        const currentIndex = Math.floor(this.currentPointIndex);
        let nextIndex = this.reverse ? currentIndex - 1 : currentIndex + 1;

        // Safety clamp
        if (currentIndex < 0) return null;
        if (nextIndex < 0 || nextIndex >= this.totalPoints) {
            nextIndex = currentIndex; // Fallback
        }

        const currentPos = this.path[currentIndex];
        const nextPos = this.path[nextIndex];

        // Calculate interpolated point
        // If reverse, we are moving FROM current TO next (which is index - 1), 
        // but getPointAt logic assumes t goes 0->1.
        // Actually, logic is simpler: we are always at 'currentPointIndex' + 'progress' towards 'next'.
        // My logic above handles index updates correctly.

        const interpolatedPos = getPointAt(currentPos, nextPos, this.progress);

        return {
            busId: this.id,
            lat: interpolatedPos.lat,
            lng: interpolatedPos.lng,
            route: this.routeName,
            type: this.type,
            origin: this.reverse ? this.destName : this.originName,
            destination: this.reverse ? this.originName : this.destName,
            timestamp: new Date()
        };
    }
}

// Generate Buses
const buses = [];

// Helper to add buses on a route
function spawnBusesOnRoute(routeCode, routeName, path, origin, dest, count) {
    for (let i = 1; i <= count; i++) {
        const isReverse = i % 2 === 0;
        const isAC = i % 2 !== 0; // Alternate types

        // TNSTC Branding
        const type = isAC ? 'TNSTC AC' : 'TNSTC Non-AC';
        const busPrefix = isAC ? 'TN-01-AN' : 'TN-01-N'; // AN for Air-conditioned
        const visibleRouteName = `TNSTC ${routeName}`;

        // Reduced speed for smoother movement (1-2 points per tick)
        // Speed factor: 0.3 means it takes ~3.3 seconds to cross one gap (approx 20-25 m/s or 70-90 km/h)
        const speed = 0.3;

        buses.push(new Bus(
            `${busPrefix}-${1000 + i}`,
            visibleRouteName,
            type,
            path,
            origin,
            dest,
            speed,
            isReverse
        ));
    }
}

// 6 Buses on Nellore Route (Nellore -> Chennai)
// PATH_NC is derived from routeData.nc which was Nellore -> Chennai
spawnBusesOnRoute('TN-NLR', 'Exp 144', PATH_NC, 'Nellore', 'Chennai', 6);

// 4 Buses on Tirupati Route (Chennai -> Tirupati)
spawnBusesOnRoute('TN-TPTY', 'Ultra Deluxe', PATH_TC_MAIN, 'Chennai', 'Tirupati', 4);

// 4 Buses on Tirupati Route (Alt)
spawnBusesOnRoute('TN-TPTY', 'Super Fast', PATH_TC_KAL, 'Chennai', 'Tirupati', 4);


setInterval(async () => {
    for (const bus of buses) {
        const data = bus.move();
        if (!data) continue;

        io.emit('busUpdate', data);

        if (db) {
            db.run(
                `INSERT INTO bus_locations (busId, lat, lng) VALUES (?, ?, ?)`,
                [data.busId, data.lat, data.lng]
            ).catch(() => { });
        }
    }
}, 1000);

// --- SERVE FRONTEND (Production) ---
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

app.get(/.*/, (req, res) => {
    // If the request is for an API endpoint, don't serve index.html (though express.static handles this usually, the order matters)
    // Actually, since this is the last route, it acts as a catch-all for SPA client-side routing.
    res.sendFile(path.join(distPath, 'index.html'));
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
