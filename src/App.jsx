import React from 'react';
import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';

function App() {
  return (
    <div className="App min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">Simple Video Call</h1>
      </header>
      <main className="flex-grow p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<RoomPage />} />
          {/* Optional: Add a 404 Not Found route */}
          <Route path="*" element={<div className='text-center font-bold text-xl'>404 Not Found</div>} />
        </Routes>
      </main>
      <footer className="bg-gray-200 text-gray-600 p-2 text-center text-sm">
        Built with React, PeerJS, and TailwindCSS
      </footer>
    </div>
  );
}

export default App;