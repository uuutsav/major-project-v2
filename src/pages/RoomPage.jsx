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
    console.log("RoomPage useEffect running. Attempting PeerJS connection...");

    // Initialize PeerJS - Using the Public Server
    // Passing undefined as the first argument gets an ID from the PeerJS server.
    const peer = new Peer(undefined, {
      // Using default public server which is secure (wss)
      // host: '0.peerjs.com', // Optional: Explicitly define public server
      // port: 443,          // Optional: Standard HTTPS port
      // path: '/',           // Optional: Default path
      // secure: true,       // Optional: Default is true if port is 443
      // debug: 2 // Optional: Set log level (0=silent, 1=error, 2=warn, 3=info)
    });

    peer.on('open', (id) => {
      console.log('Connected to PeerJS server. My peer ID is: ' + id);
      setPeerId(id); // Set our own peer ID

      // Get user media (video and audio) only *after* peer is open
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          console.log("Successfully got user media stream.");
          // Display our own video
          if (currentUserVideoRef.current) {
            currentUserVideoRef.current.srcObject = stream;
            currentUserVideoRef.current.play().catch(e => console.error("Local play failed", e));
          } else {
            console.warn("currentUserVideoRef is not assigned yet.");
          }

          // ---- Handling Incoming Calls ----
          peer.on('call', (call) => {
             console.log(`Incoming call from ${call.peer}`);
             if (remotePeerIdValue && remotePeerIdValue !== call.peer) {
                 console.warn(`Receiving call from ${call.peer}, but already in a call with ${remotePeerIdValue}. Rejecting new call.`);
                 // Optionally notify the caller they were rejected because the user is busy
                 // call.close(); // Might need a mechanism to inform the caller
                 return;
             }
             setRemotePeerIdValue(call.peer); // Store the remote peer's ID

             // Answer the call, sending our stream
             console.log("Answering incoming call...");
             call.answer(stream);

             // When we receive the remote stream
             call.on('stream', (remoteStream) => {
               console.log("Received remote stream from incoming call.");
               if (remoteVideoRef.current) {
                 remoteVideoRef.current.srcObject = remoteStream;
                 remoteVideoRef.current.play().catch(e => console.error("Remote play failed", e));
               } else {
                 console.warn("remoteVideoRef is not assigned yet.");
               }
             });

             call.on('close', () => {
                console.log(`Call from ${call.peer} closed`);
                // Only clear if this was the active call
                if (remotePeerIdValue === call.peer) {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null; // Clear video on close
                    }
                    setRemotePeerIdValue(''); // Clear remote peer ID
                }
             });

             call.on('error', (err) => {
                console.error(`Call from ${call.peer} error:`, err);
                // Optionally clear state if call fails critically
                 if (remotePeerIdValue === call.peer) {
                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = null;
                    }
                    setRemotePeerIdValue('');
                }
             });
          });

        })
        .catch((err) => {
          console.error('Failed to get local stream', err);
          alert('Failed to access camera/microphone. Please allow access and refresh.');
        });

    });

    peer.on('error', (error) => {
      console.error('PeerJS error:', error);
      // Display a more specific error if possible
      let alertMessage = `PeerJS Error: ${error.type}. `;
      if (error.type === 'disconnected') {
        alertMessage += 'Disconnected from the PeerJS server. Try refreshing.';
      } else if (error.type === 'network') {
        alertMessage += 'Network error communicating with PeerJS server. Check connection.';
      } else if (error.type === 'server-error') {
        alertMessage += 'Unable to reach PeerJS server. Try refreshing later.';
      } else if (error.type === 'peer-unavailable') {
        // This usually happens during call initiation, handled in callPeer
        alertMessage += `Could not connect to peer. They might be offline or ID is wrong.`;
      } else {
         alertMessage += 'Check console for details and check PeerJS server status.';
      }
      alert(alertMessage);
    });

    peer.on('disconnected', () => {
        console.warn('PeerJS disconnected. Attempting to reconnect is possible but often requires manual refresh for robustness.');
        setPeerId(''); // Indicate disconnection
        alert('Disconnected from PeerJS server. Please refresh the page.');
        // peer.reconnect(); // Be cautious with automatic reconnects, can lead to complex state
    });

    peer.on('close', () => {
        // This means the Peer object is completely destroyed
        console.warn('PeerJS connection permanently closed.');
        setPeerId('');
    });


    // Store peer instance
    peerInstance.current = peer;

    // Cleanup on component unmount
    return () => {
      console.log("Cleaning up RoomPage: Stopping streams and destroying PeerJS connection.");
      // Ensure streams are stopped first
      if (currentUserVideoRef.current && currentUserVideoRef.current.srcObject) {
        currentUserVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
        console.log("Local media stream stopped.");
      } else {
        console.log("No local media stream to stop.");
      }
      if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        remoteVideoRef.current.srcObject.getTracks().forEach(track => track.stop());
         console.log("Remote media stream stopped.");
      } else {
        console.log("No remote media stream to stop.");
      }

      // Properly destroy the peer connection
      if (peerInstance.current) {
         peerInstance.current.destroy();
         console.log("Peer destroyed");
      } else {
         console.log("No peer instance to destroy.");
      }
      peerInstance.current = null; // Clear the ref
    };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]); // Only re-run if the room ID changes (e.g. navigating between rooms)


  // Function to initiate call (Manual for this simple version)
  const callPeer = (remoteIdToCall) => {
      const localStream = currentUserVideoRef.current?.srcObject;

      if (!peerInstance.current || !peerId) {
          alert("PeerJS connection not established yet. Please wait.");
          return;
      }
      if (!localStream) {
          alert("Local video stream not available. Please grant camera/mic permissions.");
          return;
      }
      if (!remoteIdToCall) {
          alert("Please provide the Peer ID of the user you want to call.");
          return;
      }
      if (remoteIdToCall === peerId) {
          alert("You cannot call yourself!");
          return;
      }
       if (remotePeerIdValue) {
          alert(`Already in a call with ${remotePeerIdValue}. Please hang up first.`);
          return;
      }


      console.log(`Attempting to call ${remoteIdToCall}...`);

      const call = peerInstance.current.call(remoteIdToCall, localStream);

      if (!call) {
          console.error("Call initiation failed immediately (maybe invalid Peer ID format?).");
          alert("Failed to initiate call. The remote peer ID might be invalid or unreachable.");
          return;
      }

      setRemotePeerIdValue(remoteIdToCall); // Optimistically set remote peer ID

      call.on('stream', (remoteStream) => {
          console.log(`Received stream from manually initiated call to ${remoteIdToCall}.`);
          if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remoteStream;
              remoteVideoRef.current.play().catch(e => console.error("Remote play failed", e));
          } else {
             console.warn("remoteVideoRef not available when receiving stream from manual call.");
          }
      });

      call.on('close', () => {
          console.log(`Manual call to ${remoteIdToCall} closed.`);
          // Clear video and state only if this was the active call that closed
          if (remotePeerIdValue === remoteIdToCall) {
              if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = null; // Clear video on close
              }
              setRemotePeerIdValue('');
          }
      });

      call.on('error', (err) => {
          console.error(`Manual call to ${remoteIdToCall} error:`, err);
          alert(`Call failed: ${err.message || err}. Peer might be unavailable.`);
           // Clear video and state only if this was the active call that failed
           if (remotePeerIdValue === remoteIdToCall) {
              if (remoteVideoRef.current) {
                  remoteVideoRef.current.srcObject = null;
              }
              setRemotePeerIdValue('');
          }
      });
  };


  // --- Temporary Manual Call UI ---
  const [manualPeerId, setManualPeerId] = useState('');
  const handleManualCall = (e) => {
      e.preventDefault();
      const trimmedId = manualPeerId.trim();
      if(trimmedId) {
          callPeer(trimmedId);
          // Optionally clear the input after calling:
          // setManualPeerId('');
      } else {
          alert("Please enter the Peer ID of the user you want to call.");
      }
  }
  // --- End Temporary UI ---

  return (
    <div className="p-4 flex flex-col flex-grow">
      <div className="mb-4">
          <h2 className="text-xl font-semibold mb-1">Room: <span className="font-mono text-sm bg-gray-200 px-1 rounded">{roomId}</span></h2>
          <p className="mb-2 text-sm text-gray-600">
              Your Peer Status: {peerId
                ? <span className="font-mono bg-green-200 text-green-800 px-1 rounded">{peerId}</span>
                : <span className="text-red-600">Connecting...</span>
              }
          </p>
          {remotePeerIdValue &&
            <p className="mb-4 text-sm text-blue-600">
                Connected to: <span className="font-mono bg-blue-200 px-1 rounded">{remotePeerIdValue}</span>
            </p>
          }
      </div>


      {/* --- Manual Call Form --- */}
      {peerId && !remotePeerIdValue && ( // Show call form only if connected to PeerJS and not already in a call
          <form onSubmit={handleManualCall} className="mb-6 p-4 border rounded bg-gray-50 shadow-sm">
              <label htmlFor="peerIdInput" className="block text-sm font-medium text-gray-700 mb-1">Enter Peer ID to Call:</label>
              <div className="flex flex-col sm:flex-row gap-2">
                  <input
                      id="peerIdInput"
                      type="text"
                      value={manualPeerId}
                      onChange={(e) => setManualPeerId(e.target.value)}
                      placeholder="Other user's Peer ID"
                      className="flex-grow p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      disabled={!!remotePeerIdValue} // Disable if already connected
                  />
                  <button
                      type="submit"
                      className={`bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-300 ${remotePeerIdValue ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!!remotePeerIdValue} // Disable if already connected
                  >
                      Call
                  </button>
              </div>
          </form>
      )}
      {/* --- End Manual Form --- */}


      {/* --- Video Grid --- */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current User Video */}
        <div className="border rounded shadow-lg overflow-hidden bg-black flex flex-col">
          <h3 className="text-center font-medium p-2 bg-gray-200 text-gray-700 truncate">
            You ({peerId ? peerId.substring(0,6) + '...' : 'Connecting'})
          </h3>
          <div className="relative w-full aspect-video bg-gray-800 flex items-center justify-center"> {/* Aspect ratio container */}
             <video
                ref={currentUserVideoRef}
                muted // Mute self video to prevent echo
                autoPlay
                playsInline // Important for mobile browsers
                className="block max-w-full max-h-full" // Ensure video fits container
             />
             {!currentUserVideoRef.current?.srcObject && peerId && /* Show only if connected but stream not ready */
                <p className="absolute text-white text-center p-2 bg-black bg-opacity-50 rounded">Waiting for camera...</p>
             }
          </div>
        </div>

        {/* Remote User Video */}
        <div className="border rounded shadow-lg overflow-hidden bg-black flex flex-col">
          <h3 className="text-center font-medium p-2 bg-gray-200 text-gray-700 truncate">
            Remote ({remotePeerIdValue ? remotePeerIdValue.substring(0, 6) + '...' : 'Not Connected'})
          </h3>
           <div className="relative w-full aspect-video bg-gray-800 flex items-center justify-center"> {/* Aspect ratio container */}
               <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline // Important for mobile browsers
                    className="block max-w-full max-h-full" // Ensure video fits container
                />
                {!remoteVideoRef.current?.srcObject && remotePeerIdValue && /* Show only if connected but stream not ready */
                    <p className="absolute text-white text-center p-2 bg-black bg-opacity-50 rounded">Waiting for remote video...</p>
                 }
                 {!remotePeerIdValue && /* Show if no remote connection */
                    <p className="text-gray-400 text-center">No remote connection</p>
                 }
           </div>
        </div>
      </div>
    </div>
  );
};

export default RoomPage;