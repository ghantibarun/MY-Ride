# 🚗 Full Stack MyRide Clone 🚖

## 💡 Description

This **MyRide** is a fully functional web application built using the **MERN stack** (MongoDB, Express.js, React, and Node.js). The application emulates the core features of the popular ride-hailing service MyRide, providing an intuitive user experience for both **users** (passengers) and **captains** (drivers). It allows users to register, authenticate, book rides, track real-time locations, and manage profiles, while captains can receive ride requests and manage their rides.

With features like real-time location tracking, Google Maps integration, and a seamless booking system, this MyRide clone delivers a high-quality ride-sharing service with all the essentials.

## 🚀 Main Features

### **User Features:**
- **🔐 User Registration & Login:** Secure authentication system allowing users to register, log in, and manage their personal profiles.
- **📍 Real-Time Location Tracking:** Integrated with **Google Maps API** to track user and captain locations in real time, display route suggestions, and calculate ride distances/times.
- **🚗 Ride Booking System:** Users can book rides by selecting pick-up and drop-off locations, view nearby captains, and track ride progress in real-time.
- **📊 User Dashboard:** Users have a home screen where they can manage their ride history, view ongoing rides, and update their profile.
- **🔔 Real-Time Notifications:** Users receive updates on ride status, including when a captain is on the way, the ride is complete, and other essential notifications.

### **Captain (Driver) Features:**
- **🔐 Captain Authentication:** Separate login for captains to access the driver dashboard and manage ride requests.
- **🗺️ Ride Management:** Captains can view and accept ride requests, track rides, and manage ride details, including start and end locations.
- **📍 Location Tracking:** Captains' location is tracked in real-time, allowing users to see their availability for ride bookings.
- **📝 Profile Management:** Captains can update their profiles, manage their ride history, and view past earnings.

### **Core System Features:**
- **🌍 Google Maps Location Search:** A location search feature powered by **Google Maps**, allowing both users and captains to search for destinations, view route suggestions, and determine estimated travel time.
- **⚙️ Ride Management Backend:** A comprehensive backend system that handles ride creation, management, and status updates for both users and captains.
- **📱 Responsive UI:** The application is designed with **modern, responsive UI** to ensure a smooth and intuitive user experience across all devices.

## ⚙️ Technologies Used

- **Frontend:**
  - **React.js** (Dynamic, fast, and interactive user interface)
  - **Google Maps API** (For location tracking and mapping features)

- **Backend:**
  - **Node.js** (Server-side JavaScript runtime environment)
  - **Express.js** (For API routing and middleware)
  - **MongoDB** (NoSQL database for storing ride data, user information, and ride status)

- **Authentication:**
  - **JWT (JSON Web Tokens)** (For secure user and captain authentication)

- **Real-Time Features:**
  - **Socket.io** (For real-time updates and notifications between users and captains)

## 🏁 How to Run

1. **Clone the Repository:**
   ```bash
   git clone <repository_url>

2. Install Dependencies:

- Backend: Navigate to the backend directory and install the required dependencies:

```
cd backend
npm install
```

- Frontend: Navigate to the frontend directory and install the required dependencies:
```
cd frontend
npm install
```

3. Set Up Environment Variables: Create an .env file in the root of the backend directory and add the necessary variables:

```
JWT_SECRET=<your_jwt_secret>
MONGO_URI=<your_mongodb_connection_string>
GOOGLE_MAPS_API_KEY=<your_google_maps_api_key>
```

4. Run the Backend:

```
cd backend
npm run dev
```

5. Run the Frontend:

```
cd frontend
npm run dev
```

- Access the Application: Open your browser and go to http://localhost:3000 to start using the MyRide Clone platform.

## 🎯 Ideal For

- 🚖 Ride-Hailing Services: Easily set up your own ride-hailing platform with this clone, using core features similar to MyRide.
- 🧑‍💻 Developers: A great project for developers looking to build a full-stack ride-booking platform with real-time tracking.
- 🌍 Entrepreneurs & Startups: Quickly deploy a fully functional MyRide-like platform for your own local ride-sharing service.
