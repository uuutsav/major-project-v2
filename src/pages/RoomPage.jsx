import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Peer } from 'peerjs'; // Import Peer correctly

const RoomPage = () => {
  const { roomId } = useParams();
  const [peerId, setPeerId] = useState('');
  const [remotePeerIdValue, setRemotePeerIdValue] = useState(''); // To store the ID of the connected peer
  const remoteVideoRef = useRef(null);
  const currentUserVideoRef = useRef(null);
  const peerInstance = useRef(null); // Ref to store the Peer instance

  useEffect(() => {
    // Initialize PeerJS
    // Passing undefined as the first argument gets an ID from the PeerJS server
    // Pass the host and port for a self-hosted PeerServer
    const peer = new Peer(undefined, {
      host: 'localhost', // Default PeerJS cloud server
      port: 9000,       // Default PeerJS cloud server port
      path: '/myapp',        // Default PeerJS cloud server path
      // For the public server (if you don't run your own):
      // host: '0.peerjs.com',
      // port: 443,
      // path: '/',
      // secure: true, // Use secure connection for the public server
    });

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setPeerId(id); // Set our own peer ID

      // Get user media (video and audio)
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          // Display our own video
          if (currentUserVideoRef.current) {
            currentUserVideoRef.current.srcObject = stream;
            currentUserVideoRef.current.play().catch(e => console.error("Local play failed", e));
          }

          // ---- Handling Incoming Calls ----
          peer.on('call', (call) => {
             console.log(`Incoming call from ${call.peer}`);
             setRemotePeerIdValue(call.peer); // Store the remote peer's ID

             // Answer the call, sending our stream
             call.answer(stream);

             // When we receive the remote stream
             call.on('stream', (remoteStream) => {
               console.log("Received remote stream");
               if (remoteVideoRef.current) {
                 remoteVideoRef.current.srcObject = remoteStream;
                 remoteVideoRef.current.play().catch(e => console.error("Remote play failed", e));
               }
             });

             call.on('close', () => {
                console.log("Call closed");
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null; // Clear video on close
                }
                setRemotePeerIdValue(''); // Clear remote peer ID
             });

             call.on('error', (err) => {
                console.error("Call error:", err);
             });
          });

          // ---- Initiating Call To Others In The Room ----
          // This simple example assumes only two participants.
          // We need a way to know the *other* person's ID.
          // A simple strategy: If our ID is "smaller" lexicographically,
          // we wait for a call. If "larger", we initiate the call.
          // This isn't robust, a signalling server is better for >2 users or reliability.

          // For now, let's just try connecting to the `roomId` IF it's different from our generated ID.
          // This relies on the *first* person somehow registering with the `roomId`.
          // A better simple approach: We need *some* way for peers in the same room to find each other's *actual* PeerJS IDs.

          // *** Let's modify: We'll need a way to *explicitly* call someone. ***
          // *** For this simple version, let's just log the peer ID and manually call. ***
          // *** OR: A slightly better simple approach: join the room, then call the known `roomId` *after* a small delay? ***

          // --- Revised Strategy: Simple 1-to-1 Call ---
          // Instead of complex discovery, let's assume the first person somehow "claims" the roomId.
          // The second person calls the roomId. This isn't perfect but fits the simple requirement.
          // Let's try this: The peer object itself *can* be created with a specific ID.

          // ** Let's revert to the previous simpler PeerJS init where ID is generated **
          // ** The connection logic needs refinement **

          // --- Let's try PeerJS Server discovery ---
          // We join the room ID. The peer server can help list peers in a "room" (though PeerJS lib doesn't directly expose this).
          // Simplest reliable for 1-1: Use the `roomId` for signalling connection *intent*.

          // When *we* join, we try to call anyone else *already* associated with this roomId.
          // This still needs more robust signalling.

          // --- Final Simple Strategy (Compromise) ---
          // 1. Everyone gets a unique PeerJS ID on connection.
          // 2. When our stream is ready, try to call the `roomId`.
          // 3. If the call fails (no one is listening on `roomId`), maybe we *become* the listener on `roomId`? No, PeerJS IDs must be unique.

          // --- Let's stick to the "answer incoming calls" logic for now ---
          // --- And add a basic way to *manually* initiate a call for testing ---
          // --- A better approach would use websockets (e.g., Socket.IO) for signaling ---

        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
          alert('Failed to access camera/microphone. Please allow access and refresh.');
        });

    });

    peer.on('error', (error) => {
      console.error('PeerJS error:', error);
      // Handle specific errors (e.g., 'disconnected', 'network')
      alert(`PeerJS Error: ${error.type}. You might need to refresh or check the PeerJS server connection.`);
    });

    // Store peer instance
    peerInstance.current = peer;

    // Cleanup on component unmount
    return () => {
      console.log("Cleaning up RoomPage");
      // Stop media tracks
      if (currentUserVideoRef.current && currentUserVideoRef.current.srcObject) {
        currentUserVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      // Destroy peer connection
      peerInstance.current?.destroy();
      console.log("Peer destroyed");
    };

  }, [roomId]); // Re-run effect if roomId changes

  // Function to initiate call (Manual for this simple version)
  const callPeer = (remoteId) => {
      if (!peerInstance.current || !currentUserVideoRef.current?.srcObject || !remoteId) {
          alert("Cannot call. Ensure you have a stream and PeerJS is connected, and provide a remote ID.");
          return;
      }
      console.log(`Attempting to call ${remoteId}`);

      const call = peerInstance.current.call(remoteId, currentUserVideoRef.current.srcObject);

      if (!call) {
          console.error("Call initiation failed immediately.");
          alert("Failed to initiate call. The remote peer ID might be invalid or unreachable.");
          return;
      }

      setRemotePeerIdValue(remoteId); // Assume connection will succeed for now

      call.on('stream', (remoteStream) => {
          console.log("Received stream from manual call");
          if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(e => console.error("Remote play failed", e));
          }
      });

      call.on('close', () => {
          console.log("Manual call closed");
           if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null; // Clear video on close
           }
          setRemotePeerIdValue('');
      });

      call.on('error', (err) => {
          console.error("Manual call error:", err);
          alert(`Call failed: ${err.message || err}`);
          setRemotePeerIdValue(''); // Clear remote peer ID on error
           if (remoteVideoRef.current) {
               remoteVideoRef.current.srcObject = null;
           }
      });
  };


  // --- Temporary Manual Call UI ---
  const [manualPeerId, setManualPeerId] = useState('');
  const handleManualCall = (e) => {
      e.preventDefault();
      if(manualPeerId.trim()) {
          callPeer(manualPeerId.trim());
      } else {
          alert("Please enter the Peer ID of the user you want to call.");
      }
  }
  // --- End Temporary UI ---

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Room: {roomId}</h2>
      <p className="mb-2 text-sm text-gray-600">Your Peer ID: <span className="font-mono bg-gray-200 px-1 rounded">{peerId || 'Connecting...'}</span></p>
      {remotePeerIdValue && <p className="mb-4 text-sm text-green-600">Connected to: <span className="font-mono bg-gray-200 px-1 rounded">{remotePeerIdValue}</span></p>}

      {/* --- Temporary Manual Call Form --- */}
      {!remotePeerIdValue && peerId && (
          <form onSubmit={handleManualCall} className="my-4 p-4 border rounded bg-gray-50">
              <label htmlFor="peerIdInput" className="block text-sm font-medium text-gray-700 mb-1">Enter Peer ID to Call:</label>
              <div className="flex gap-2">
                  <input
                      id="peerIdInput"
                      type="text"
                      value={manualPeerId}
                      onChange={(e) => setManualPeerId(e.target.value)}
                      placeholder="Other user's Peer ID"
                      className="flex-grow p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                  />
                  <button
                      type="submit"
                      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-300"
                  >
                      Call
                  </button>
              </div>
          </form>
      )}
      {/* --- End Temporary Form --- */}


      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current User Video */}
        <div className="border rounded shadow-lg overflow-hidden bg-black">
          <h3 className="text-center font-medium p-2 bg-gray-200 text-gray-700">You ({peerId.substring(0,6)}...)</h3>
          <video
            ref={currentUserVideoRef}
            muted // Mute self video to prevent echo
            autoPlay
            playsInline // Important for mobile browsers
            className="w-full h-auto aspect-video" // aspect-video for 16:9
          />
        </div>

        {/* Remote User Video */}
        <div className="border rounded shadow-lg overflow-hidden bg-black">
          <h3 className="text-center font-medium p-2 bg-gray-200 text-gray-700">Remote User ({remotePeerIdValue ? remotePeerIdValue.substring(0, 6) + '...' : 'Not Connected'})</h3>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline // Important for mobile browsers
            className="w-full h-auto aspect-video"
          />
        </div>
      </div>
    </div>
  );
};

export default RoomPage;