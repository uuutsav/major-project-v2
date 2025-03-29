import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidV4 } from 'uuid';

const HomePage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Generate a unique room ID
    const roomId = uuidV4();
    // Redirect the user to the room
    navigate(`/room/${roomId}`);
  }, [navigate]); // Dependency array ensures this runs only once on mount

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-xl text-gray-600">Creating a room for you...</p>
      {/* You could add a loading spinner here */}
    </div>
  );
};

export default HomePage;