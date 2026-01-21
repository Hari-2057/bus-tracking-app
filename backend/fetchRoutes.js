const fs = require('fs');
const http = require('http');

const fetchRoute = (coords) => {
    return new Promise((resolve, reject) => {
        // OSRM expects: lon,lat;lon,lat
        const coordString = coords.map(c => `${c[1]},${c[0]}`).join(';');
        const url = `http://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

        http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.routes && json.routes[0]) {
                        // GeoJSON is [lon, lat], Leaflet wants [lat, lon]
                        const latLngs = json.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
                        resolve(latLngs);
                    } else {
                        reject('No route found');
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};

const main = async () => {
    try {
        console.log('Fetching Nellore - Chennai...');
        const nc = await fetchRoute([
            [14.4426, 79.9865], // Nellore
            [13.0827, 80.2707]  // Chennai
        ]);

        console.log('Fetching Chennai - Tirupati (Main)...');
        const tc_main = await fetchRoute([
            [13.0827, 80.2707], // Chennai
            [13.1819, 79.6105], // Tiruttani
            [13.6288, 79.4192]  // Tirupati
        ]);

        console.log('Fetching Chennai - Tirupati (Alt)...');
        const tc_alt = await fetchRoute([
            [13.0827, 80.2707], // Chennai
            [13.5908, 80.0270], // Tada
            [13.7505, 79.7042], // Srikalahasti
            [13.6288, 79.4192]  // Tirupati
        ]);

        const data = {
            nc,
            tc_main,
            tc_alt
        };

        // Ensure directory exists
        const dir = '../frontend/src/data';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync('../frontend/src/data/routeData.json', JSON.stringify(data));
        console.log('Routes saved to frontend/src/data/routeData.json');

    } catch (err) {
        console.error('Error fetching routes:', err);
    }
};

main();
