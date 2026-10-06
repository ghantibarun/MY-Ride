import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const submitHandler = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/admin/login`, { email, password })
      localStorage.setItem('adminToken', response.data.token)
      navigate('/admin/dashboard')
    } catch (error) {
      setMessage(error.response?.data?.message || 'Unable to sign in as admin.')
    }
  }

  return (
    <main className='min-h-screen bg-slate-950 flex items-center justify-center p-6'>
      <form onSubmit={submitHandler} className='w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl'>
        <p className='text-sm font-semibold text-indigo-600 uppercase tracking-widest'>MY Ride Operations</p>
        <h1 className='text-3xl font-bold text-slate-900 mt-2'>Admin Portal</h1>
        <p className='text-slate-500 mt-2 mb-8'>Manage KYC, safety alerts, and city performance.</p>
        <label className='block text-sm font-medium text-slate-700 mb-2' htmlFor='admin-email'>Email</label>
        <input id='admin-email' type='email' required value={email} onChange={(event) => setEmail(event.target.value)} className='w-full border rounded-lg px-4 py-3 mb-5' />
        <label className='block text-sm font-medium text-slate-700 mb-2' htmlFor='admin-password'>Password</label>
        <input id='admin-password' type='password' required value={password} onChange={(event) => setPassword(event.target.value)} className='w-full border rounded-lg px-4 py-3 mb-5' />
        {message && <p className='text-sm text-red-600 mb-4'>{message}</p>}
        <button type='submit' className='w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg py-3'>Sign in</button>
        <Link to='/captain-login' className='block text-center text-sm text-slate-500 mt-6 hover:text-indigo-600'>Back to captain login</Link>
      </form>
    </main>
  )
}

export default AdminLogin
