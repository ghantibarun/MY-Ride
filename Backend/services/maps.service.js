const axios = require('axios');
const captainModel = require('../models/captain.model');

// ==========================================
// 1. GEOCODING (Upgraded to Photon API)
// ==========================================
async function geocodeAddress(address) {
    if (!address) {
        throw new Error('Address is required');
    }

    // Photon API perfectly understands the detailed addresses sent by the frontend
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`;

    try {
        const response = await axios.get(url);

        if (!response.data || !response.data.features || response.data.features.length === 0) {
            throw new Error('Unable to fetch coordinates');
        }

        // Photon returns coordinates as [longitude, latitude]
        const coords = response.data.features[0].geometry.coordinates;
        return {
            lat: parseFloat(coords[1]),
            lng: parseFloat(coords[0])
        };
    } catch (error) {
        console.error("Geocoding Error:", error.message);
        throw error;
    }
}

module.exports.getAddressCoordinate = async (address) => {
    const location = await geocodeAddress(address);
    return {
        ltd: location.lat,
        lng: location.lng
    };
};

// ==========================================
// 2. ROUTING (OSRM)
// ==========================================
// ==========================================
// ROUTING (OSRM with Simulated Traffic)
// ==========================================
module.exports.getDistanceTime = async (origin, destination) => {
    if (!origin || !destination) {
        throw new Error('Origin and destination are required');
    }

    const originCoords = await geocodeAddress(origin);
    const destinationCoords = await geocodeAddress(destination);

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords.lng},${originCoords.lat};${destinationCoords.lng},${destinationCoords.lat}?overview=false`;

    try {
        const response = await axios.get(osrmUrl);
        const route = response.data?.routes?.[0];

        if (!route) {
            throw new Error('No routes found');
        }

        // --- THE TRAFFIC FIX ---
        // 1. OSRM gives absolute shortest distance. Real driving is usually ~10% longer due to lane changes/detours.
        const realisticDistance = route.distance; 
        
        // 2. OSRM assumes empty roads. We multiply time by 1.4 (40% delay) to simulate city traffic.
        const trafficDelayMultiplier = 1.80; 
        const realisticTime = route.duration * trafficDelayMultiplier;

        return {
            status: 'OK',
            distance: { value: Math.round(realisticDistance) },
            duration: { value: Math.round(realisticTime) },
            origin: originCoords,
            destination: destinationCoords
        };
    } catch (err) {
        console.error("OSRM Route Error:", err.message);
        throw err;
    }
};

// ==========================================
// 3. DISTANCE MATH
// ==========================================
const toRadians = (value) => (value * Math.PI) / 180;

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
};

// ==========================================
// 4. AUTOCOMPLETE SUGGESTIONS (Upgraded to Photon API)
// ==========================================
module.exports.getAutoCompleteSuggestions = async (input, options = {}) => {
    if (!input) {
        throw new Error('query is required');
    }

    const { lat, lng } = options;
    const hasBiasPoint = Number.isFinite(lat) && Number.isFinite(lng);

    let url = `https://photon.komoot.io/api/?q=${encodeURIComponent(input)}&limit=10`;
    
    // Photon uses location bias natively!
    if (hasBiasPoint) {
        url += `&lat=${lat}&lon=${lng}`;
    }

    try {
        const response = await axios.get(url);

        let items = (response.data?.features || []).map((feature) => {
            const props = feature.properties;
            // Build a clean, readable address string
            const name = [props.name, props.street, props.city, props.state].filter(Boolean).join(', ');
            
            return {
                name,
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0]
            };
        }).filter((item) => item.name);

        // Sort by closest distance to the user
        if (hasBiasPoint) {
            items = items.map((item) => ({
                ...item,
                distanceKm: haversineDistanceKm(lat, lng, item.lat, item.lng)
            })).sort((a, b) => a.distanceKm - b.distanceKm);
        }

        return items.slice(0, 6).map((item) => item.name);

    } catch (err) {
        console.error("Suggestion Error:", err.message);
        throw err;
    }
};

// ==========================================
// 5. DATABASE QUERIES
// ==========================================
module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    const captains = await captainModel.find({
        location: {
            $geoWithin: {
                $centerSphere: [[lng, ltd], radius / 6371]
            }
        }
    });

    return captains;
};