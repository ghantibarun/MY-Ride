import React, { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import { useEffect, useContext } from 'react'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CaptainContext'
import axios from 'axios'

const CaptainHome = () => {

    const [ridePopupPanel, setRidePopupPanel] = useState(false)
    const [confirmRidePopupPanel, setConfirmRidePopupPanel] = useState(false)

    const ridePopupPanelRef = useRef(null)
    const confirmRidePopupPanelRef = useRef(null)
    const [ride, setRide] = useState(null)
    const [deletionModalOpen, setDeletionModalOpen] = useState(false)
    const [deletionReason, setDeletionReason] = useState('')
    const [deletionPending, setDeletionPending] = useState(false)
    const [blockedReason, setBlockedReason] = useState('')

    const { socket } = useContext(SocketContext)
    const { captain } = useContext(CaptainDataContext)
    const navigate = useNavigate()

    useEffect(() => {
        setDeletionPending(Boolean(captain?.deletionRequested))
    }, [captain?.deletionRequested])

    useEffect(() => {
        const handleBlocked = ({ blockReason }) => {
            localStorage.removeItem('token')
            setBlockedReason(blockReason || 'Policy violation')
        }
        const handleDeleted = () => {
            localStorage.removeItem('token')
            navigate('/captain-login', { replace: true })
        }
        socket.on('captain-blocked', handleBlocked)
        socket.on('account-deleted', handleDeleted)
        return () => {
            socket.off('captain-blocked', handleBlocked)
            socket.off('account-deleted', handleDeleted)
        }
    }, [navigate, socket])

    useEffect(() => {
        if (!captain?._id) return undefined;

        socket.emit('join', {
            userId: captain._id,
            userType: 'captain'
        })
        const updateLocation = () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(position => {

                    socket.emit('update-location-captain', {
                        userId: captain._id,
                        location: {
                            ltd: position.coords.latitude,
                            lng: position.coords.longitude
                        }
                    })
                })
            }
        }

        const locationInterval = setInterval(updateLocation, 10000)
        updateLocation()

        const handleNewRide = (data) => {
            setRide(data)
            setRidePopupPanel(true)
        }
        socket.on('new-ride', handleNewRide)

        return () => {
            clearInterval(locationInterval)
            socket.off('new-ride', handleNewRide)
        }
    }, [captain?._id, socket])

    async function confirmRide() {

        await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/confirm`, {

            rideId: ride._id,
            captainId: captain._id,


        }, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        })

        setRidePopupPanel(false)
        setConfirmRidePopupPanel(true)
    }

    const requestAccountDeletion = async () => {
        if (!deletionReason.trim()) return
        await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/request-deletion`, { reason: deletionReason.trim() }, {
            headers: { Authorization: `******'token')}` }
        })
        setDeletionPending(true)
        setDeletionModalOpen(false)
        setDeletionReason('')
    }


    useGSAP(function () {
        if (ridePopupPanel) {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ridePopupPanel])

    useGSAP(function () {
        if (confirmRidePopupPanel) {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [confirmRidePopupPanel])

    if (blockedReason) {
        return <div className='h-screen bg-red-950 text-white flex items-center justify-center p-8 text-center'><div><i className='ri-lock-2-line text-6xl text-red-300'></i><h1 className='text-3xl font-bold mt-5'>Captain account blocked</h1><p className='mt-3 text-red-100'>{blockedReason}</p><button onClick={() => navigate('/captain-login')} className='mt-8 bg-white text-red-950 rounded-lg px-5 py-3 font-semibold'>Return to login</button></div></div>
    }

    return (
        <div className='h-screen'>
            <div className='fixed p-6 top-0 flex items-center justify-between w-screen'>
                <h3 className='text-xl font-black tracking-wider bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg shadow-md'>MyRide</h3>
                <div className='flex gap-2 items-center'>
                    {deletionPending && <span className='bg-orange-100 text-orange-800 px-2 py-2 rounded-lg text-[10px] font-semibold'>Deletion Request Pending</span>}
                    <button onClick={() => setDeletionModalOpen(true)} className='h-10 px-3 bg-white rounded-lg text-xs font-semibold'>Account</button>
                    <Link to='/captain-home' className='h-10 w-10 bg-white flex items-center justify-center rounded-full'><i className='text-lg font-medium ri-logout-box-r-line'></i></Link>
                </div>
            </div>
            <div className='h-3/5'>
                <img className='h-full w-full object-cover' src="https://miro.medium.com/v2/resize:fit:1400/0*gwMx05pqII5hbfmX.gif" alt="" />

            </div>
            <div className='h-2/5 p-6'>
                <CaptainDetails />
            </div>
            <div ref={ridePopupPanelRef} className='fixed w-full z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
                <RidePopUp
                    ride={ride}
                    setRidePopupPanel={setRidePopupPanel}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel}
                    confirmRide={confirmRide}
                />
            </div>
            <div ref={confirmRidePopupPanelRef} className='fixed w-full h-screen z-10 bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
                <ConfirmRidePopUp
                    ride={ride}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel} setRidePopupPanel={setRidePopupPanel} />
            </div>
            {deletionModalOpen && <div className='fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5'><div className='bg-white rounded-2xl p-6 w-full max-w-md'><h2 className='text-xl font-bold'>Request Account Removal</h2><textarea value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} className='w-full border rounded-lg p-3 mt-4' rows='4' placeholder='Reason for removal' /><div className='flex gap-3 mt-4'><button onClick={() => setDeletionModalOpen(false)} className='flex-1 border rounded-lg py-2'>Cancel</button><button onClick={requestAccountDeletion} disabled={!deletionReason.trim() || deletionPending} className='flex-1 bg-red-600 text-white rounded-lg py-2 disabled:opacity-50'>Submit</button></div></div></div>}
        </div>
    )
}

export default CaptainHome