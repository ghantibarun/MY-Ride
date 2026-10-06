import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const AdminProtectWrapper = ({ children }) => {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (!token) {
      navigate('/admin/login', { replace: true })
      return
    }

    axios.get(`${import.meta.env.VITE_BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(() => {
      setChecking(false)
    }).catch(() => {
      localStorage.removeItem('adminToken')
      navigate('/admin/login', { replace: true })
    })
  }, [navigate])

  if (checking) return <div className='min-h-screen bg-slate-950 text-white flex items-center justify-center'>Checking admin access...</div>
  return children
}

export default AdminProtectWrapper
