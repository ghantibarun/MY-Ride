import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { SocketContext } from '../context/SocketContext'

const tabs = [
  { key: 'kyc', label: 'Captain KYC' },
  { key: 'sos', label: 'Live SOS' },
  { key: 'overview', label: 'City Overview' }
]

const AdminDashboard = () => {
  const { socket } = useContext(SocketContext)
  const token = localStorage.getItem('adminToken')
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token])
  const [activeTab, setActiveTab] = useState('kyc')
  const [kycFilter, setKycFilter] = useState('pending')
  const [captains, setCaptains] = useState([])
  const [alerts, setAlerts] = useState([])
  const [stats, setStats] = useState(null)
  const [message, setMessage] = useState('')

  const loadCaptains = useCallback(async () => {
    const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/admin/captains`, {
      params: { kycStatus: kycFilter },
      headers
    })
    setCaptains(response.data)
  }, [headers, kycFilter])

  const loadDashboard = useCallback(async () => {
    const [statsResponse, sosResponse] = await Promise.all([
      axios.get(`${import.meta.env.VITE_BASE_URL}/admin/stats`, { headers }),
      axios.get(`${import.meta.env.VITE_BASE_URL}/admin/sos`, { headers })
    ])
    setStats(statsResponse.data)
    setAlerts(sosResponse.data)
  }, [headers])

  useEffect(() => {
    loadDashboard().catch(() => setMessage('Unable to load operations metrics.'))
  }, [loadDashboard])

  useEffect(() => {
    loadCaptains().catch(() => setMessage('Unable to load captain queue.'))
  }, [loadCaptains])

  useEffect(() => {
    const joinAdminRoom = () => socket.emit('join-admin', { token })
    const receiveAlert = (alert) => {
      setAlerts((current) => [alert, ...current.filter((item) => String(item.sosId) !== String(alert.sosId))])
      setActiveTab('sos')
      setMessage('New SOS alert received.')
      try {
        const audioContext = new window.AudioContext()
        const oscillator = audioContext.createOscillator()
        oscillator.connect(audioContext.destination)
        oscillator.frequency.value = 880
        oscillator.start()
        oscillator.stop(audioContext.currentTime + 0.25)
      } catch {
        // Browsers may block audio until the operator interacts with the page.
      }
    }
    socket.on('connect', joinAdminRoom)
    socket.on('admin-sos-alert', receiveAlert)
    if (socket.connected) joinAdminRoom()
    return () => {
      socket.off('connect', joinAdminRoom)
      socket.off('admin-sos-alert', receiveAlert)
    }
  }, [socket, token])

  const updateKyc = async (captainId, kycStatus) => {
    try {
      await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/captains/${captainId}/kyc`, { kycStatus }, { headers })
      setCaptains((current) => current.filter((captain) => String(captain._id) !== String(captainId)))
      await loadDashboard()
      setMessage(`Captain ${kycStatus}.`)
    } catch {
      setMessage('Unable to update KYC status.')
    }
  }

  const resolveAlert = async (alertId) => {
    try {
      await axios.patch(`${import.meta.env.VITE_BASE_URL}/admin/sos/${alertId}/resolve`, {}, { headers })
      setAlerts((current) => current.map((alert) => String(alert._id || alert.sosId) === String(alertId) ? { ...alert, status: 'resolved' } : alert))
    } catch {
      setMessage('Unable to resolve SOS alert.')
    }
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    window.location.href = '/admin/login'
  }

  return (
    <main className='min-h-screen bg-slate-100 text-slate-900'>
      <header className='bg-slate-950 text-white px-6 py-5 flex flex-wrap gap-4 items-center justify-between'>
        <div>
          <p className='text-indigo-300 text-xs uppercase tracking-widest font-semibold'>MY Ride</p>
          <h1 className='text-2xl font-bold'>City Operations</h1>
        </div>
        <button onClick={logout} className='text-sm border border-slate-600 rounded-lg px-4 py-2 hover:bg-slate-800'>Sign out</button>
      </header>
      <div className='max-w-7xl mx-auto p-4 md:p-8'>
        {message && <div className='mb-5 rounded-lg bg-indigo-50 text-indigo-800 px-4 py-3 text-sm'>{message}</div>}
        <nav className='flex gap-2 overflow-x-auto mb-6'>
          {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${activeTab === tab.key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>{tab.label}</button>)}
        </nav>

        {activeTab === 'kyc' && (
          <section>
            <div className='flex flex-wrap items-center justify-between gap-3 mb-5'>
              <div><h2 className='text-2xl font-bold'>Captain KYC Queue</h2><p className='text-slate-500'>Review documents before activating ride requests.</p></div>
              <select value={kycFilter} onChange={(event) => setKycFilter(event.target.value)} className='border rounded-lg px-3 py-2 bg-white'>
                <option value='pending'>Pending</option><option value='verified'>Verified</option><option value='rejected'>Rejected</option>
              </select>
            </div>
            <div className='grid gap-4'>
              {captains.length === 0 && <div className='bg-white rounded-xl p-8 text-center text-slate-500'>No captains in this queue.</div>}
              {captains.map((captain) => (
                <article key={captain._id} className='bg-white rounded-xl p-5 shadow-sm'>
                  <div className='flex flex-wrap justify-between gap-4'>
                    <div><h3 className='text-lg font-bold'>{captain.fullname?.firstname} {captain.fullname?.lastname}</h3><p className='text-sm text-slate-500'>{captain.email} · {captain.phone || 'No phone'}</p></div>
                    <p className='font-semibold text-emerald-600'>Wallet ₹{Number(captain.walletBalance || 0).toFixed(2)}</p>
                  </div>
                  <div className='grid md:grid-cols-2 gap-3 mt-4 text-sm'>
                    <p><strong>Vehicle:</strong> {captain.vehicle?.color} {captain.vehicle?.vehicleType} · {captain.vehicle?.plate}</p>
                    <p><strong>License:</strong> {captain.drivingLicense || 'Not provided'}</p>
                    <p><strong>RC:</strong> {captain.rcNumber || 'Not provided'}</p>
                    <p><strong>Insurance:</strong> {captain.insuranceNumber || 'Not provided'}</p>
                  </div>
                  {kycFilter === 'pending' && <div className='flex gap-3 mt-5'><button onClick={() => updateKyc(captain._id, 'verified')} className='bg-emerald-600 text-white rounded-lg px-4 py-2 font-semibold'>Approve</button><button onClick={() => updateKyc(captain._id, 'rejected')} className='bg-red-600 text-white rounded-lg px-4 py-2 font-semibold'>Reject</button></div>}
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'sos' && (
          <section>
            <h2 className='text-2xl font-bold mb-1'>Live SOS Monitor</h2><p className='text-slate-500 mb-5'>Emergency alerts appear here in real time.</p>
            <div className='grid gap-4'>
              {alerts.length === 0 && <div className='bg-white rounded-xl p-8 text-center text-slate-500'>No SOS alerts recorded.</div>}
              {alerts.map((alert) => {
                const location = alert.location || {}
                const ride = alert.ride || {}
                const user = alert.user || ride.user || {}
                const captain = alert.captain || ride.captain || {}
                const alertId = alert._id || alert.sosId
                return <article key={String(alertId)} className={`bg-white rounded-xl p-5 border-l-4 ${alert.status === 'resolved' ? 'border-slate-300' : 'border-red-600 animate-pulse'}`}>
                  <div className='flex flex-wrap justify-between gap-3'><h3 className='font-bold text-red-700'>{alert.status === 'resolved' ? 'Resolved SOS' : 'ACTIVE SOS'} · Ride {String(alert.rideId || ride._id).slice(-8)}</h3><span className='text-sm text-slate-500'>{new Date(alert.triggeredAt || Date.now()).toLocaleString()}</span></div>
                  <p className='mt-3 text-sm'>User: <strong>{user.name || user.fullname?.firstname || 'Unknown'}</strong> {user.phone || ''} · Captain: <strong>{captain.name || captain.fullname?.firstname || 'Unknown'}</strong> {captain.phone || ''}</p>
                  <p className='text-sm mt-2'>GPS: {location.ltd}, {location.lng}</p>
                  <div className='flex flex-wrap gap-3 mt-4'><a target='_blank' rel='noreferrer' href={`https://www.google.com/maps?q=${location.ltd},${location.lng}`} className='text-indigo-600 font-semibold'>Open in Google Maps</a>{alert.status !== 'resolved' && <button onClick={() => resolveAlert(alertId)} className='bg-slate-900 text-white rounded-lg px-3 py-1.5 text-sm'>Mark Resolved</button>}</div>
                </article>
              })}
            </div>
          </section>
        )}

        {activeTab === 'overview' && (
          <section><h2 className='text-2xl font-bold mb-5'>City Overview & Ledger</h2><div className='grid sm:grid-cols-2 lg:grid-cols-5 gap-4'>{[
            ['Total Users', stats?.totalUsers || 0], ['Verified Captains', stats?.captainsByKycStatus?.verified || 0], ['Active Rides', stats?.activeRides || 0], ['Completed Rides', stats?.completedRides || 0], ['Platform Commission', `₹${Number(stats?.totalPlatformCommission || 0).toFixed(2)}`]
          ].map(([label, value]) => <div key={label} className='bg-white rounded-xl p-5 shadow-sm'><p className='text-sm text-slate-500'>{label}</p><p className='text-2xl font-bold mt-2'>{value}</p></div>)}</div></section>
        )}
      </div>
    </main>
  )
}

export default AdminDashboard
