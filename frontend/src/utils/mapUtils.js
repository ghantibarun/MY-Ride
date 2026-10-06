import axios from 'axios';

// Get the authorization token for backend requests
export const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Converts GPS coordinates to a readable address using Photon API
export const reverseGeocode = async (lat, lng) => {
    try {
        const response = await axios.get('https://photon.komoot.io/reverse', {
            params: { lon: lng, lat: lat }
        });
        if (response.data?.features?.length > 0) {
            const props = response.data.features[0].properties;
            return [props.name, props.street, props.city, props.state].filter(Boolean).join(', ');
        }
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
};

// Converts an address string back to GPS coordinates via Backend
export const geocodeAddress = async (address) => {
    const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
        params: { address },
        ...getAuthHeaders()
    });
    return { lat: response.data.ltd, lng: response.data.lng };
};

// Calculates the straight-line distance between two GPS coordinates
export const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (val) => (val * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Fallback search engine using Photon API
export const fallbackSuggestions = async (input, biasCoords) => {
    const params = { q: input, limit: 7 };
    if (biasCoords?.lat && biasCoords?.lng) {
        params.lat = biasCoords.lat;
        params.lon = biasCoords.lng;
    }

    try {
        const response = await axios.get('https://photon.komoot.io/api/', { params });
        let items = (response.data?.features || []).map((feature) => {
            const props = feature.properties;
            const name = [props.name, props.street, props.city, props.state].filter(Boolean).join(', ');
            return { name, lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] };
        }).filter((item) => item.name);

        if (biasCoords?.lat && biasCoords?.lng) {
            items = items.map((item) => ({
                ...item, distance: haversineDistanceKm(biasCoords.lat, biasCoords.lng, item.lat, item.lng)
            })).sort((a, b) => a.distance - b.distance);
        }
        return items.slice(0, 6).map((item) => item.name);
    } catch (error) {
        return [];
    }
};

// Main function to fetch autocomplete suggestions
export const fetchSuggestions = async (input, biasCoords) => {
    const params = { input };
    if (biasCoords?.lat && biasCoords?.lng) {
        params.lat = biasCoords.lat;
        params.lng = biasCoords.lng;
        params.radiusKm = 30;
    }

    try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
            params, ...getAuthHeaders()
        });
        const list = Array.isArray(response.data) ? response.data : [];
        return list.length > 0 ? list : await fallbackSuggestions(input, biasCoords);
    } catch (error) {
        return await fallbackSuggestions(input, biasCoords);
    }
};

// Calculates the cheapest and fastest vehicle option
export const getVehicleRecommendation = (fareData, durationSeconds) => {
    if (!fareData || !durationSeconds) return null;
    const baseMinutes = durationSeconds / 60;
    const options = [
        { key: 'motorcycle', label: 'Moto', eta: baseMinutes * 0.82, fare: fareData.motorcycle ?? Infinity },
        { key: 'auto', label: 'Auto', eta: baseMinutes * 1.0, fare: fareData.auto ?? Infinity },
        { key: 'car', label: 'Car', eta: baseMinutes * 1.08, fare: fareData.car ?? Infinity }
    ].filter((item) => Number.isFinite(item.fare));

    if (options.length === 0) return null;
    return options.sort((a, b) => a.eta === b.eta ? a.fare - b.fare : a.eta - b.eta)[0];
};