import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LookingForDriver = (props) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  // Fun tips and engagement info to keep the user from getting bored
  const tips = [
    "🔍 Scanning nearby My Ride captains for your trip...",
    "💡 Tip: Always double-check your driver's vehicle plate and OTP.",
    "⚡ Matching you with the highest-rated driver for the best fare.",
    "🌟 Sit back and relax while we find your ride."
  ];

  // Timer & Tip rotation effect
  useEffect(() => {
    if (!props.isSearching) {
      setElapsedTime(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);

    return () => {
      clearInterval(timer);
      clearInterval(tipInterval);
    };
  }, [props.isSearching, props.rideId, tips.length]);

  // Format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Helper to resolve fare value from various possible structures
  const getFareValue = () => {
    if (props.ride?.fare) return props.ride.fare;
    if (typeof props.fare === 'number') return props.fare;
    if (props.vehicleType && props.fare?.[props.vehicleType]) {
      return props.fare[props.vehicleType];
    }
    return props.fare?.car || Object.values(props.fare || {})[0] || '---';
  };

  const handleCancelRide = async () => {
    try {
      setIsCancelling(true);
      const rideId = props.ride?._id;
      if (rideId) {
        await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel`, { 
          rideId: rideId, 
          reason: 'Cancelled while searching' 
        }, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
      }
      props.setVehicleFound(false);
    } catch (error) {
      console.error("Error cancelling ride:", error);
      props.setVehicleFound(false);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className='p-4 pb-12 relative'>
      {/* Collapse Handle */}
      <h5 
        className='p-2 text-center w-full absolute top-0 left-0 cursor-pointer hover:opacity-75 transition-opacity' 
        onClick={() => props.setVehicleFound(false)}
      >
        <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
      </h5>

      {/* Animated Searching Banner & Live Elapsed Timer */}
      <div className='bg-black text-white p-5 rounded-2xl mt-6 mb-5 flex items-center justify-between shadow-xl relative overflow-hidden'>
        <div className='absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full pointer-events-none animate-ping'></div>
        <div>
          <p className='text-xs text-gray-400 font-medium uppercase tracking-wider'>Searching for Captain</p>
          <h2 className='text-2xl font-black tracking-wider text-green-400 mt-0.5'>
            Looking for a Driver...
          </h2>
          <p className='text-xs text-gray-300 font-mono mt-1'>Time Elapsed: {formatTime(elapsedTime)}</p>
        </div>
        <div className='relative flex items-center justify-center'>
          <div className='absolute w-12 h-12 bg-green-500/20 rounded-full animate-ping'></div>
          <div className='h-12 w-12 bg-white/10 rounded-full flex items-center justify-center text-2xl shadow-inner relative z-10'>
            <i className="ri-radar-line text-green-400 animate-spin"></i>
          </div>
        </div>
      </div>

      {/* Rotating Tips Card (Prevents Boredom) */}
      <div className='bg-gray-50 border border-gray-200/80 p-3.5 rounded-xl mb-5 shadow-sm transition-all duration-300'>
        <p className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1'>Did you know?</p>
        <p className='text-sm text-gray-800 font-medium min-h-[40px] flex items-center'>
          {tips[tipIndex]}
        </p>
      </div>

      {/* Trip Details Summary */}
      <div className='bg-white border border-gray-100 rounded-2xl p-2 shadow-sm mb-4'>
        <div className='flex items-center gap-4 p-3 border-b border-gray-100'>
          <div className='h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg text-gray-800'>
            <i className="ri-map-pin-user-fill"></i>
          </div>
          <div className='flex-1 truncate'>
            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wide'>Pickup</h3>
            <p className='text-sm font-semibold text-gray-900 truncate'>{props.ride?.pickup || props.pickup || 'Current Location'}</p>
          </div>
        </div>

        <div className='flex items-center gap-4 p-3 border-b border-gray-100'>
          <div className='h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg text-gray-800'>
            <i className="ri-map-pin-2-fill"></i>
          </div>
          <div className='flex-1 truncate'>
            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wide'>Destination</h3>
            <p className='text-sm font-semibold text-gray-900 truncate'>{props.ride?.destination || props.destination || 'Selected Destination'}</p>
          </div>
        </div>

        <div className='flex items-center gap-4 p-3'>
          <div className='h-10 w-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg text-gray-800'>
            <i className="ri-currency-line"></i>
          </div>
          <div className='flex-1'>
            <h3 className='text-xs font-semibold text-gray-400 uppercase tracking-wide'>Estimated Fare</h3>
            <p className='text-base font-extrabold text-gray-900'>₹{getFareValue()}</p>
          </div>
        </div>
      </div>

      {/* Cancel Search Button */}
      <button
        onClick={handleCancelRide}
        disabled={isCancelling}
        className='w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-md text-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2'
      >
        <i className="ri-close-circle-line text-lg"></i>
        {isCancelling ? 'Cancelling Request...' : 'Cancel Search'}
      </button>
      <button onClick={() => props.onCancel?.()} disabled={isCancelling} className='w-full mt-2 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl'>
        Back
      </button>
    </div>
  );
};

export default LookingForDriver;