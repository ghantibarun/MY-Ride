import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { SocketContext } from '../context/SocketContext';
import LiveTracking from '../components/LiveTracking';

const Riding = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { socket } = useContext(SocketContext);

    const initialRide = location.state?.ride;
    const [ride, setRide] = useState(initialRide);
    const [paymentMessage, setPaymentMessage] = useState('');
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    // 1. Add state for the map coordinates
    const [pickupCoordinates, setPickupCoordinates] = useState(null);
    const [destinationCoordinates, setDestinationCoordinates] = useState(null);

    useEffect(() => {
        if (location.state?.ride) {
            setRide(location.state.ride);
        }
    }, [location.state]);

    useEffect(() => {
        if (ride?._id) socket.emit('join-ride', { rideId: ride._id });
    }, [ride?._id, socket]);

    // 2. Fetch coordinates as soon as we have the ride data
    useEffect(() => {
        const fetchCoordinates = async () => {
            if (!ride?.pickup || !ride?.destination) return;
            try {
                // Get Pickup Coordinates
                const pickupRes = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: ride.pickup },
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setPickupCoordinates({ lat: pickupRes.data.ltd, lng: pickupRes.data.lng });

                // Get Destination Coordinates
                const destRes = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                    params: { address: ride.destination },
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                });
                setDestinationCoordinates({ lat: destRes.data.ltd, lng: destRes.data.lng });
            } catch (error) {
                console.error("Error fetching map coordinates:", error);
            }
        };

        fetchCoordinates();
    }, [ride]);

    useEffect(() => {
        socket.on('ride-ended', () => {
            navigate('/home');
        });

        return () => {
            socket.off('ride-ended');
        };
    }, [navigate, socket]);

    const handlePayRide = async () => {
        try {
            setIsSubmitting(true);
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/payments/orders`, {
                rideId: ride?._id,
                method: 'online',
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.data.order) {
                setRide(response.data.ride);
                setPaymentMessage('Payment is already completed.');
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.onload = () => {
                const checkout = new window.Razorpay({
                    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
                    amount: response.data.order.amount,
                    currency: response.data.order.currency,
                    name: 'MY Ride',
                    order_id: response.data.order.id,
                    handler: async (paymentResponse) => {
                        const verified = await axios.post(`${import.meta.env.VITE_BASE_URL}/payments/verify`, {
                            rideId: ride?._id,
                            orderId: paymentResponse.razorpay_order_id,
                            paymentId: paymentResponse.razorpay_payment_id,
                            signature: paymentResponse.razorpay_signature,
                            method: 'online',
                        }, {
                            headers: {
                                Authorization: `******'token')}`
                            }
                        });
                        setRide(verified.data);
                        setPaymentMessage('Payment completed successfully.');
                    },
                    modal: {
                        ondismiss: () => setPaymentMessage('Payment was cancelled.'),
                    },
                });
                checkout.open();
            };
            script.onerror = () => setPaymentMessage('Unable to load payment checkout.');
            document.body.appendChild(script);
        } catch (error) {
            setPaymentMessage(error.response?.data?.message || 'Payment failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelRide = async () => {
        try {
            setIsCancelling(true);
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/cancel`, { rideId: ride?._id, reason: 'Cancelled by rider' }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setRide(response.data);
            setPaymentMessage('Ride cancelled successfully.');
            setTimeout(() => navigate('/home'), 800);
        } catch (error) {
            setPaymentMessage(error.response?.data?.message || 'Unable to cancel ride.');
        } finally {
            setIsCancelling(false);
        }
    };

    const triggerSos = () => {
        navigator.geolocation?.getCurrentPosition(async (position) => {
            try {
                await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/sos`, {
                    rideId: ride?._id,
                    location: {
                        ltd: position.coords.latitude,
                        lng: position.coords.longitude,
                    },
                }, {
                    headers: { Authorization: `******'token')}` }
                });
                setPaymentMessage('SOS alert sent to your ride counterpart.');
            } catch (error) {
                setPaymentMessage(error.response?.data?.message || 'Unable to send SOS alert.');
            }
        }, () => setPaymentMessage('Location permission is required to send SOS.'));
    };

    const handleReviewRide = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/review`, {
                rideId: ride?._id,
                rating,
                review
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            });
            setRide(response.data);
            setPaymentMessage('Thanks for your feedback.');
        } catch (error) {
            setPaymentMessage(error.response?.data?.message || 'Unable to submit review.');
        }
    };

    return (
        <div className='h-screen'>
            <Link to='/home' className='fixed right-2 top-2 h-10 w-10 bg-white flex items-center justify-center rounded-full z-10'>
                <i className="text-lg font-medium ri-home-5-line"></i>
            </Link>

            <div className='h-1/2'>
                {/* 3. Pass the fetched coordinates to the map! */}
                <LiveTracking
                    pickupLocation={pickupCoordinates}
                    destinationLocation={destinationCoordinates}
                />
            </div>

            <div className='h-1/2 p-4 overflow-y-auto'>
                <div className='flex items-center justify-between'>
                    <img className='h-12' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-MyRidex-take.jpg" alt="" />
                    <div className='text-right'>
                        <h2 className='text-lg font-medium capitalize'>{ride?.captain?.fullname?.firstname || 'Captain'}</h2>
                        <h4 className='text-xl font-semibold -mt-1 -mb-1'>{ride?.captain?.vehicle?.plate || '---'}</h4>
                        <p className='text-sm text-gray-600'>Maruti Suzuki Alto</p>
                    </div>
                </div>

                <div className='flex gap-2 justify-between flex-col items-center'>
                    <div className='w-full mt-5'>
                        <div className='flex items-center gap-5 p-3 border-b-2'>
                            <i className="text-lg ri-map-pin-2-fill"></i>
                            <div>
                                <h3 className='text-lg font-medium'>Destination</h3>
                                <p className='text-sm -mt-1 text-gray-600'>{ride?.destination}</p>
                            </div>
                        </div>
                        <div className='flex items-center gap-5 p-3'>
                            <i className="ri-currency-line"></i>
                            <div>
                                <h3 className='text-lg font-medium'>₹{ride?.fare || 0}</h3>
                                <p className='text-sm -mt-1 text-gray-600'>Payment: {ride?.paymentStatus || 'pending'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {paymentMessage && <p className='mt-3 text-sm text-green-600'>{paymentMessage}</p>}

                <div className='mt-4 flex gap-2'>
                    <button
                        onClick={handlePayRide}
                        disabled={isSubmitting || ride?.paymentStatus === 'paid' || ride?.status === 'cancelled'}
                        className='flex-1 bg-green-600 text-white font-semibold p-2 rounded-lg disabled:opacity-60'
                    >
                        {isSubmitting ? 'Processing...' : ride?.paymentStatus === 'paid' ? 'Paid' : 'Make a Payment'}
                    </button>
                    <button
                        onClick={handleCancelRide}
                        disabled={isCancelling || ride?.status === 'completed' || ride?.status === 'cancelled'}
                        className='flex-1 bg-red-600 text-white font-semibold p-2 rounded-lg disabled:opacity-60'
                    >
                        {isCancelling ? 'Cancelling...' : 'Cancel Ride'}
                    </button>
                </div>
                <button onClick={triggerSos} className='w-full mt-3 bg-red-700 text-white font-bold p-3 rounded-lg'>
                    Emergency SOS
                </button>

                <form onSubmit={handleReviewRide} className='mt-5 border-t pt-4 pb-10'>
                    <h3 className='text-lg font-semibold'>Rate your ride</h3>
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className='w-full mt-2 border rounded-lg p-2'>
                        <option value={5}>5 - Excellent</option>
                        <option value={4}>4 - Very Good</option>
                        <option value={3}>3 - Good</option>
                        <option value={2}>2 - Fair</option>
                        <option value={1}>1 - Poor</option>
                    </select>
                    <textarea value={review} onChange={(e) => setReview(e.target.value)} className='w-full mt-2 border rounded-lg p-2' rows='3' placeholder='Tell us about your ride'></textarea>
                    <button type='submit' className='w-full mt-2 bg-black text-white font-semibold p-2 rounded-lg'>Submit Review</button>
                </form>
            </div>
        </div>
    );
};

export default Riding;