import React from 'react'

const VehiclePanel = (props) => {
    return (
        <div>
            <h5 className='p-1 text-center w-[93%] absolute top-0 cursor-pointer' onClick={() => {
                props.setVehiclePanel(false)
            }}>
                <i className="text-3xl text-gray-400 ri-arrow-down-wide-line"></i>
            </h5>
            <button onClick={() => props.onCancel?.()} className='text-sm text-red-600 font-semibold mb-3'>Cancel Ride</button>
            
            <h3 className='text-2xl font-semibold mb-5 text-gray-900'>Choose a Vehicle</h3>

            {/* CAR OPTION */}
            <div onClick={() => {
                props.setConfirmRidePanel(true)
                props.selectVehicle('car')
            }} className='flex border-2 border-gray-100 active:border-black mb-3 rounded-2xl w-full p-4 items-center justify-between cursor-pointer transition-all hover:bg-gray-50'>
                <div className='h-12 w-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl text-gray-900 shadow-sm'>
                    <i className="ri-car-fill"></i>
                </div>
                <div className='ml-4 w-1/2'>
                    <h4 className='font-semibold text-base text-gray-900'>MyRideGo <span className='text-xs font-normal text-gray-500 ml-1'><i className="ri-user-3-fill"></i> 4</span></h4>
                    <h5 className='font-medium text-sm text-green-600'>2 mins away</h5>
                    <p className='font-normal text-xs text-gray-500'>Affordable, compact rides</p>
                </div>
                <h2 className='text-xl font-bold text-gray-900'>₹{props.fare.car}</h2>
            </div>

            {/* MOTORCYCLE OPTION */}
            <div onClick={() => {
                props.setConfirmRidePanel(true)
                props.selectVehicle('motorcycle')
            }} className='flex border-2 border-gray-100 active:border-black mb-3 rounded-2xl w-full p-4 items-center justify-between cursor-pointer transition-all hover:bg-gray-50'>
                <div className='h-12 w-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl text-gray-900 shadow-sm'>
                    <i className="ri-motorbike-fill"></i>
                </div>
                <div className='ml-4 w-1/2'>
                    <h4 className='font-semibold text-base text-gray-900'>Moto <span className='text-xs font-normal text-gray-500 ml-1'><i className="ri-user-3-fill"></i> 1</span></h4>
                    <h5 className='font-medium text-sm text-green-600'>3 mins away</h5>
                    <p className='font-normal text-xs text-gray-500'>Affordable motorcycle rides</p>
                </div>
                <h2 className='text-xl font-bold text-gray-900'>₹{props.fare.motorcycle}</h2>
            </div>

            {/* TOTO OPTION */}
            <div onClick={() => {
                props.setConfirmRidePanel(true)
                props.selectVehicle('auto')
            }} className='flex border-2 border-gray-100 active:border-black mb-3 rounded-2xl w-full p-4 items-center justify-between cursor-pointer transition-all hover:bg-gray-50'>
                <div className='h-12 w-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center text-3xl shadow-sm relative'>
                    <i className="ri-taxi-fill"></i>
                    <i className="ri-flashlight-fill text-amber-500 absolute -top-1 -right-1 text-base"></i>
                </div>
                <div className='ml-4 w-1/2'>
                    <h4 className='font-semibold text-base text-gray-900'>MyRideToto <span className='text-xs font-normal text-gray-500 ml-1'><i className="ri-user-3-fill"></i> 4</span></h4>
                    <h5 className='font-medium text-sm text-green-600'>3 mins away</h5>
                    <p className='font-normal text-xs text-gray-500'>Affordable Toto rides</p>
                </div>
                <h2 className='text-xl font-bold text-gray-900'>₹{props.fare.auto}</h2>
            </div>
        </div>
    )
}

export default VehiclePanel