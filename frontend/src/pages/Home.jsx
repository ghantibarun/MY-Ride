import React, { useCallback, useEffect, useRef, useState, useContext } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css';
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { UserDataContext } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';

// Importing our clean map utilities!
import { 
    getAuthHeaders, reverseGeocode, geocodeAddress, 
    fetchSuggestions, getVehicleRecommendation 
} from '../utils/mapUtils';

const Home = () => {
    // State Management
    const [pickup, setPickup] = useState('');
    const [destination, setDestination] = useState('');
    const [pickupCoordinates, setPickupCoordinates] = useState(null);
    const [destinationCoordinates, setDestinationCoordinates] = useState(null);
    
    const [panelOpen, setPanelOpen] = useState(false);
    const [vehiclePanel, setVehiclePanel] = useState(false);
    const [confirmRidePanel, setConfirmRidePanel] = useState(false);
    const [vehicleFound, setVehicleFound] = useState(false);
    const [waitingForDriver, setWaitingForDriver] = useState(false);
    
    const [pickupSuggestions, setPickupSuggestions] = useState([]);
    const [destinationSuggestions, setDestinationSuggestions] = useState([]);
    const [activeField, setActiveField] = useState(null);
    const [isMapSelectMode, setIsMapSelectMode] = useState(false);
    
    const [isGettingCurrentLocation, setIsGettingCurrentLocation] = useState(false);
    const [routeMeta, setRouteMeta] = useState(null);
    const [recommendedVehicle, setRecommendedVehicle] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [fare, setFare] = useState({});
    const [vehicleType, setVehicleType] = useState(null);
    const [ride, setRide] = useState(null);

    // Refs for GSAP
    const baseSheetRef = useRef(null);
    const panelRef = useRef(null);
    const vehiclePanelRef = useRef(null);
    const confirmRidePanelRef = useRef(null);
    const vehicleFoundRef = useRef(null);
    const waitingForDriverRef = useRef(null);
    
    const pickupTimer = useRef(null);
    const destinationTimer = useRef(null);
    const previewTimer = useRef(null);
    const previewRequestId = useRef(0);

    const navigate = useNavigate();
    const { socket } = useContext(SocketContext);
    const { user } = useContext(UserDataContext);

    // BUG FIX: Detect if the user is in the "Booking Flow" (selecting cars, confirming, etc.)
    const isBookingFlow = vehiclePanel || confirmRidePanel || vehicleFound || waitingForDriver;
    const hideBaseSheet = isMapSelectMode || isBookingFlow;

    // ==========================================
    // 1. SOCKET CONNECTIONS
    // ==========================================
    useEffect(() => {
        socket.emit("join", { userType: "user", userId: user._id });
    }, [user, socket]);

    useEffect(() => {
        const onRideConfirmed = (rideData) => {
            setVehicleFound(false);
            setWaitingForDriver(true);
            setRide(rideData);
        };
        const onRideStarted = (rideData) => {
            setWaitingForDriver(false);
            navigate('/riding', { state: { ride: rideData } });
        };
        socket.on('ride-confirmed', onRideConfirmed);
        socket.on('ride-started', onRideStarted);
        return () => {
            socket.off('ride-confirmed', onRideConfirmed);
            socket.off('ride-started', onRideStarted);
        };
    }, [navigate, socket]);

    // ==========================================
    // 2. UI LOCATION MANAGERS
    // ==========================================
    const openSearchPanel = (field) => {
        setPanelOpen(true);
        setActiveField(field);
        setIsMapSelectMode(false);
    };

    const selectLocationFromCoordinates = useCallback(async (lat, lng, field) => {
        const address = await reverseGeocode(lat, lng);
        if (field === 'pickup') {
            setPickup(address);
            setPickupCoordinates({ lat, lng });
            setPickupSuggestions([]);
            setActiveField('destination');
        } else if (field === 'destination') {
            setDestination(address);
            setDestinationCoordinates({ lat, lng });
            setDestinationSuggestions([]);
            setPanelOpen(false);
        }
        return address;
    }, []);

    const requestCurrentLocation = useCallback(async (targetField = 'pickup') => {
        if (!navigator.geolocation) return;
        setIsGettingCurrentLocation(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    await selectLocationFromCoordinates(position.coords.latitude, position.coords.longitude, targetField);
                } catch (error) { console.error('Location error:', error); } 
                finally { setIsGettingCurrentLocation(false); }
            },
            () => { setIsGettingCurrentLocation(false); },
            { enableHighAccuracy: true, timeout: 12000 }
        );
    }, [selectLocationFromCoordinates]);

    useEffect(() => {
        if (!pickup) requestCurrentLocation('pickup');
    }, [pickup, requestCurrentLocation]);

    const handleUseCurrentLocation = async () => {
        await requestCurrentLocation('pickup');
        setIsMapSelectMode(false);
    };

    const handleMapClickSelect = async (latlng) => {
        // BUG FIX: Ignore accidental map clicks if the user is picking a car!
        if (!activeField || (panelOpen && !isMapSelectMode) || isBookingFlow) return;
        try {
            await selectLocationFromCoordinates(latlng.lat, latlng.lng, activeField);
            setIsMapSelectMode(false);
        } catch (error) { console.error('Map click failed:', error); }
    };

    const handlePinAdjust = async (latlng, field) => {
        // BUG FIX: Ignore accidental pin dragging if the user is picking a car!
        if (isBookingFlow) return; 
        try { await selectLocationFromCoordinates(latlng.lat, latlng.lng, field); } 
        catch (error) { console.error('Pin adjust failed:', error); }
    };

    const handleSuggestionSelect = async (address, field) => {
        if (field === 'pickup') {
            setPickup(address);
            setPickupSuggestions([]);
            setActiveField('destination');
        } else {
            setDestination(address);
            setDestinationSuggestions([]);
            setPanelOpen(false);
        }
        try {
            const coords = await geocodeAddress(address);
            if (field === 'pickup') setPickupCoordinates(coords);
            else setDestinationCoordinates(coords);
        } catch (error) { console.error('Fetch coordinates failed:', error); }
    };

    const startMapSelection = (field) => {
        setActiveField(field || 'pickup');
        setIsMapSelectMode(true);
        setPanelOpen(false);
    };

    // ==========================================
    // 3. INPUT HANDLERS
    // ==========================================
    const handlePickupChange = (e) => {
        setPickup(e.target.value);
        if (pickupTimer.current) clearTimeout(pickupTimer.current);
        pickupTimer.current = setTimeout(async () => {
            if (e.target.value.length < 3) return setPickupSuggestions([]);
            try {
                const biasCoords = destinationCoordinates || null;
                const suggestions = await fetchSuggestions(e.target.value, biasCoords);
                setPickupSuggestions(suggestions);
            } catch (error) { console.error("Pickup search failed"); }
        }, 400);
    };

    const handleDestinationChange = (e) => {
        setDestination(e.target.value);
        if (destinationTimer.current) clearTimeout(destinationTimer.current);
        destinationTimer.current = setTimeout(async () => {
            if (e.target.value.length < 3) return setDestinationSuggestions([]);
            try {
                const biasCoords = pickupCoordinates || null;
                const suggestions = await fetchSuggestions(e.target.value, biasCoords);
                setDestinationSuggestions(suggestions);
            } catch (error) { console.error("Destination search failed"); }
        }, 400);
    };

    // ==========================================
    // 4. TRIP ESTIMATES & CREATION
    // ==========================================
    useEffect(() => {
        if (previewTimer.current) clearTimeout(previewTimer.current);
        if (!pickup || !destination || pickup.length < 3 || destination.length < 3) return setIsPreviewLoading(false);

        previewTimer.current = setTimeout(async () => {
            const currentRequestId = ++previewRequestId.current;
            setIsPreviewLoading(true);

            try {
                let resolvedPickup = pickupCoordinates || await geocodeAddress(pickup);
                if (currentRequestId !== previewRequestId.current) return;
                if (!pickupCoordinates) setPickupCoordinates(resolvedPickup);

                let resolvedDest = destinationCoordinates || await geocodeAddress(destination);
                if (currentRequestId !== previewRequestId.current) return;
                if (!destinationCoordinates) setDestinationCoordinates(resolvedDest);

                const [fareResponse, distanceResponse] = await Promise.all([
                    axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, { params: { pickup, destination }, ...getAuthHeaders() }),
                    axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-distance-time`, { params: { origin: pickup, destination }, ...getAuthHeaders() })
                ]);

                if (currentRequestId !== previewRequestId.current) return;
                setFare(fareResponse.data);
                setRouteMeta(distanceResponse.data);
                setRecommendedVehicle(getVehicleRecommendation(fareResponse.data, distanceResponse.data?.duration?.value));
            } catch (error) { console.error('Trip preview failed'); } 
            finally { if (currentRequestId === previewRequestId.current) setIsPreviewLoading(false); }
        }, 400);

        return () => { if (previewTimer.current) clearTimeout(previewTimer.current); };
    }, [pickup, destination, pickupCoordinates, destinationCoordinates]);

    async function findTrip() {
        if (!pickup || !destination) return;
        setVehiclePanel(true);
        setActiveField(null); // BUG FIX: Tells the map that we are no longer searching for locations!
    }

    async function createRide() {
        await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
            pickup, destination, vehicleType
        }, getAuthHeaders());
    }

    // ==========================================
    // 5. BULLETPROOF GSAP ANIMATIONS
    // ==========================================
    useGSAP(() => {
        if (hideBaseSheet) {
            gsap.to(baseSheetRef.current, { y: '120%', opacity: 0, pointerEvents: 'none', duration: 0.3, ease: 'power2.inOut' });
        } else {
            gsap.to(baseSheetRef.current, { y: '0%', opacity: 1, pointerEvents: 'auto', duration: 0.3, ease: 'power2.inOut' });
        }
    }, [hideBaseSheet]);

    useGSAP(() => {
        if (panelOpen) {
            gsap.to(panelRef.current, { y: '0%', opacity: 1, pointerEvents: 'auto', duration: 0.3, ease: 'power2.out' });
        } else {
            gsap.to(panelRef.current, { y: '100%', opacity: 0, pointerEvents: 'none', duration: 0.2, ease: 'power2.in' });
        }
    }, [panelOpen]);

    useGSAP(() => { 
        gsap.to(vehiclePanelRef.current, { y: vehiclePanel ? '0%' : '120%', opacity: vehiclePanel ? 1 : 0, pointerEvents: vehiclePanel ? 'auto' : 'none', duration: 0.3, ease: 'power2.out' }); 
    }, [vehiclePanel]);

    useGSAP(() => { 
        gsap.to(confirmRidePanelRef.current, { y: confirmRidePanel ? '0%' : '120%', opacity: confirmRidePanel ? 1 : 0, pointerEvents: confirmRidePanel ? 'auto' : 'none', duration: 0.3, ease: 'power2.out' }); 
    }, [confirmRidePanel]);

    useGSAP(() => { 
        gsap.to(vehicleFoundRef.current, { y: vehicleFound ? '0%' : '120%', opacity: vehicleFound ? 1 : 0, pointerEvents: vehicleFound ? 'auto' : 'none', duration: 0.3, ease: 'power2.out' }); 
    }, [vehicleFound]);

    useGSAP(() => { 
        gsap.to(waitingForDriverRef.current, { y: waitingForDriver ? '0%' : '120%', opacity: waitingForDriver ? 1 : 0, pointerEvents: waitingForDriver ? 'auto' : 'none', duration: 0.3, ease: 'power2.out' }); 
    }, [waitingForDriver]);


    // ==========================================
    // 6. RENDER
    // ==========================================
    return (
        <div className='h-[100dvh] w-full relative overflow-hidden bg-gray-100'>
        {/*MY RIDE BRANDING */}
        <div className='absolute top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-white/95 backdrop-blur-md text-gray-900 px-6 py-2.5 rounded-full font-black tracking-widest text-sm shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center gap-2'>
            <span className='bg-black text-white w-2 h-2 rounded-full animate-pulse'></span>
            MyRide
        </div>

            {/* LIVE MAP */}
            <div className='absolute top-0 left-0 w-full h-full z-0'>
                <LiveTracking pickupLocation={pickupCoordinates} destinationLocation={destinationCoordinates} onMapClick={handleMapClickSelect} activeField={activeField} onPickupPinDrag={(latlng) => handlePinAdjust(latlng, 'pickup')} onDestinationPinDrag={(latlng) => handlePinAdjust(latlng, 'destination')} />
            </div>

            {/* MAP SELECTION HEADER */}
            {isMapSelectMode && (
                <div className='absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto'>
                    <div className='bg-black text-white px-5 py-3 rounded-full text-sm flex items-center gap-4 shadow-xl'>
                        <span className="font-medium">Drag map to set {activeField}</span>
                        <button type='button' onClick={() => setIsMapSelectMode(false)} className='text-gray-300 hover:text-white font-semibold'>Cancel</button>
                    </div>
                </div>
            )}

            {/* IDLE BOTTOM SHEET (Find a Trip) */}
            <div ref={baseSheetRef} className='absolute bottom-0 left-0 w-full z-10'>
                <div className='p-5 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pointer-events-auto'>
                    <h4 className='text-2xl font-semibold mb-4'>Find a trip</h4>
                    <div className='relative'>
                        <div className="line absolute h-12 w-1 top-[28%] left-5 bg-gray-700 rounded-full"></div>
                        <input readOnly onClick={() => openSearchPanel('pickup')} value={pickup} className='bg-[#eee] px-12 py-3 text-base rounded-lg w-full outline-none cursor-pointer truncate text-gray-800 font-medium' placeholder='Add a pick-up location' />
                        <input readOnly onClick={() => openSearchPanel('destination')} value={destination} className='bg-[#eee] px-12 py-3 text-base rounded-lg w-full outline-none cursor-pointer truncate text-gray-800 font-medium mt-3' placeholder='Enter your destination' />
                    </div>

                    {(routeMeta || isPreviewLoading) && (
                        <div className='mt-4 rounded-xl border border-gray-200 px-4 py-3 bg-gray-50 shadow-sm'>
                            {isPreviewLoading && <p className='text-gray-500 text-sm animate-pulse'>Calculating fastest route...</p>}
                            {routeMeta && !isPreviewLoading && (
                                <div className='flex items-center justify-between'>
                                    <p className='text-gray-700 font-medium'>
                                        <i className="ri-route-line mr-2"></i> {(routeMeta.distance?.value / 1000).toFixed(1)} km 
                                        <span className='mx-2 text-gray-300'>|</span> 
                                        <i className="ri-timer-line mr-2"></i> {Math.ceil((routeMeta.duration?.value || 0) / 60)} min
                                    </p>
                                </div>
                            )}
                            {recommendedVehicle && !isPreviewLoading && (
                                <p className='mt-2 text-sm font-semibold text-green-700'>
                                    <i className="ri-check-double-line mr-1"></i> Fastest match: {recommendedVehicle.label}
                                </p>
                            )}
                        </div>
                    )}
                    <button onClick={findTrip} disabled={!pickup || !destination} className='bg-black text-white px-4 py-3 rounded-xl mt-4 w-full font-semibold text-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'>
                        Find Trip
                    </button>
                </div>
            </div>

            {/* FULL SCREEN SEARCH OVERLAY */}
            <div ref={panelRef} className='fixed top-0 left-0 w-full h-[100dvh] bg-gray-50 z-50 flex flex-col translate-y-[100%] opacity-0 pointer-events-none'>
                <div className='p-5 bg-white shadow-sm z-10'>
                    <div className='flex items-center gap-4 mb-5'>
                        <i onClick={() => setPanelOpen(false)} className="ri-arrow-down-s-line text-3xl cursor-pointer text-gray-700 hover:text-black"></i>
                        <h4 className='text-xl font-bold text-gray-800'>{activeField === 'pickup' ? 'Pick-up location' : 'Where to?'}</h4>
                    </div>
                    <div className='relative'>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                            <i className={activeField === 'pickup' ? "ri-map-pin-user-fill text-xl text-black" : "ri-map-pin-fill text-xl text-black"}></i>
                        </div>
                        <input autoFocus value={activeField === 'pickup' ? pickup : destination} onChange={activeField === 'pickup' ? handlePickupChange : handleDestinationChange} className='bg-gray-100 pl-12 pr-4 py-4 text-lg rounded-xl w-full outline-none focus:ring-2 focus:ring-black' placeholder={activeField === 'pickup' ? 'Search pickup location' : 'Search destination'} />
                    </div>
                </div>
                <div className='flex-1 overflow-y-auto p-5 bg-white mt-2 shadow-inner pointer-events-auto'>
                    <LocationSearchPanel suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions} activeField={activeField} onSuggestionSelect={handleSuggestionSelect} onUseCurrentLocation={handleUseCurrentLocation} isGettingCurrentLocation={isGettingCurrentLocation} onSelectMap={startMapSelection} />
                </div>
            </div>

            {/* RIDE FLOW PANELS */}
            <div ref={vehiclePanelRef} className='fixed w-full z-40 bottom-0 bg-white px-3 py-10 pt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl translate-y-[120%] opacity-0 pointer-events-none'>
                <VehiclePanel selectVehicle={setVehicleType} fare={fare} setConfirmRidePanel={setConfirmRidePanel} setVehiclePanel={setVehiclePanel} />
            </div>
            <div ref={confirmRidePanelRef} className='fixed w-full z-40 bottom-0 bg-white px-3 py-6 pt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl translate-y-[120%] opacity-0 pointer-events-none'>
                <ConfirmRide createRide={createRide} pickup={pickup} destination={destination} fare={fare} vehicleType={vehicleType} setConfirmRidePanel={setConfirmRidePanel} setVehicleFound={setVehicleFound} />
            </div>
            <div ref={vehicleFoundRef} className='fixed w-full z-40 bottom-0 bg-white px-4 py-6 pt-10 pb-16 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl translate-y-[120%] opacity-0 pointer-events-none max-h-[85vh] overflow-y-auto'>
                <LookingForDriver createRide={createRide} pickup={pickup} destination={destination} fare={fare} vehicleType={vehicleType} setVehicleFound={setVehicleFound} />
            </div>
            <div ref={waitingForDriverRef} className='fixed w-full z-40 bottom-0 bg-white px-3 py-6 pt-12 shadow-[0_-10px_40px_rgba(0,0,0,0.15)] rounded-t-3xl translate-y-[120%] opacity-0 pointer-events-none'>
                <WaitingForDriver ride={ride} setVehicleFound={setVehicleFound} setWaitingForDriver={setWaitingForDriver} waitingForDriver={waitingForDriver} />
            </div>
        </div>
    );
};

export default Home;