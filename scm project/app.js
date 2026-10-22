/** 
 * SmartRaid - PC Screen Website Working Model
 * Complete 8-Screen Desktop Application Logic
 * Features: One-by-one process, Back buttons on all screens, Real Leaflet Maps, 3-Click WhatsApp SOS (9342900780)
 */

// ==========================================================================
// 1. APPLICATION STATE
// ==========================================================================
const SmartRaidState = {
    currentScreen: 'screen-login',
    previousScreen: null,

    user: {
        isLoggedIn: true,
        name: 'Ruban Kumar',
        email: 'ruban@smartraid.in',
        mobile: '9342900780'
    },

    trip: {
        pickup: {
            name: 'VIT University, Vellore',
            coords: [12.9698, 79.1559]
        },
        drop: {
            name: 'Katpadi, Vellore',
            coords: [12.9785, 79.1385]
        },
        vehicle: 'auto',
        vehicleTitle: 'Auto',
        vehicleThumb: 'assets/auto.jpg',
        vehicleDesc: 'TVS King 3-Wheeler • Clean & Sanitized • Verified Driver',
        fare: 60,
        fareBase: 45,
        fareDist: 15,
        distance: '5.2 km',
        duration: '12 mins',
        paymentMethod: 'upi',
        bookingId: '#SR123456',
        rating: 4,
        feedbackTags: ['Service']
    },

    driver: {
        name: 'Ravi Kumar',
        rating: '4.8',
        rides: '245',
        phone: '+91 98765 43210',
        vehicle: 'Auto • TN 58 AB 1234',
        avatar: 'assets/driver_ravi.jpg'
    },

    simulation: {
        intervalId: null,
        currentStep: 0,
        isSimulating: false,
        waypoints: [
            [12.9698, 79.1559], // VIT University
            [12.9715, 79.1520],
            [12.9732, 79.1480],
            [12.9750, 79.1440],
            [12.9768, 79.1410],
            [12.9785, 79.1385]  // Katpadi
        ]
    }
};

// Cache for Leaflet map instances
const LeafletMaps = {
    whereToMap: null,
    whereToPickupMarker: null,
    whereToDropMarker: null,
    whereToRouteLine: null,
    whereToTileLayer: null,

    driverTrackingMap: null,
    trackingVehicleMarker: null,
    trackingPickupMarker: null,
    trackingDropMarker: null,
    trackingRouteLine: null,
    trackingTileLayer: null,

    currentStyle: 'voyager'
};

// ==========================================================================
// 2. DOM INITIALIZATION
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initLeafletMaps();
    setupRoutingAndShortcuts();

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        navigateToScreen(hash, false);
    } else {
        navigateToScreen('screen-login', false);
    }
});

// ==========================================================================
// 3. SCREEN NAVIGATION & PROGRESSION
// ==========================================================================
function navigateToScreen(screenId, pushState = true) {
    const validScreens = [
        'screen-login',
        'screen-signup',
        'screen-where-to',
        'screen-choose-vehicle',
        'screen-payment',
        'screen-payment-success',
        'screen-on-the-way',
        'screen-rating'
    ];

    if (!validScreens.includes(screenId)) {
        screenId = 'screen-login';
    }

    SmartRaidState.previousScreen = SmartRaidState.currentScreen;
    SmartRaidState.currentScreen = screenId;

    // Toggle active screen
    document.querySelectorAll('.desktop-screen-card').forEach(card => {
        card.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }

    // Toggle top desktop step chips
    document.querySelectorAll('.d-step-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.screen === screenId);
    });

    if (pushState) {
        history.pushState({ screen: screenId }, '', `#${screenId}`);
    }

    window.scrollTo({ top: 0, behavior: 'instant' });

    // Invalidate Leaflet maps after card becomes visible
    const refreshMap = () => {
        if (screenId === 'screen-where-to' && LeafletMaps.whereToMap) {
            LeafletMaps.whereToMap.invalidateSize();
            fitRouteBounds(LeafletMaps.whereToMap);
        } else if (screenId === 'screen-on-the-way' && LeafletMaps.driverTrackingMap) {
            LeafletMaps.driverTrackingMap.invalidateSize();
            fitRouteBounds(LeafletMaps.driverTrackingMap);
            startDriverSimulation();
        } else if (screenId === 'screen-payment-success') {
            triggerConfetti();
        }
    };

    setTimeout(refreshMap, 40);
    setTimeout(refreshMap, 180);
    setTimeout(refreshMap, 450);

    playTone(600, 0.03);
}

function setupRoutingAndShortcuts() {
    window.addEventListener('popstate', () => {
        const screen = window.location.hash.replace('#', '') || 'screen-login';
        navigateToScreen(screen, false);
    });

    // Keyboard 1-8 shortcuts for instant desktop testing
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const screens = [
            'screen-login',
            'screen-signup',
            'screen-where-to',
            'screen-choose-vehicle',
            'screen-payment',
            'screen-payment-success',
            'screen-on-the-way',
            'screen-rating'
        ];
        const num = parseInt(e.key);
        if (num >= 1 && num <= screens.length) {
            navigateToScreen(screens[num - 1]);
        }
    });
}

// ==========================================================================
// 4. REAL LEAFLET MAPS FOR PC SCREENS & DYNAMIC LOCATION SYNCHRONIZATION
// ==========================================================================

const VelloreLandmarks = [
    { name: 'VIT University, Main Gate, Vellore', coords: [12.9698, 79.1559], type: 'campus', tag: 'University • Katpadi Road', icon: 'fa-graduation-cap' },
    { name: 'Katpadi Railway Junction (KPD)', coords: [12.9785, 79.1385], type: 'station', tag: 'Major Rail Junction • Katpadi', icon: 'fa-train' },
    { name: 'Vellore New Bus Stand (Green Circle)', coords: [12.9348, 79.1412], type: 'bus', tag: 'Central Transit Hub', icon: 'fa-bus' },
    { name: 'CMC Hospital (Christian Medical College)', coords: [12.9250, 79.1340], type: 'hospital', tag: 'Ida Scudder Rd • Vellore', icon: 'fa-hospital' },
    { name: 'Vellore Fort & Jalakanteswarar Temple', coords: [12.9205, 79.1325], type: 'fort', tag: 'Historic Landmark • Fort Round', icon: 'fa-landmark' },
    { name: 'Sripuram Sri Lakshmi Narayani Golden Temple', coords: [12.8718, 79.0888], type: 'temple', tag: 'Malaikodi • Vellore', icon: 'fa-place-of-worship' },
    { name: 'Bagayam CMC College Campus', coords: [12.8795, 79.1345], type: 'campus', tag: 'South Vellore', icon: 'fa-tree' },
    { name: 'Gandhi Nagar Main Road, Katpadi', coords: [12.9620, 79.1425], type: 'area', tag: 'Residential & Shopping', icon: 'fa-shop' },
    { name: 'Sathuvachari Phase 1, Vellore', coords: [12.9360, 79.1670], type: 'area', tag: 'Collectorate & NH48', icon: 'fa-building' },
    { name: 'Ranipet SIPCOT Industrial Park', coords: [12.9280, 79.3330], type: 'industrial', tag: 'Industrial Corridor', icon: 'fa-industry' },
    { name: 'Arcot Clock Tower & Bus Stop', coords: [12.9050, 79.3320], type: 'town', tag: 'Palar River Bridge', icon: 'fa-clock' },
    { name: 'Old Bus Stand, Vellore Town', coords: [12.9180, 79.1330], type: 'bus', tag: 'Market Area', icon: 'fa-bus' },
    { name: 'Schell Eye Hospital, Vellore', coords: [12.9220, 79.1360], type: 'hospital', tag: 'Medical Center', icon: 'fa-eye' },
    { name: 'TPGIT Engineering College, Bagayam', coords: [12.8840, 79.1310], type: 'campus', tag: 'Govt Tech Institute', icon: 'fa-graduation-cap' },
    { name: 'Vellore Civil Aerodrome (Airport)', coords: [12.9090, 79.0680], type: 'airport', tag: 'Abdullapuram', icon: 'fa-plane' }
];

let currentQuickTarget = 'drop'; // Target for quick chip clicks: 'drop' or 'pickup'

/**
 * Generates natural curved road points between start and end
 */
function generateCurvedWaypoints(start, end, numSteps = 8) {
    const points = [];
    const lat1 = start[0], lon1 = start[1];
    const lat2 = end[0], lon2 = end[1];

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    // Road curve offset perpendicular to direction
    const perpLat = -dLon * 0.16;
    const perpLon = dLat * 0.16;

    for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps;
        const curveT = 4 * t * (1 - t);
        const lat = (1 - t) * lat1 + t * lat2 + curveT * perpLat;
        const lon = (1 - t) * lon1 + t * lon2 + curveT * perpLon;
        points.push([Number(lat.toFixed(6)), Number(lon.toFixed(6))]);
    }
    return points;
}

/**
 * Calculates road-winding distance in km using Haversine formula
 */
function calculateDistanceKm(c1, c2) {
    const R = 6371; // Earth radius in km
    const dLat = (c2[0] - c1[0]) * Math.PI / 180;
    const dLon = (c2[1] - c1[1]) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(c1[0] * Math.PI / 180) * Math.cos(c2[0] * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.max(0.6, Number((R * c * 1.25).toFixed(1)));
}

/**
 * Finds the closest known landmark for a given coordinate
 */
function findNearestLandmark(coords) {
    let nearest = null;
    let minDist = Infinity;
    for (const lm of VelloreLandmarks) {
        const d = calculateDistanceKm(coords, lm.coords);
        if (d < minDist) {
            minDist = d;
            nearest = lm;
        }
    }
    return minDist < 1.8 ? nearest : null;
}

/**
 * Recalculates metrics (Distance, Duration, Fares) across all screens
 */
function recalculateTripMetrics() {
    const dist = calculateDistanceKm(SmartRaidState.trip.pickup.coords, SmartRaidState.trip.drop.coords);
    const durationMins = Math.max(3, Math.round(dist * 2.8 + 2));

    SmartRaidState.trip.distance = `${dist} km`;
    SmartRaidState.trip.duration = `${durationMins} mins`;

    // Dynamic vehicle fares
    const autoFare = Math.max(40, Math.round(35 + dist * 12));
    const bikeFare = Math.max(25, Math.round(20 + dist * 7));
    const carFare = Math.max(75, Math.round(60 + dist * 18));

    if (SmartRaidState.trip.vehicle === 'auto') {
        SmartRaidState.trip.fare = autoFare;
        SmartRaidState.trip.fareBase = 35;
        SmartRaidState.trip.fareDist = Math.round(dist * 12);
    } else if (SmartRaidState.trip.vehicle === 'bike') {
        SmartRaidState.trip.fare = bikeFare;
        SmartRaidState.trip.fareBase = 20;
        SmartRaidState.trip.fareDist = Math.round(dist * 7);
    } else {
        SmartRaidState.trip.fare = carFare;
        SmartRaidState.trip.fareBase = 60;
        SmartRaidState.trip.fareDist = Math.round(dist * 18);
    }

    // Screen 3: Route Metrics Card
    const metricDist = document.getElementById('metricDist');
    if (metricDist) metricDist.textContent = `${dist} km`;

    const metricTime = document.getElementById('metricTime');
    if (metricTime) metricTime.textContent = `${durationMins} mins`;

    // Screen 3: Floating map pill
    const mapPillPickup = document.getElementById('mapPillPickup');
    const mapPillDrop = document.getElementById('mapPillDrop');
    const mapPillDist = document.getElementById('mapPillDist');
    if (mapPillPickup) mapPillPickup.textContent = SmartRaidState.trip.pickup.name.split(',')[0];
    if (mapPillDrop) mapPillDrop.textContent = SmartRaidState.trip.drop.name.split(',')[0];
    if (mapPillDist) mapPillDist.textContent = `${dist} km`;

    // Screen 4: Vehicle selection card prices
    const fareAutoEl = document.getElementById('fareAuto');
    if (fareAutoEl) fareAutoEl.textContent = `₹${autoFare}`;

    const fareBikeEl = document.getElementById('fareBike');
    if (fareBikeEl) fareBikeEl.textContent = `₹${bikeFare}`;

    const fareCarEl = document.getElementById('fareCar');
    if (fareCarEl) fareCarEl.textContent = `₹${carFare}`;

    // Update remaining screens
    syncLocationsAcrossScreens();
}

/**
 * Real Map Tile Layer Providers
 * Free, high-speed, reliable CDN tile sources with NO 403 access blocks:
 * 1. CartoDB Voyager: Modern navigation street map with crisp roads & landmarks
 * 2. ESRI World Street Map: Official ArcGIS HD street cartography
 * 3. ESRI World Imagery: High-resolution real satellite aerial photography
 * 4. CartoDB Dark Matter: Sleek night navigation mode
 */
const MapTileProviders = {
    voyager: {
        name: 'Streets (Navigation)',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        options: {
            subdomains: 'abcd',
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>'
        }
    },
    esriStreet: {
        name: 'ArcGIS HD Streets',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
        options: {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; Street Map'
        }
    },
    satellite: {
        name: 'Satellite Aerial View',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
            maxZoom: 19,
            attribution: 'Tiles &copy; Esri &mdash; High-Resolution Satellite'
        }
    },
    dark: {
        name: 'Night Navigation',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
            subdomains: 'abcd',
            maxZoom: 20,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>'
        }
    }
};

/**
 * Creates a robust Leaflet tile layer with crossOrigin enabled and error resilience
 */
function createSafeTileLayer(styleKey = 'voyager') {
    const config = MapTileProviders[styleKey] || MapTileProviders.voyager;
    const layer = L.tileLayer(config.url, {
        ...config.options,
        crossOrigin: true
    });

    // Resilience fallback: if primary server ever has a hiccup, warn and log
    layer.on('tileerror', (e) => {
        console.warn(`Tile load warning on [${styleKey}]:`, e);
    });

    return layer;
}

/**
 * Switches map style dynamically across both WhereTo and Tracking maps
 */
function setMapStyle(styleKey) {
    if (!MapTileProviders[styleKey]) return;
    LeafletMaps.currentStyle = styleKey;

    // 1. Update Where-To Map
    if (LeafletMaps.whereToMap) {
        if (LeafletMaps.whereToTileLayer) {
            LeafletMaps.whereToMap.removeLayer(LeafletMaps.whereToTileLayer);
        }
        LeafletMaps.whereToTileLayer = createSafeTileLayer(styleKey);
        LeafletMaps.whereToTileLayer.addTo(LeafletMaps.whereToMap);
        LeafletMaps.whereToTileLayer.bringToBack();
    }

    // 2. Update Driver Tracking Map
    if (LeafletMaps.driverTrackingMap) {
        if (LeafletMaps.trackingTileLayer) {
            LeafletMaps.driverTrackingMap.removeLayer(LeafletMaps.trackingTileLayer);
        }
        LeafletMaps.trackingTileLayer = createSafeTileLayer(styleKey);
        LeafletMaps.trackingTileLayer.addTo(LeafletMaps.driverTrackingMap);
        LeafletMaps.trackingTileLayer.bringToBack();
    }

    // 3. Update style switcher buttons across the UI
    document.querySelectorAll('.btn-map-style').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.style === styleKey);
    });

    openToast(`🗺️ Map style: ${MapTileProviders[styleKey].name}`);
}

/**
 * Initializes Leaflet maps for PC screens with interactive draggable pins and real tiles
 */
function initLeafletMaps() {
    if (typeof L === 'undefined') return;

    const startPt = SmartRaidState.trip.pickup.coords;
    const endPt = SmartRaidState.trip.drop.coords;
    const waypoints = generateCurvedWaypoints(startPt, endPt);
    SmartRaidState.simulation.waypoints = waypoints;

    // --- 1. Where To Map (Screen 3) ---
    const whereToEl = document.getElementById('whereToMap');
    if (whereToEl) {
        LeafletMaps.whereToMap = L.map('whereToMap', {
            zoomControl: false,
            zoomAnimation: true
        }).setView(startPt, 13);

        L.control.zoom({ position: 'bottomright' }).addTo(LeafletMaps.whereToMap);

        // Real Street Map Tile Layer
        LeafletMaps.whereToTileLayer = createSafeTileLayer(LeafletMaps.currentStyle);
        LeafletMaps.whereToTileLayer.addTo(LeafletMaps.whereToMap);

        LeafletMaps.whereToRouteLine = L.polyline(waypoints, {
            color: '#1e60f2',
            weight: 6,
            opacity: 0.95,
            lineJoin: 'round'
        }).addTo(LeafletMaps.whereToMap);

        // DRAGGABLE Pickup Marker
        LeafletMaps.whereToPickupMarker = L.marker(startPt, {
            draggable: true,
            icon: createCustomPin('pickup', '#1e60f2', 'Pickup (Drag to move)')
        }).addTo(LeafletMaps.whereToMap)
            .bindPopup(`<strong>Pickup:</strong> ${SmartRaidState.trip.pickup.name}<br><small style="color:#64748b;">(Drag pin to move anywhere on map)</small>`);

        LeafletMaps.whereToPickupMarker.on('dragend', (e) => {
            const latlng = e.target.getLatLng();
            handleMarkerDragEnd('pickup', [latlng.lat, latlng.lng]);
        });

        // DRAGGABLE Drop Marker
        LeafletMaps.whereToDropMarker = L.marker(endPt, {
            draggable: true,
            icon: createCustomPin('drop', '#ef4444', 'Drop (Drag to move)')
        }).addTo(LeafletMaps.whereToMap)
            .bindPopup(`<strong>Drop:</strong> ${SmartRaidState.trip.drop.name}<br><small style="color:#64748b;">(Drag pin to move anywhere on map)</small>`);

        LeafletMaps.whereToDropMarker.on('dragend', (e) => {
            const latlng = e.target.getLatLng();
            handleMarkerDragEnd('drop', [latlng.lat, latlng.lng]);
        });

        // Click map to set locations
        LeafletMaps.whereToMap.on('click', (e) => {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            const nearest = findNearestLandmark([lat, lng]);
            const locName = nearest ? nearest.name : `Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
            const safeLocName = locName.replace(/'/g, "\\'");

            const popupContent = `
                <div style="font-size:0.86rem;padding:6px;min-width:200px;">
                    <div style="font-weight:700;color:#0f172a;margin-bottom:4px;">📍 ${locName}</div>
                    <div style="font-size:0.75rem;color:#64748b;margin-bottom:8px;">Set this location on the map:</div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="setMapLoc('pickup', '${safeLocName}', [${lat}, ${lng}])" style="background:#1e60f2;color:#fff;border:none;padding:6px 10px;border-radius:6px;font-weight:600;font-size:0.75rem;cursor:pointer;flex:1;">Set Pickup</button>
                        <button onclick="setMapLoc('drop', '${safeLocName}', [${lat}, ${lng}])" style="background:#ef4444;color:#fff;border:none;padding:6px 10px;border-radius:6px;font-weight:600;font-size:0.75rem;cursor:pointer;flex:1;">Set Drop</button>
                    </div>
                </div>
            `;
            L.popup().setLatLng(e.latlng).setContent(popupContent).openOn(LeafletMaps.whereToMap);
        });

        fitRouteBounds(LeafletMaps.whereToMap);
    }

    // --- 2. Driver Tracking Map (Screen 7) ---
    const trackingEl = document.getElementById('driverTrackingMap');
    if (trackingEl) {
        LeafletMaps.driverTrackingMap = L.map('driverTrackingMap', {
            zoomControl: false,
            zoomAnimation: true
        }).setView(startPt, 13);

        L.control.zoom({ position: 'bottomright' }).addTo(LeafletMaps.driverTrackingMap);

        // Real Street Map Tile Layer
        LeafletMaps.trackingTileLayer = createSafeTileLayer(LeafletMaps.currentStyle);
        LeafletMaps.trackingTileLayer.addTo(LeafletMaps.driverTrackingMap);

        LeafletMaps.trackingRouteLine = L.polyline(waypoints, {
            color: '#1e60f2',
            weight: 6,
            opacity: 0.9,
            dashArray: '8, 8',
            lineJoin: 'round'
        }).addTo(LeafletMaps.driverTrackingMap);

        LeafletMaps.trackingPickupMarker = L.marker(startPt, {
            icon: createCustomPin('pickup', '#1e60f2', 'Pickup')
        }).addTo(LeafletMaps.driverTrackingMap);

        LeafletMaps.trackingDropMarker = L.marker(endPt, {
            icon: createCustomPin('drop', '#ef4444', 'Drop')
        }).addTo(LeafletMaps.driverTrackingMap);

        // Moving Vehicle Marker (TVS King Auto)
        const vehicleIcon = L.divIcon({
            className: 'moving-vehicle-pin',
            html: `
                <div class="moving-auto-wrapper">
                    <div class="auto-pin-box">
                        <i class="fa-solid fa-van-shuttle"></i>
                    </div>
                    <div class="auto-radar-pulse"></div>
                </div>
            `,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
        });

        LeafletMaps.trackingVehicleMarker = L.marker(waypoints[0], { icon: vehicleIcon })
            .addTo(LeafletMaps.driverTrackingMap);
    }

    // Initialize metrics based on current points
    recalculateTripMetrics();
}

function createCustomPin(type, color, label) {
    return L.divIcon({
        className: `custom-map-pin pin-${type}`,
        html: `
            <div style="background:${color};color:#ffffff;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,0.3);border:2.5px solid #ffffff;">
                <i class="fa-solid fa-location-dot" style="transform:rotate(45deg);font-size:0.9rem;"></i>
            </div>
            <span style="position:absolute;bottom:-20px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.9);color:#fff;font-size:0.72rem;font-weight:700;padding:2px 8px;border-radius:10px;white-space:nowrap;">${label}</span>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32]
    });
}

function fitRouteBounds(mapInstance) {
    if (!mapInstance || !SmartRaidState.simulation.waypoints.length) return;
    const bounds = L.latLngBounds(SmartRaidState.simulation.waypoints);
    mapInstance.fitBounds(bounds, { padding: [55, 55], maxZoom: 15 });
}

function recenterWhereToMap() {
    if (LeafletMaps.whereToMap) {
        fitRouteBounds(LeafletMaps.whereToMap);
        openToast('Recentered map to full route');
    }
}

function recenterTrackingMap() {
    if (LeafletMaps.driverTrackingMap && LeafletMaps.trackingVehicleMarker) {
        const curPos = LeafletMaps.trackingVehicleMarker.getLatLng();
        LeafletMaps.driverTrackingMap.setView(curPos, 14);
        openToast('Recentered to Driver live location');
    }
}

/**
 * Handles marker drag on the Leaflet map
 */
function handleMarkerDragEnd(type, coords) {
    const nearest = findNearestLandmark(coords);
    const name = nearest ? nearest.name : `Location (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`;
    updateTripLocation(type, name, coords, false); // Don't fit bounds during drag
}

/**
 * Updates Pickup or Drop location dynamically on map and all downstream screens
 */
function updateTripLocation(type, name, coords, triggerMapUpdate = true) {
    if (type === 'pickup') {
        SmartRaidState.trip.pickup.name = name;
        SmartRaidState.trip.pickup.coords = coords;
        const inputP = document.getElementById('inputPickup');
        if (inputP) inputP.value = name;

        if (LeafletMaps.whereToPickupMarker) {
            LeafletMaps.whereToPickupMarker.setLatLng(coords)
                .setPopupContent(`<strong>Pickup:</strong> ${name}<br><small style="color:#64748b;">(Drag pin to move anywhere on map)</small>`);
        }
        if (LeafletMaps.trackingPickupMarker) {
            LeafletMaps.trackingPickupMarker.setLatLng(coords);
        }
    } else {
        SmartRaidState.trip.drop.name = name;
        SmartRaidState.trip.drop.coords = coords;
        const inputD = document.getElementById('inputDrop');
        if (inputD) inputD.value = name;

        if (LeafletMaps.whereToDropMarker) {
            LeafletMaps.whereToDropMarker.setLatLng(coords)
                .setPopupContent(`<strong>Drop:</strong> ${name}<br><small style="color:#64748b;">(Drag pin to move anywhere on map)</small>`);
        }
        if (LeafletMaps.trackingDropMarker) {
            LeafletMaps.trackingDropMarker.setLatLng(coords);
        }
    }

    // Generate new curved route between the two updated coordinates
    const newWaypoints = generateCurvedWaypoints(SmartRaidState.trip.pickup.coords, SmartRaidState.trip.drop.coords);
    SmartRaidState.simulation.waypoints = newWaypoints;

    if (LeafletMaps.whereToRouteLine) {
        LeafletMaps.whereToRouteLine.setLatLngs(newWaypoints);
    }
    if (LeafletMaps.trackingRouteLine) {
        LeafletMaps.trackingRouteLine.setLatLngs(newWaypoints);
    }
    if (LeafletMaps.trackingVehicleMarker) {
        LeafletMaps.trackingVehicleMarker.setLatLng(newWaypoints[0]);
    }

    // Recalculate metrics, distance, duration, and fares
    recalculateTripMetrics();

    // Map bounds zoom animation
    if (triggerMapUpdate && LeafletMaps.whereToMap) {
        LeafletMaps.whereToMap.fitBounds(L.latLngBounds(newWaypoints), {
            padding: [55, 55],
            maxZoom: 15,
            animate: true,
            duration: 0.8
        });
    }

    openToast(`📍 Map updated: ${type === 'pickup' ? 'Pickup' : 'Destination'} ➔ ${name.split(',')[0]}`);
    playTone(620, 0.04);
}

function setMapLoc(type, name, coords) {
    updateTripLocation(type, name, coords, true);
    if (LeafletMaps.whereToMap) LeafletMaps.whereToMap.closePopup();
}

/**
 * Sets quick pick target: 'drop' or 'pickup'
 */
function setQuickPickTarget(target) {
    currentQuickTarget = target;
    const dropBtn = document.getElementById('targetDropBtn');
    const pickBtn = document.getElementById('targetPickupBtn');
    if (dropBtn) dropBtn.classList.toggle('active', target === 'drop');
    if (pickBtn) pickBtn.classList.toggle('active', target === 'pickup');
    openToast(`Quick select will set ${target === 'drop' ? 'Destination (Drop)' : 'Pickup'}`);
}

/**
 * Handles clicking a landmark chip: instantly moves pin and redraws route on map
 */
function quickPickLocation(name, coords) {
    updateTripLocation(currentQuickTarget, name, coords, true);
}

/**
 * Handles input focus: opens suggestion list and aligns target
 */
function handleLocInputFocus(type) {
    currentQuickTarget = type;
    const dropBtn = document.getElementById('targetDropBtn');
    const pickBtn = document.getElementById('targetPickupBtn');
    if (dropBtn) dropBtn.classList.toggle('active', type === 'drop');
    if (pickBtn) pickBtn.classList.toggle('active', type === 'pickup');

    const input = document.getElementById(type === 'pickup' ? 'inputPickup' : 'inputDrop');
    showSuggestions(type, input ? input.value : '');
}

/**
 * Live search filter as the user types
 */
function handleLocInputChange(type, query) {
    showSuggestions(type, query);
}

/**
 * Renders autocomplete suggestion dropdown
 */
function showSuggestions(type, query) {
    const dropdown = document.getElementById(type === 'pickup' ? 'dropdownPickup' : 'dropdownDrop');
    if (!dropdown) return;

    const q = (query || '').trim().toLowerCase();
    const filtered = VelloreLandmarks.filter(l =>
        !q || l.name.toLowerCase().includes(q) || l.tag.toLowerCase().includes(q)
    ).slice(0, 5);

    if (filtered.length === 0) {
        dropdown.innerHTML = `
            <div style="padding:12px 14px;font-size:0.8rem;color:#64748b;text-align:center;">
                No local landmark found. Press Enter to search on OpenStreetMap.
            </div>
        `;
        dropdown.classList.add('show');
        return;
    }

    dropdown.innerHTML = filtered.map(item => `
        <div class="loc-suggestion-item" onclick="selectSuggestion('${type}', '${item.name.replace(/'/g, "\\'")}', [${item.coords[0]}, ${item.coords[1]}])">
            <div class="loc-suggestion-icon"><i class="fa-solid ${item.icon || 'fa-location-dot'}"></i></div>
            <div class="loc-suggestion-info">
                <span class="loc-suggestion-name">${item.name}</span>
                <span class="loc-suggestion-sub">${item.tag}</span>
            </div>
        </div>
    `).join('');

    dropdown.classList.add('show');
}

/**
 * User clicked an autocomplete suggestion
 */
function selectSuggestion(type, name, coords) {
    const dropdown = document.getElementById(type === 'pickup' ? 'dropdownPickup' : 'dropdownDrop');
    if (dropdown) dropdown.classList.remove('show');
    updateTripLocation(type, name, coords, true);
}

/**
 * User typed and pressed Enter or committed a location field
 */
function handleLocFieldCommit(type, text) {
    setTimeout(() => {
        const dropdown = document.getElementById(type === 'pickup' ? 'dropdownPickup' : 'dropdownDrop');
        if (dropdown) dropdown.classList.remove('show');
    }, 200);

    const q = (text || '').trim().toLowerCase();
    if (!q) return;

    // Check against local database
    const match = VelloreLandmarks.find(l => l.name.toLowerCase().includes(q) || l.tag.toLowerCase().includes(q));
    if (match) {
        updateTripLocation(type, match.name, match.coords, true);
        return;
    }

    // Asynchronous Nominatim Geocoding
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text + ', Vellore, Tamil Nadu')}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lon = parseFloat(data[0].lon);
                updateTripLocation(type, text, [lat, lon], true);
            } else {
                // Approximate coordinate offset around Vellore
                const base = SmartRaidState.trip[type].coords;
                const offsetCoords = [base[0] + (Math.random() - 0.5) * 0.02, base[1] + (Math.random() - 0.5) * 0.02];
                updateTripLocation(type, text, offsetCoords, true);
            }
        })
        .catch(() => {
            const base = SmartRaidState.trip[type].coords;
            const offsetCoords = [base[0] + (Math.random() - 0.5) * 0.02, base[1] + (Math.random() - 0.5) * 0.02];
            updateTripLocation(type, text, offsetCoords, true);
        });
}

// Close suggestion dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.loc-input-col')) {
        document.querySelectorAll('.loc-dropdown-menu').forEach(d => d.classList.remove('show'));
    }
});

function swapLocations() {
    const tempName = SmartRaidState.trip.pickup.name;
    const tempCoords = [...SmartRaidState.trip.pickup.coords];

    SmartRaidState.trip.pickup.name = SmartRaidState.trip.drop.name;
    SmartRaidState.trip.pickup.coords = [...SmartRaidState.trip.drop.coords];

    SmartRaidState.trip.drop.name = tempName;
    SmartRaidState.trip.drop.coords = tempCoords;

    const inputP = document.getElementById('inputPickup');
    const inputD = document.getElementById('inputDrop');
    if (inputP) inputP.value = SmartRaidState.trip.pickup.name;
    if (inputD) inputD.value = SmartRaidState.trip.drop.name;

    const newWaypoints = generateCurvedWaypoints(SmartRaidState.trip.pickup.coords, SmartRaidState.trip.drop.coords);
    SmartRaidState.simulation.waypoints = newWaypoints;

    if (LeafletMaps.whereToPickupMarker) {
        LeafletMaps.whereToPickupMarker.setLatLng(SmartRaidState.trip.pickup.coords)
            .setPopupContent(`<strong>Pickup:</strong> ${SmartRaidState.trip.pickup.name}<br><small style="color:#64748b;">(Drag pin to move anywhere on map)</small>`);
    }
    if (LeafletMaps.whereToDropMarker) {
        LeafletMaps.whereToDropMarker.setLatLng(SmartRaidState.trip.drop.coords)
            .setPopupContent(`<strong>Drop:</strong> ${SmartRaidState.trip.drop.name}<br><small style="color:#64748b;">(Drag pin to move anywhere on map)</small>`);
    }
    if (LeafletMaps.whereToRouteLine) {
        LeafletMaps.whereToRouteLine.setLatLngs(newWaypoints);
    }
    if (LeafletMaps.trackingRouteLine) {
        LeafletMaps.trackingRouteLine.setLatLngs(newWaypoints);
    }

    recalculateTripMetrics();

    if (LeafletMaps.whereToMap) {
        LeafletMaps.whereToMap.fitBounds(L.latLngBounds(newWaypoints), { padding: [55, 55], animate: true });
    }

    openToast('Swapped Pickup & Drop locations on map');
    playTone(720, 0.05);
}

function clearLocation(type) {
    if (type === 'pickup') {
        const input = document.getElementById('inputPickup');
        if (input) input.value = '';
        input.focus();
    } else {
        const input = document.getElementById('inputDrop');
        if (input) input.value = '';
        input.focus();
    }
}

function syncLocationsAcrossScreens() {
    const p = SmartRaidState.trip.pickup.name;
    const d = SmartRaidState.trip.drop.name;
    const v = SmartRaidState.trip.vehicleTitle;
    const f = SmartRaidState.trip.fare;
    const base = SmartRaidState.trip.fareBase;
    const dist = SmartRaidState.trip.fareDist;
    const desc = SmartRaidState.trip.vehicleDesc;
    const thumb = SmartRaidState.trip.vehicleThumb;

    // Vehicle Selection Screen Previews
    const prevTitle = document.getElementById('previewVehicleTitle');
    const prevDesc = document.getElementById('previewVehicleDesc');
    const prevImg = document.getElementById('previewVehicleImg');
    const fBase = document.getElementById('fareBase');
    const fDist = document.getElementById('fareDist');
    const fTotal = document.getElementById('fareTotal');
    if (prevTitle) prevTitle.textContent = v;
    if (prevDesc) prevDesc.textContent = desc;
    if (prevImg) prevImg.src = thumb;
    if (fBase) fBase.textContent = `₹ ${base}`;
    if (fDist) fDist.textContent = `₹ ${dist}`;
    if (fTotal) fTotal.textContent = `₹ ${f}`;

    // Payment Screen summary
    const payRoute = document.getElementById('paySummaryRoute');
    const payTitle = document.getElementById('paySummaryTitle');
    const payFare = document.getElementById('paySummaryFare');
    const payThumb = document.getElementById('paySummaryThumb');
    const payPick = document.getElementById('payPickupVal');
    const payDrop = document.getElementById('payDropVal');
    const payTotalBig = document.getElementById('payTotalBig');
    const payBtnTxt = document.getElementById('payNowBtnText');
    if (payRoute) payRoute.textContent = `${p} → ${d}`;
    if (payTitle) payTitle.textContent = v;
    if (payFare) payFare.textContent = `₹ ${f}`;
    if (payThumb) payThumb.src = thumb;
    if (payPick) payPick.textContent = p;
    if (payDrop) payDrop.textContent = d;
    if (payTotalBig) payTotalBig.textContent = `₹ ${f}`;
    if (payBtnTxt) payBtnTxt.textContent = `Pay ₹${f} & Confirm Ride`;

    // Confirmation Screen summary
    const cPick = document.getElementById('confirmReceiptPickup');
    const cDrop = document.getElementById('confirmReceiptDrop');
    const cVeh = document.getElementById('confirmReceiptVehicle');
    const cAmt = document.getElementById('confirmReceiptAmount');
    if (cPick) cPick.textContent = p;
    if (cDrop) cDrop.textContent = d;
    if (cVeh) cVeh.textContent = v;
    if (cAmt) cAmt.textContent = `₹ ${f}`;

    const vRoutePill = document.getElementById('vehicleScreenRoutePill');
    if (vRoutePill) vRoutePill.textContent = `${p.split(',')[0]} ➔ ${d.split(',')[0]} (${SmartRaidState.trip.distance})`;
}

// ==========================================================================
// 5. LIVE DRIVER GPS SIMULATION// ==========================================================================
// 5. LIVE DRIVER GPS SIMULATION
// ==========================================================================
function startDriverSimulation() {
    if (SmartRaidState.simulation.isSimulating) return;
    SmartRaidState.simulation.isSimulating = true;
    SmartRaidState.simulation.currentStep = 0;

    const waypoints = SmartRaidState.simulation.waypoints;
    const etaTxt = document.getElementById('floatingEtaText');
    const etaBottom = document.getElementById('etaArrivalValue');

    clearInterval(SmartRaidState.simulation.intervalId);

    SmartRaidState.simulation.intervalId = setInterval(() => {
        SmartRaidState.simulation.currentStep++;
        const idx = SmartRaidState.simulation.currentStep % waypoints.length;
        const currentCoord = waypoints[idx];

        if (LeafletMaps.trackingVehicleMarker) {
            LeafletMaps.trackingVehicleMarker.setLatLng(currentCoord);
        }

        const rem = waypoints.length - idx;
        const eta = rem <= 1 ? 'Arriving now' : `${rem} mins`;
        if (etaTxt) etaTxt.textContent = rem <= 1 ? 'Arriving now' : `${rem} min away`;
        if (etaBottom) etaBottom.textContent = eta;

    }, 3000);
}

// ==========================================================================
// 6. PROCESS ACTIONS: LOGIN, SIGNUP, VEHICLE, PAYMENT, CONFIRMATION
// ==========================================================================
function handleLoginSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('btnLoginSubmit');
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;
        btn.disabled = true;
    }

    setTimeout(() => {
        if (btn) {
            btn.innerHTML = `<span>Login</span>`;
            btn.disabled = false;
        }
        openToast('Welcome back, Ruban! Find your ride.');
        navigateToScreen('screen-where-to');
    }, 600);
}

function handleSignupSubmit(event) {
    event.preventDefault();
    const btn = document.getElementById('btnSignupSubmit');
    if (btn) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;
        btn.disabled = true;
    }

    setTimeout(() => {
        if (btn) {
            btn.innerHTML = `<span>Sign Up</span>`;
            btn.disabled = false;
        }
        openToast('Account created successfully! Find your ride.');
        navigateToScreen('screen-where-to');
    }, 700);
}

function handleSocialLogin(provider) {
    openToast(`Connecting with ${provider}...`);
    setTimeout(() => {
        openToast(`Signed in as Ruban Kumar via ${provider}`);
        navigateToScreen('screen-where-to');
    }, 650);
}

function handleSearchRide() {
    const p = document.getElementById('inputPickup').value.trim() || 'VIT University, Vellore';
    const d = document.getElementById('inputDrop').value.trim() || 'Katpadi, Vellore';
    SmartRaidState.trip.pickup.name = p;
    SmartRaidState.trip.drop.name = d;
    syncLocationsAcrossScreens();

    openToast(`Finding available rides from ${p} ➔ ${d}...`);
    setTimeout(() => {
        navigateToScreen('screen-choose-vehicle');
    }, 400);
}

function selectVehicle(type, fare, cardElement) {
    if (typeof fare === 'object' && !cardElement) {
        cardElement = fare;
        fare = null;
    }
    if (!cardElement) {
        cardElement = document.querySelector(`.d-vehicle-card[data-vehicle="${type}"]`);
    }
    if (!fare) {
        const fareMap = {
            auto: document.getElementById('fareAuto'),
            bike: document.getElementById('fareBike'),
            car: document.getElementById('fareCar')
        };
        const textFare = fareMap[type] ? fareMap[type].textContent.replace(/[^0-9]/g, '') : null;
        fare = textFare ? parseInt(textFare, 10) : (type === 'auto' ? 60 : (type === 'bike' ? 40 : 120));
    }

    SmartRaidState.trip.vehicle = type;
    SmartRaidState.trip.fare = fare;

    if (type === 'auto') {
        SmartRaidState.trip.vehicleTitle = 'Auto';
        SmartRaidState.trip.vehicleThumb = 'assets/auto.jpg';
        SmartRaidState.trip.vehicleDesc = 'TVS King 3-Wheeler • Clean & Sanitized • Verified Driver';
        SmartRaidState.trip.fareBase = 45;
        SmartRaidState.trip.fareDist = 15;
        SmartRaidState.driver.vehicle = 'Auto • TN 58 AB 1234';
    } else if (type === 'bike') {
        SmartRaidState.trip.vehicleTitle = 'Bike';
        SmartRaidState.trip.vehicleThumb = 'assets/bike.jpg';
        SmartRaidState.trip.vehicleDesc = 'Honda Activa 6G • Fast & Fuel-Efficient • Helmet Included';
        SmartRaidState.trip.fareBase = 30;
        SmartRaidState.trip.fareDist = 10;
        SmartRaidState.driver.vehicle = 'Bike • TN 23 CD 5678';
    } else {
        SmartRaidState.trip.vehicleTitle = 'Car';
        SmartRaidState.trip.vehicleThumb = 'assets/car.jpg';
        SmartRaidState.trip.vehicleDesc = 'Swift Dzire Sedan • Air Conditioned • Premium Comfort';
        SmartRaidState.trip.fareBase = 90;
        SmartRaidState.trip.fareDist = 30;
        SmartRaidState.driver.vehicle = 'Car • TN 23 EF 9012';
    }

    document.querySelectorAll('.d-vehicle-card').forEach(c => {
        c.classList.remove('active');
        const r = c.querySelector('.custom-radio-lg');
        if (r) r.classList.remove('checked');
    });

    if (cardElement) {
        cardElement.classList.add('active');
        const r = cardElement.querySelector('.custom-radio-lg');
        if (r) r.classList.add('checked');
    }

    syncLocationsAcrossScreens();
    playTone(680, 0.03);
}

function handleContinueVehicle() {
    syncLocationsAcrossScreens();
    navigateToScreen('screen-payment');
}

function selectPaymentMethod(method, cardElement) {
    SmartRaidState.trip.paymentMethod = method;

    document.querySelectorAll('.desktop-pay-card').forEach(c => {
        c.classList.remove('active');
        const r = c.querySelector('.custom-radio-lg');
        if (r) r.classList.remove('checked');
    });

    if (cardElement) {
        cardElement.classList.add('active');
        const r = cardElement.querySelector('.custom-radio-lg');
        if (r) r.classList.add('checked');
    }
    playTone(700, 0.03);
}

function handlePayNow() {
    const btn = document.getElementById('btnPayNow');
    const txt = document.getElementById('payNowBtnText');
    if (btn && txt) {
        btn.disabled = true;
        txt.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment ₹${SmartRaidState.trip.fare}...`;
    }

    setTimeout(() => {
        if (btn && txt) {
            btn.disabled = false;
            txt.textContent = `Pay ₹${SmartRaidState.trip.fare} & Confirm Ride`;
        }

        const randomNum = Math.floor(100000 + Math.random() * 900000);
        SmartRaidState.trip.bookingId = `#SR${randomNum}`;
        const bIdEl = document.getElementById('confirmReceiptBookingId');
        if (bIdEl) bIdEl.textContent = SmartRaidState.trip.bookingId;

        syncLocationsAcrossScreens();
        navigateToScreen('screen-payment-success');
        openToast('Payment Successful! Ride booked.');
    }, 1000);
}

function copyBookingId() {
    const id = SmartRaidState.trip.bookingId;
    navigator.clipboard.writeText(id).then(() => {
        openToast(`Copied Booking ID: ${id}`);
    }).catch(() => {
        openToast(`Booking ID: ${id}`);
    });
}

// ==========================================================================
// 7. SOS 3-CLICKS WHATSAPP TRIGGER (9342900780)
// ==========================================================================
let sosClickCount = 0;
let sosTimer = null;

function handleSosClick() {
    sosClickCount++;
    clearTimeout(sosTimer);

    const topBadge = document.getElementById('topSosBadge');
    const screenHint = document.getElementById('screenSosHint');
    const topBtn = document.getElementById('btnTopSos');
    const screenBtn = document.getElementById('btnScreenSos');

    // Auto-reset counter after 4.5 seconds if 3 clicks not reached
    sosTimer = setTimeout(() => {
        sosClickCount = 0;
        if (topBtn) topBtn.classList.remove('sos-pulse-active');
        if (screenBtn) screenBtn.classList.remove('sos-pulse-active');
        if (topBadge) topBadge.textContent = '3 Clicks to WhatsApp (9342900780)';
        if (screenHint) screenHint.textContent = '3 Clicks to WhatsApp (9342900780)';
    }, 4500);

    if (topBtn) topBtn.classList.add('sos-pulse-active');
    if (screenBtn) screenBtn.classList.add('sos-pulse-active');

    if (sosClickCount === 1) {
        playTone(450, 0.2);
        if (topBadge) topBadge.textContent = '⚠️ 2 Clicks Left!';
        if (screenHint) screenHint.textContent = '⚠️ Click 2 more times for WhatsApp SOS!';
        openToast('⚠️ SOS Click (1/3): Click 2 more times to trigger WhatsApp SOS to 9342900780!');
    } else if (sosClickCount === 2) {
        playTone(700, 0.3);
        if (topBadge) topBadge.textContent = '🚨 1 CLICK LEFT!';
        if (screenHint) screenHint.textContent = '🚨 Click 1 MORE TIME for WhatsApp SOS!';
        openToast('🚨 WARNING (2/3): Click 1 more time to IMMEDIATELY send WhatsApp SOS to 9342900780!');
    } else if (sosClickCount >= 3) {
        sosClickCount = 0;
        clearTimeout(sosTimer);
        playTone(950, 0.5);

        if (topBadge) topBadge.textContent = '🚨 SOS TRIGGERED!';
        if (screenHint) screenHint.textContent = '🚨 SOS TRIGGERED!';

        // Directly open WhatsApp directed to 9342900780
        sendSosToWhatsApp();
        openSosModal();
    }
}

function sendSosToWhatsApp() {
    const phone = '919342900780';
    const pickup = SmartRaidState.trip.pickup.name;
    const drop = SmartRaidState.trip.drop.name;
    const vehicle = SmartRaidState.driver.vehicle;
    const driver = `${SmartRaidState.driver.name} (${SmartRaidState.driver.phone})`;
    const bookingId = SmartRaidState.trip.bookingId;

    const message = `🚨 *SMARTRAID EMERGENCY SOS ALERT!* 🚨\n\n` +
        `⚠️ *I need immediate emergency assistance on my ride!*\n\n` +
        `🆔 *Booking ID:* ${bookingId}\n` +
        `👤 *Passenger:* Ruban Kumar (+91 93429 00780)\n` +
        `🚖 *Vehicle:* ${vehicle}\n` +
        `👨‍✈️ *Driver:* ${driver}\n` +
        `📍 *Pickup:* ${pickup}\n` +
        `🏁 *Drop:* ${drop}\n` +
        `🗺️ *Live Location:* Vellore, TN (GPS Tracking Active)\n\n` +
        `Please call me or send help immediately!`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    openToast('🚨 SOS Triggered! Opening WhatsApp message to 9342900780...');
}

function openSosModal() {
    const m = document.getElementById('modalSos');
    if (m) m.classList.add('show');
}

function closeSosModal() {
    const m = document.getElementById('modalSos');
    if (m) m.classList.remove('show');
}

function triggerPoliceCall() {
    closeSosModal();
    openToast('Dialing Emergency Services Police 112...');
}

// ==========================================================================
// 8. DRIVER CALL & CHAT MODALS
// ==========================================================================
function openDriverCallModal() {
    const m = document.getElementById('modalDriverCall');
    if (m) m.classList.add('show');
    playTone(550, 0.1);
}

function closeDriverCallModal() {
    const m = document.getElementById('modalDriverCall');
    if (m) m.classList.remove('show');
}

function openDriverChatModal() {
    const m = document.getElementById('modalDriverChat');
    if (m) m.classList.add('show');
}

function closeDriverChatModal() {
    const m = document.getElementById('modalDriverChat');
    if (m) m.classList.remove('show');
}

function handleSendChatMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInputText');
    const msg = input.value.trim();
    if (!msg) return;

    const box = document.getElementById('chatMessagesBox');
    if (box) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble outgoing';
        bubble.innerHTML = `<p>${msg}</p><span class="chat-time">Just now</span>`;
        box.appendChild(bubble);
        box.scrollTop = box.scrollHeight;
    }
    input.value = '';

    setTimeout(() => {
        if (box) {
            const reply = document.createElement('div');
            reply.className = 'chat-bubble incoming';
            reply.innerHTML = `<p>Got it! I am just reaching the location.</p><span class="chat-time">Just now</span>`;
            box.appendChild(reply);
            box.scrollTop = box.scrollHeight;
            playTone(850, 0.05);
        }
    }, 1200);
}

// ==========================================================================
// 9. RATING & FEEDBACK (SCREEN 8)
// ==========================================================================
function rateStars(num) {
    SmartRaidState.trip.rating = num;
    const btns = document.querySelectorAll('.star-btn');
    btns.forEach((btn, idx) => {
        btn.classList.toggle('filled', idx < num);
    });

    const sentiments = ['Poor', 'Fair', 'Good', 'Great', 'Excellent!'];
    const sentimentTxt = document.getElementById('ratingSentimentText');
    if (sentimentTxt) {
        sentimentTxt.textContent = sentiments[num - 1] || 'Good';
    }
    playTone(650 + num * 50, 0.04);
}

function toggleFbTag(chip) {
    chip.classList.toggle('active');
    playTone(720, 0.02);
}

function handleSubmitFeedback() {
    openToast('Thank you for your feedback! Ride completed.');
    playTone(880, 0.1);
    setTimeout(() => {
        navigateToScreen('screen-where-to');
    }, 800);
}

function handleSkipFeedback() {
    openToast('Ride completed. Safe travels!');
    navigateToScreen('screen-where-to');
}

// ==========================================================================
// 10. UTILITIES: TOAST, SOUND & CONFETTI
// ==========================================================================
let toastTimer = null;
function openToast(msg) {
    const toast = document.getElementById('appToast');
    const msgEl = document.getElementById('toastMessage');
    if (!toast || !msgEl) return;

    msgEl.textContent = msg;
    toast.classList.add('show');

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3200);
}

function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.innerHTML = isPass ? `<i class="fa-regular fa-eye-slash"></i>` : `<i class="fa-regular fa-eye"></i>`;
}

function playTone(freq, dur) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    } catch (e) { }
}

function triggerConfetti() {
    const canvas = document.getElementById('successConfettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth || 800;
    canvas.height = canvas.offsetHeight || 600;

    const particles = [];
    const colors = ['#1e60f2', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    for (let i = 0; i < 90; i++) {
        particles.push({
            x: canvas.width / 2,
            y: canvas.height * 0.35,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.7) * 12,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 10,
            alpha: 1
        });
    }

    let frame = 0;
    function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.22;
            p.rotation += p.vRot;
            p.alpha -= 0.012;

            if (p.alpha > 0) {
                alive = true;
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            }
        });

        if (alive && frame < 90) {
            frame++;
            requestAnimationFrame(anim);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }
    requestAnimationFrame(anim);
}

