const routeData = require('./frontend/src/data/routeData.json');

function haversineDistance(coords1, coords2) {
    function toRad(x) {
        return (x * Math.PI) / 180;
    }

    var lat1 = coords1[0];
    var lon1 = coords1[1];
    var lat2 = coords2[0];
    var lon2 = coords2[1];

    var R = 6371; // km

    var x1 = lat2 - lat1;
    var dLat = toRad(x1);
    var x2 = lon2 - lon1;
    var dLon = toRad(x2);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;

    return d;
}

function analyzeRoute(name, points) {
    let totalDist = 0;
    let maxDist = 0;
    let gaps = 0;

    for (let i = 0; i < points.length - 1; i++) {
        const d = haversineDistance(points[i], points[i + 1]);
        totalDist += d;
        if (d > maxDist) maxDist = d;
        if (d > 0.5) gaps++; // Gaps larger than 500m
    }

    const avgDist = totalDist / (points.length - 1);
    console.log(`Route: ${name}`);
    console.log(`  Total Points: ${points.length}`);
    console.log(`  Total Distance: ${totalDist.toFixed(2)} km`);
    console.log(`  Avg Gap: ${(avgDist * 1000).toFixed(2)} meters`);
    console.log(`  Max Gap: ${maxDist.toFixed(2)} km`);
    console.log(`  Large Gaps (>500m): ${gaps}`);
    console.log('-----------------------------------');
}

analyzeRoute('Nellore (nc)', routeData.nc);
analyzeRoute('Tirupati Main (tc_main)', routeData.tc_main);
analyzeRoute('Tirupati Alt (tc_alt)', routeData.tc_alt);
