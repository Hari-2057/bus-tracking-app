import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import BusMap from './components/BusMap';
import Onboarding from './components/Onboarding';
import './index.css';

const SOCKET_URL = import.meta.env.PROD ? '/' : 'http://localhost:3000';

function App() {
  const [socket, setSocket] = useState(null);
  const [buses, setBuses] = useState({}); // Object to store multiple buses by ID
  const [connected, setConnected] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [usersRoute, setUsersRoute] = useState(null);
  const [selectedBusId, setSelectedBusId] = useState(null);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected');
      setConnected(false);
    });

    newSocket.on('busUpdate', (data) => {
      // data: { busId, lat, lng, timestamp, route, origin, destination }
      setBuses(prev => ({
        ...prev,
        [data.busId]: data
      }));
    });

    return () => newSocket.close();
  }, []); // Remove selectedBusId dependency to prevent socket reconnections

  const handleSearch = (routeData) => {
    setUsersRoute(routeData);
    setHasSearched(true);
    setSelectedBusId(null); // Clear previous selection to avoid ghost buses
  };

  const handleBack = () => {
    setHasSearched(false);
    setUsersRoute(null);
    setSelectedBusId(null);
  };

  // Filter Logic
  let filteredBuses = Object.values(buses);
  let activeRouteFilter = null; // 'NC', 'TC', or null (all)

  if (hasSearched && usersRoute) {
    const f = usersRoute.from.toLowerCase();
    const t = usersRoute.to.toLowerCase();

    const isNellore = f.includes('nellore') || t.includes('nellore');
    const isTirupati = f.includes('tirupati') || t.includes('tirupati');

    if (isNellore) {
      activeRouteFilter = 'NC';
      filteredBuses = filteredBuses.filter(b =>
        b.origin.includes('Nellore') ||
        b.destination.includes('Nellore') ||
        b.route.includes('144')
      );
    } else if (isTirupati) {
      activeRouteFilter = 'TC';
      filteredBuses = filteredBuses.filter(b =>
        b.origin === 'Tirupati' || b.destination === 'Tirupati' ||
        b.route.includes('Ultra') || b.route.includes('Super')
      );
    }
    // If matches nothing (e.g. "Mars" to "Venus"), shows empty list effectively
    if (!isNellore && !isTirupati) {
      filteredBuses = [];
    }
  }

  // Ensure activeBus is actually in the filtered list (prevents ghost selections)
  const activeBus = (selectedBusId && filteredBuses.find(b => b.busId === selectedBusId))
    ? buses[selectedBusId]
    : filteredBuses[0];

  // Auto-select first bus when list changes and nothing is selected
  useEffect(() => {
    if (!selectedBusId && filteredBuses.length > 0) {
      setSelectedBusId(filteredBuses[0].busId);
    }
  }, [selectedBusId, filteredBuses]);

  if (!hasSearched) {
    return <Onboarding onSearch={handleSearch} />;
  }

  return (
    <>
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              color: '#94a3b8',
              padding: '0.4rem 0.8rem',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            ← Back
          </button>
          <h1>TNSTC <span style={{ fontSize: '0.8em', opacity: 0.7 }}>Live</span></h1>
        </div>
        <div className="status-badge">
          <div className="status-dot" style={{ backgroundColor: connected ? '#10b981' : '#ef4444', boxShadow: `0 0 8px ${connected ? '#10b981' : '#ef4444'}` }}></div>
          <span>{connected ? 'System Online' : 'Connecting...'}</span>
        </div>
      </header>

      <main className="main-content">
        {/* Pass filtered buses to map */}
        <BusMap
          buses={filteredBuses}
          selectedBus={activeBus}
          activeRouteFilter={activeRouteFilter}
        />

        {/* Sidebar / Info Panel - Showing Active Bus */}
        {activeBus && (
          <div className="info-panel">
            <h3>Live Telemetry</h3>
            {activeBus.route && (
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Route</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#38bdf8' }}>{activeBus.route}</span>
                <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                  {activeBus.origin} ➝ {activeBus.destination}
                </div>
              </div>
            )}

            <div style={{ margin: '1rem 0', height: '1px', background: 'var(--glass-border)' }}></div>

            <div className="info-row">
              <span className="info-label">Bus Count</span>
              <span className="info-value">{filteredBuses.length} Active</span>
            </div>

            <div className="info-row">
              <span className="info-label">Vehicle ID</span>
              <span className="info-value">{activeBus.busId}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Type</span>
              <span className="info-value" style={{
                color: (activeBus.type.includes('AC') && !activeBus.type.includes('Non-AC')) ? '#38bdf8' : '#fbbf24'
              }}>{activeBus.type}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Latitude</span>
              <span className="info-value">{activeBus.lat.toFixed(4)}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Longitude</span>
              <span className="info-value">{activeBus.lng.toFixed(4)}</span>
            </div>

            <div className="bus-selector" style={{ marginTop: '1rem' }}>
              <span style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>Select Vehicle</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {filteredBuses.map(b => (
                  <button
                    key={b.busId}
                    onClick={() => setSelectedBusId(b.busId)}
                    style={{
                      padding: '0.5rem',
                      background: selectedBusId === b.busId ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                      color: selectedBusId === b.busId ? '#0f172a' : '#fff',
                      border: 'none',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    {b.busId}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              Tracking transport along NH16
            </div>
          </div>
        )}

        {!activeBus && connected && (
          <div className="info-panel" style={{ textAlign: 'center' }}>
            <p className="info-label">Scanning for signals on NH16...</p>
          </div>
        )}
      </main>
    </>
  );
}

export default App;
