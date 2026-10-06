const axios = require('axios');
const captainModel = require('../models/captain.model');
const Redis = require('ioredis');

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
}) : null;
const captainGeoKey = 'captains:locations';
const geocodeCache = new Map();
const routeCache = new Map();
const suggestionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache(cache, key) {
    const value = cache.get(key);
    if (!value || value.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
    }
    return value.data;
}

function writeCache(cache, key, data, ttl = CACHE_TTL_MS) {
    if (cache.size >= 500) cache.delete(cache.keys().next().value);
    cache.set(key, { data, expiresAt: Date.now() + ttl });
    return data;
}

if (redis) {
    redis.connect().catch((error) => {
        console.error('Redis geospatial connection error:', error.message);
    });
    redis.on('error', (error) => {
        console.error('Redis error:', error.message);
    });
}

// ==========================================
// 1. GEOCODING (Upgraded to Photon API)
// ==========================================
async function geocodeAddress(address) {
    if (!address) {
        throw new Error('Address is required');
    }

    const cacheKey = address.trim().toLowerCase();
    const cached = readCache(geocodeCache, cacheKey);
    if (cached) return cached;

    // Photon API perfectly understands the detailed addresses sent by the frontend
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=1`;

    try {
        const response = await axios.get(url);

        if (!response.data || !response.data.features || response.data.features.length === 0) {
            throw new Error('Unable to fetch coordinates');
        }

        // Photon returns coordinates as [longitude, latitude]
        const coords = response.data.features[0].geometry.coordinates;
        return writeCache(geocodeCache, cacheKey, {
            lat: parseFloat(coords[1]),
            lng: parseFloat(coords[0])
        });
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

    const routeKey = `${origin.trim().toLowerCase()}|${destination.trim().toLowerCase()}`;
    const cachedRoute = readCache(routeCache, routeKey);
    if (cachedRoute) return cachedRoute;

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

        return writeCache(routeCache, routeKey, {
            status: 'OK',
            distance: { value: Math.round(realisticDistance) },
            duration: { value: Math.round(realisticTime) },
            origin: originCoords,
            destination: destinationCoords
        });
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
    const cacheKey = `${input.trim().toLowerCase()}|${hasBiasPoint ? `${lat},${lng}` : ''}`;
    const cachedSuggestions = readCache(suggestionCache, cacheKey,);
    if (cachedSuggestions) return cachedSuggestions;

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

        return writeCache(suggestionCache, cacheKey, items.slice(0, 6).map((item) => item.name), 60 * 1000);

    } catch (err) {
        console.error("Suggestion Error:", err.message);
        throw err;
    }
};

// ==========================================
// 5. DATABASE QUERIES
// ==========================================
module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {
    if (redis && redis.status === 'ready') {
        try {
            const captainIds = await redis.geosearch(
                captainGeoKey,
                'FROMLONLAT',
                lng,
                ltd,
                'BYRADIUS',
                radius,
                'km'
            );
            return captainModel.find({
                _id: { $in: captainIds },
                status: 'active',
                kycStatus: 'verified',
                isBlocked: { $ne: true },
            });
        } catch (error) {
            console.error('Redis geospatial lookup error:', error.message);
        }
    }

    return captainModel.find({
        status: 'active',
        kycStatus: 'verified',
        isBlocked: { $ne: true },
        locationGeo: {
            $geoWithin: {
                $centerSphere: [[lng, ltd], radius / 6371]
            }
        }
    });
};

module.exports.updateCaptainLocation = async (captainId, ltd, lng) => {
    if (redis && redis.status === 'ready') {
        try {
            await redis.geoadd(captainGeoKey, lng, ltd, String(captainId));
        } catch (error) {
            console.error('Redis location update error:', error.message);
        }
    }
};

module.exports.removeCaptainLocation = async (captainId) => {
    if (redis && redis.status === 'ready') {
        try {
            await redis.zrem(captainGeoKey, String(captainId));
        } catch (error) {
            console.error('Redis location removal error:', error.message);
        }
    }
};