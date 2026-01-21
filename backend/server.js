const express = require('express');
const http = require('http');
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

const PORT = 3000;

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
        this.currentPointIndex = Math.floor(Math.random() * (this.totalPoints - 1));
    }

    move() {
        if (!this.path || this.path.length < 2) return null;

        // Update Index
        if (this.reverse) {
            this.currentPointIndex -= this.speedPoints;
            if (this.currentPointIndex <= 0) {
                this.currentPointIndex = 0;
                this.reverse = false; // Turn around
            }
        } else {
            this.currentPointIndex += this.speedPoints;
            if (this.currentPointIndex >= this.totalPoints - 1) {
                this.currentPointIndex = this.totalPoints - 1;
                this.reverse = true; // Turn around
            }
        }

        const currentPos = this.path[Math.floor(this.currentPointIndex)];

        return {
            busId: this.id,
            lat: currentPos.lat,
            lng: currentPos.lng,
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

        // Random speed between 2 and 6 points per tick
        const speed = 2 + Math.floor(Math.random() * 4);

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

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
