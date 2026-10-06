import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WaitingForDriver = (props) => {
  const [isCancelling, setIsCancelling] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes countdown timer (180 seconds)

  // Countdown Timer Effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setMessage('Driver arrival time expired. You can extend time or cancel the ride.');
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Format seconds into MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCancelRide = async () => {
    try {
      setIsCancelling(true);
      if (props.onCancel) {
        await props.onCancel();
        return;
      }
      await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel`, { rideId: props.ride?._id, reason: 'Cancelled by rider' }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessage('Ride cancelled successfully.');
      props.setWaitingForDriver(false);
      props.setVehicleFound(false);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to cancel ride.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className='p-2 relative pb-8'>
      {/* Collapse Handle */}
      <h5 
        className='p-2 text-center w-full absolute top-0 left-0 cursor-pointer hover:opacity-75 transition-opacity' 
        onClick={() => {
          props.setWaitingForDriver(false)
        }}
      >
        <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
      </h5>

      {/* Interactive Timer & Moving Car Status Banner */}
      <div className='bg-black text-white p-4 rounded-2xl mt-6 mb-4 flex items-center justify-between shadow-lg'>
        <div>
          <p className='text-xs text-gray-400 font-medium uppercase tracking-wider'>Driver Arriving In</p>
          <h2 className='text-2xl font-black tracking-widest text-green-400 font-mono'>
            {timeLeft > 0 ? formatTime(timeLeft) : 'Arriving Now!'}
          </h2>
        </div>
        <div className='flex items-center gap-2'>
          <div className='h-10 w-10 bg-white/10 rounded-full flex items-center justify-center text-xl animate-bounce shadow-inner'>
            <i className="ri-car-fill text-white"></i>
          </div>
        </div>
      </div>

      {/* Driver & Vehicle Header */}
      <div className='flex items-center justify-between border-b border-gray-100 pb-4'>
        <div className='h-14 w-16 bg-gray-100 rounded-2xl flex items-center justify-center text-3xl text-gray-900 shadow-sm'>
          <i className="ri-car-fill"></i>
        </div>
        <div className='text-right'>
          <h2 className='text-lg font-bold capitalize text-gray-900'>{props.ride?.captain?.fullname?.firstname || 'Captain'}</h2>
          <h4 className='text-xl font-extrabold text-gray-800 -mt-1 -mb-1 tracking-wide'>{props.ride?.captain?.vehicle?.plate || '---'}</h4>
          <p className='text-xs text-gray-500'>Maruti Suzuki Alto</p>
          <div className='mt-1 inline-block bg-gray-100 px-3 py-1 rounded-lg'>
            <span className='text-xs text-gray-500 mr-1'>OTP:</span>
            <span className='text-base font-bold text-gray-900 tracking-wider'>{props.ride?.otp || '----'}</span>
          </div>
        </div>
      </div>

      {/* Trip Details List */}
      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full mt-2'>
          <div className='flex items-center gap-4 p-3 border-b border-gray-100'>
            <i className="text-xl text-gray-700 ri-map-pin-user-fill"></i>
            <div>
              <h3 className='text-sm font-semibold text-gray-500'>Pickup</h3>
              <p className='text-sm font-medium text-gray-900 -mt-0.5 truncate max-w-[280px]'>{props.ride?.pickup}</p>
            </div>
          </div>

          <div className='flex items-center gap-4 p-3 border-b border-gray-100'>
            <i className="text-xl text-gray-700 ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-sm font-semibold text-gray-500'>Destination</h3>
              <p className='text-sm font-medium text-gray-900 -mt-0.5 truncate max-w-[280px]'>{props.ride?.destination}</p>
            </div>
          </div>

          <div className='flex items-center gap-4 p-3'>
            <i className="text-xl text-gray-700 ri-currency-line"></i>
            <div>
              <h3 className='text-base font-bold text-gray-900'>₹{props.ride?.fare}</h3>
              <p className='text-xs text-gray-500 capitalize'>Payment: {props.ride?.paymentStatus || 'pending'}</p>
            </div>
          </div>
        </div>
      </div>

      {message && <p className='mt-2 text-center text-sm font-medium text-green-600'>{message}</p>}

      {/* Interactive Actions at the Bottom */}
      <div className='flex gap-3 mt-4'>
        <button onClick={() => props.onCancel?.()} disabled={isCancelling} className='w-1/2 border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl'>
          Back
        </button>
        {timeLeft <= 0 && (
          <button
            onClick={() => setTimeLeft(180)} // Resets/Extends timer
            className='w-1/2 bg-gray-900 hover:bg-black text-white font-semibold py-3 rounded-xl transition-colors shadow-md text-sm'
          >
            Extend Time
          </button>
        )}
        <button
          onClick={handleCancelRide}
          disabled={isCancelling}
          className={`${timeLeft <= 0 ? 'w-1/2' : 'w-full'} bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 shadow-md text-sm cursor-pointer`}
        >
          {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
        </button>
      </div>
    </div>
  );
};

export default WaitingForDriver;