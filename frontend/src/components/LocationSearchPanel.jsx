import React from 'react'

const LocationSearchPanel = ({ 
    suggestions, 
    activeField, 
    onSuggestionSelect, 
    onUseCurrentLocation, 
    isGettingCurrentLocation, 
    onSelectMap 
}) => {

    return (
        <div className='flex-1 overflow-y-auto w-full'>
            {/* 1. Current Location Button (ONLY visible for Pickup) */}
            {activeField === 'pickup' && (
                <button 
                    onClick={onUseCurrentLocation} 
                    className='w-full flex gap-4 border-b border-gray-100 pb-4 items-center mb-4 justify-start hover:bg-gray-50 rounded-lg p-2 transition-colors'
                >
                    <div className='bg-blue-100 min-w-[2.5rem] h-10 flex items-center justify-center rounded-full'>
                        <i className="ri-map-pin-user-fill text-blue-600 text-lg"></i>
                    </div>
                    <h4 className='font-medium text-left text-gray-800'>
                        {isGettingCurrentLocation ? 'Fetching location...' : 'Use my current location'}
                    </h4>
                </button>
            )}

            {/* 2. Select on Map Button (Always visible) */}
            <button 
                onClick={onSelectMap} 
                className='w-full flex gap-4 border-b border-gray-100 pb-4 items-center mb-4 justify-start hover:bg-gray-50 rounded-lg p-2 transition-colors'
            >
                <div className='bg-gray-200 min-w-[2.5rem] h-10 flex items-center justify-center rounded-full'>
                    <i className="ri-map-2-line text-gray-700 text-lg"></i>
                </div>
                <h4 className='font-medium text-left text-gray-800'>Select on map</h4>
            </button>

            {/* 3. Dynamic List of API Search Results */}
            {suggestions.map((elem, idx) => (
                <button 
                    key={idx} 
                    onClick={() => onSuggestionSelect(elem, activeField)} 
                    className='w-full flex gap-4 items-center mb-4 justify-start hover:bg-gray-50 p-2 rounded-lg transition-colors'
                >
                    <div className='bg-gray-200 min-w-[2.5rem] h-10 flex items-center justify-center rounded-full'>
                        <i className="ri-map-pin-fill text-gray-600"></i>
                    </div>
                    <h4 className='font-medium text-left text-gray-800 text-sm truncate'>{elem}</h4>
                </button>
            ))}

            {/* 4. Empty State Message */}
            {suggestions.length === 0 && (
                <p className='text-sm text-gray-500 text-center mt-5'>Type to search for places...</p>
            )}
        </div>
    )
}

export default LocationSearchPanel;