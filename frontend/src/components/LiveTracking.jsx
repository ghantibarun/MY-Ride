import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

const defaultCenter = { lat: 20.5937, lng: 78.9629 };

const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const MapRecenter = ({ center }) => {
    const map = useMap();

    useEffect(() => {
        map.setView([center.lat, center.lng], map.getZoom(), { animate: true });
    }, [center, map]);

    return null;
};

const MapClickSelector = ({ onMapClick, activeField }) => {
    useMapEvents({
        click(event) {
            if (!onMapClick || !activeField) return;
            onMapClick(event.latlng);
        }
    });

    return null;
};

const LiveTracking = ({ pickupLocation, destinationLocation, onMapClick, activeField, onPickupPinDrag, onDestinationPinDrag }) => {
    const [currentPosition, setCurrentPosition] = useState(defaultCenter);
    const [routePoints, setRoutePoints] = useState([]);

    useEffect(() => {
        let wakeLock;
        const requestWakeLock = async () => {
            if ('wakeLock' in navigator) {
                try {
                    wakeLock = await navigator.wakeLock.request('screen');
                } catch (error) {
                    console.warn('Screen wake lock unavailable:', error.message);
                }
            }
        };
        requestWakeLock();
        return () => {
            if (wakeLock) wakeLock.release().catch(() => {});
        };
    }, []);

    useEffect(() => {
        if (!navigator.geolocation) {
            return;
        }

        const updatePosition = () => {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                setCurrentPosition({ lat: latitude, lng: longitude });
            });
        };

        updatePosition();

        const watchId = navigator.geolocation.watchPosition((position) => {
            const { latitude, longitude } = position.coords;
            setCurrentPosition({ lat: latitude, lng: longitude });
        });

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    const mapCenter = useMemo(() => {
        if (pickupLocation) return pickupLocation;
        if (destinationLocation) return destinationLocation;
        return currentPosition;
    }, [currentPosition, pickupLocation, destinationLocation]);

    useEffect(() => {
        const fetchRoadRoute = async () => {
            if (!pickupLocation || !destinationLocation) {
                setRoutePoints([]);
                return;
            }

            try {
                const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickupLocation.lng},${pickupLocation.lat};${destinationLocation.lng},${destinationLocation.lat}?overview=full&geometries=geojson`;
                const response = await fetch(osrmUrl);
                const data = await response.json();

                const coordinates = data?.routes?.[0]?.geometry?.coordinates || [];
                if (coordinates.length === 0) {
                    throw new Error('No route geometry returned');
                }

                const mapped = coordinates.map(([lng, lat]) => [lat, lng]);
                setRoutePoints(mapped);
            } catch (error) {
                // Fallback to a direct segment if routing API is unavailable.
                setRoutePoints([
                    [pickupLocation.lat, pickupLocation.lng],
                    [destinationLocation.lat, destinationLocation.lng]
                ]);
            }
        };

        fetchRoadRoute();
    }, [pickupLocation, destinationLocation]);

    const isCurrentNearPickup = useMemo(() => {
        if (!pickupLocation) return false;
        const latDiff = Math.abs(currentPosition.lat - pickupLocation.lat);
        const lngDiff = Math.abs(currentPosition.lng - pickupLocation.lng);
        return latDiff < 0.0003 && lngDiff < 0.0003;
    }, [currentPosition, pickupLocation]);

    return (
        <div className='h-full w-full'>
            <MapContainer center={[mapCenter.lat, mapCenter.lng]} zoom={13} style={{ height: '100%', width: '100%' }}>
                <MapRecenter center={mapCenter} />
                <MapClickSelector onMapClick={onMapClick} activeField={activeField} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                />
                {!isCurrentNearPickup && (
                    <Marker position={[currentPosition.lat, currentPosition.lng]}>
                        <Popup>Your location</Popup>
                    </Marker>
                )}
                {pickupLocation && (
                    <Marker
                        position={[pickupLocation.lat, pickupLocation.lng]}
                        icon={pickupIcon}
                        draggable
                        eventHandlers={{
                            dragend: (event) => {
                                const nextPoint = event.target.getLatLng();
                                if (onPickupPinDrag) onPickupPinDrag(nextPoint);
                            }
                        }}>
                        <Popup>Pickup</Popup>
                    </Marker>
                )}
                {destinationLocation && (
                    <Marker
                        position={[destinationLocation.lat, destinationLocation.lng]}
                        icon={destinationIcon}
                        draggable
                        eventHandlers={{
                            dragend: (event) => {
                                const nextPoint = event.target.getLatLng();
                                if (onDestinationPinDrag) onDestinationPinDrag(nextPoint);
                            }
                        }}>
                        <Popup>Destination</Popup>
                    </Marker>
                )}
                {pickupLocation && destinationLocation && routePoints.length > 1 && (
                    <Polyline positions={routePoints} pathOptions={{ color: '#2563eb', weight: 5 }} />
                )}
            </MapContainer>
        </div>
    );
};

export default LiveTracking;