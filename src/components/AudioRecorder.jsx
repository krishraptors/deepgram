import React, { useState, useEffect } from "react";
import { Mic, StopCircle, Save, FileText } from "lucide-react";

const AudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState("");
  const [savedTranscriptions, setSavedTranscriptions] = useState([]);

  // Load saved transcriptions on component mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("transcriptions")) || [];
    setSavedTranscriptions(saved);
  }, []);

  const handleRecording = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mediaRecorder = new MediaRecorder(stream, {
          MimeType: "audio/webm",
        });

        const socket = new WebSocket(
          "wss://api.deepgram.com/v1/listen",
          ["token", "9f2925fca07f21d3085e48ea86cd110120e5ee82"]
        );

        socket.onopen = () => {
          mediaRecorder.addEventListener("dataavailable", (event) => {
            socket.send(event.data);
          });
          mediaRecorder.start(100);
        };

        socket.onmessage = (message) => {
          const received = JSON.parse(message.data);
          const transcript = received.channel.alternatives[0]?.transcript || "";
          if (transcript) {
            setTranscription((prev) => `${prev} ${transcript}`);
          }
        };

        socket.onerror = () => setError("WebSocket error: Unable to connect.");

        socket.onclose = () => {
          mediaRecorder.stop();
          stream.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
        };

        mediaRecorder.onstop = () => {
          socket.close();
        };
      })
      .catch((err) => {
        setError(`Audio recording failed: ${err.message}`);
        setIsRecording(false);
      });
  };

  const saveTranscription = () => {
    if (!transcription.trim()) {
      alert("No transcription available to save!");
      return;
    }

    const updatedTranscriptions = [...savedTranscriptions, transcription];
    setSavedTranscriptions(updatedTranscriptions);
    localStorage.setItem("transcriptions", JSON.stringify(updatedTranscriptions));
    alert("Transcription saved!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl overflow-hidden transform transition-all duration-300 hover:scale-105">
        {/* Recording Button */}
        <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-center">
          <button 
            onClick={handleRecording} 
            className={`
              w-24 h-24 rounded-full mx-auto flex items-center justify-center 
              transition-all duration-300 ease-in-out transform 
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                : 'bg-green-500 hover:bg-green-600'}
              text-white shadow-lg hover:scale-110
            `}
          >
            {isRecording ? <StopCircle size={48} /> : <Mic size={48} />}
          </button>
          {isRecording && (
            <p className="text-sm text-white opacity-75 mt-2 animate-pulse">
              Recording in progress...
            </p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
            <p>{error}</p>
          </div>
        )}

        {/* Transcription Display */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-100 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-auto">
            {transcription ? (
              <p className="text-gray-800">{transcription}</p>
            ) : (
              <p className="text-gray-500 text-center">
                Your transcription will appear here...
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button 
              onClick={saveTranscription}
              className="
                flex-1 flex items-center justify-center 
                bg-blue-500 text-white py-3 rounded-lg 
                hover:bg-blue-600 transition-colors 
                space-x-2
              "
            >
              <Save size={20} />
              <span>Save Transcription</span>
            </button>
          </div>
        </div>

        {/* Saved Transcriptions */}
        <div className="bg-gray-50 p-6 border-t">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <FileText className="mr-2" />
            Saved Transcriptions
          </h3>
          {savedTranscriptions.length === 0 ? (
            <p className="text-gray-500 text-center">No saved transcriptions</p>
          ) : (
            <ul className="space-y-2 max-h-[200px] overflow-auto">
              {savedTranscriptions.map((item, index) => (
                <li 
                  key={index} 
                  className="
                    bg-white border rounded-lg p-3 
                    text-gray-700 text-sm 
                    shadow-sm hover:shadow-md 
                    transition-all duration-200
                  "
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioRecorder;