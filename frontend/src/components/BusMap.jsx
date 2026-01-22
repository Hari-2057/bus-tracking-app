import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import React, { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';

// Fix for default markers 
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const getBusIcon = (type, busId) => {
    // Fix: "Non-AC" contains "AC", so we must explicitly check for Non-AC or exact match
    const isAC = type.includes('AC') && !type.includes('Non-AC');

    // Image source based on type
    const busImage = isAC ? '/bus-ac.png' : '/bus-non-ac.png';
    const borderColor = isAC ? '#0ea5e9' : '#16a34a';

    // Simplified marker for debugging
    return L.marker([0, 0]).options.icon; // Use default

    // Original custom marker commented out for debugging
    /*
    return L.divIcon({
        className: 'custom-bus-marker',
        html: `<div style="
            display: flex;
            flex-direction: column;
            align-items: center;
        ">
            <div style="
                width: 60px;
                height: 40px;
                background-image: url('${busImage}');
                background-size: cover;
                background-position: center;
                border: 2px solid ${borderColor};
                border-radius: 4px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                background-color: white;
            "></div>
            <div style="
                margin-top: 4px;
                background: #0f172a;
                color: white;
                font-size: 10px;
                padding: 2px 6px;
                border-radius: 4px;
                font-weight: bold;
                border: 1px solid ${borderColor};
                white-space: nowrap;
                text-shadow: 0 1px 2px black;
            ">${busId}</div>
        </div>`,
        iconSize: [60, 60],
        iconAnchor: [30, 30],
        popupAnchor: [0, -30]
    });
    */
};

import routeData from '../data/routeData.json';

// Route 1: Nellore <-> Chennai
const routePointsNC = routeData.nc;

// Route 2: Chennai <-> Tirupati (Main)
const routePointsTC_MAIN = routeData.tc_main;

// Route 3: Chennai <-> Tirupati (Via Srikalahasti)
const routePointsTC_KAL = routeData.tc_alt;

function Recenter({ lat, lng, busId }) {
    const map = useMap();
    useEffect(() => {
        // Fix: Force map to recalculate size to prevent grey tiles
        map.invalidateSize();

        // Only pan when the Bus ID changes (initial selection), not on every location update
        map.panTo([lat, lng], { animate: true, duration: 1 });
    }, [busId, map]); // Added map dependency
    return null;
}

// Memoized Marker Component to prevent icon flickering
const BusMarker = ({ bus }) => {
    // Only recreate icon if type or busId changes (stable reference)
    const icon = React.useMemo(() => getBusIcon(bus.type, bus.busId), [bus.type, bus.busId]);

    return (
        <Marker position={[bus.lat, bus.lng]} icon={icon}>
            <Popup className="custom-popup">
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 5px 0', color: bus.type.includes('AC') && !bus.type.includes('Non-AC') ? '#38bdf8' : '#fbbf24' }}>
                        {bus.busId}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1' }}>
                        {bus.origin} ➝ {bus.destination}
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', fontWeight: 'bold', color: bus.type.includes('AC') && !bus.type.includes('Non-AC') ? '#38bdf8' : '#fbbf24' }}>
                        {bus.type}
                    </p>
                </div>
            </Popup>
        </Marker>
    );
};

export default function BusMap({ buses, selectedBus, activeRouteFilter }) {
    const defaultCenter = [14.0, 80.0];
    const center = selectedBus ? [selectedBus.lat, selectedBus.lng] : defaultCenter;

    return (
        <div className="map-container">
            <MapContainer
                center={center}
                zoom={9}
                style={{ height: '100%', width: '100%', background: '#0f172a' }}
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; Google Maps'
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                />

                {/* Route 1: Nellore - Chennai (Blue) */}
                {(!activeRouteFilter || activeRouteFilter === 'NC') && (
                    <Polyline
                        positions={routePointsNC}
                        pathOptions={{ color: '#4285F4', weight: 5, opacity: 0.7 }}
                    />
                )}

                {/* Route 2 & 3: Tirupati - Chennai */}
                {(!activeRouteFilter || activeRouteFilter === 'TC') && (
                    <>
                        <Polyline
                            positions={routePointsTC_MAIN}
                            pathOptions={{ color: '#a855f7', weight: 5, opacity: 0.7 }}
                        />
                        <Polyline
                            positions={routePointsTC_KAL}
                            pathOptions={{ color: '#22c55e', weight: 5, opacity: 0.7 }}
                        />
                    </>
                )}

                {/* Render all buses using memoized component */}
                {buses.map((bus) => (
                    <BusMarker key={bus.busId} bus={bus} />
                ))}

                {selectedBus && <Recenter lat={selectedBus.lat} lng={selectedBus.lng} busId={selectedBus.busId} />}
            </MapContainer>
        </div>
    );
}
