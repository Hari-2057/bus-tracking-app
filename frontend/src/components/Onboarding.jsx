import { useState } from 'react';

export default function Onboarding({ onSearch }) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!from || !to) return;

        setIsLoading(true);

        // Simulate searching delay for effect
        setTimeout(() => {
            setIsLoading(false);
            onSearch({ from, to });
        }, 1500);
    };

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card">
                <div className="brand-header">
                    <h1>TNSTC Live</h1>
                    <p>Tamil Nadu State Transport Corporation</p>
                </div>

                <form onSubmit={handleSubmit} className="search-form">
                    <div className="input-group fade-in-up animate-delay-1">
                        <label>From</label>
                        <div className="input-wrapper">
                            <span className="icon">📍</span>
                            <input
                                type="text"
                                placeholder="Current Location"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="connector">
                        <div className="line"></div>
                    </div>

                    <div className="input-group fade-in-up animate-delay-2">
                        <label>To</label>
                        <div className="input-wrapper">
                            <span className="icon">🏁</span>
                            <input
                                type="text"
                                placeholder="Enter Destination"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="search-btn fade-in-up animate-delay-3" disabled={isLoading}>
                        {isLoading ? (
                            <span className="loading-spinner"></span>
                        ) : (
                            'Find Buses'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
