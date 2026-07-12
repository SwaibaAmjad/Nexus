import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import SimplePeer from "simple-peer";
import { useAuth } from "../../context/AuthContext";

const SIGNALING_URL = "https://nexus-production-abcc.up.railway.app";

interface PeerEntry {
  socketId: string;
  peer: SimplePeer.Instance;
}

export function VideoCallPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [connected, setConnected] = useState(false);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const peersRef = useRef<PeerEntry[]>([]);

  const createPeer = useCallback(
    (targetSocketId: string, initiator: boolean, stream: MediaStream) => {
      const peer = new SimplePeer({ initiator, trickle: true, stream });

      peer.on("signal", (signal) => {
        socketRef.current?.emit("signal", {
          to: targetSocketId,
          from: socketRef.current?.id,
          signal,
        });
      });

      peer.on("stream", (remoteStream) => {
        setRemoteStreams((prev) => ({ ...prev, [targetSocketId]: remoteStream }));
      });

      peer.on("close", () => {
        setRemoteStreams((prev) => {
          const copy = { ...prev };
          delete copy[targetSocketId];
          return copy;
        });
      });

      peer.on("error", (err) => console.error("Peer error:", err));

      return peer;
    },
    []
  );

  useEffect(() => {
    if (!roomId) return;

    let stream: MediaStream;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err) {
        console.error("Failed to get media devices:", err);
        alert("Camera/microphone access is required to join the call.");
        return;
      }

      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const socket = io(SIGNALING_URL, { transports: ["websocket"] });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("join-room", { roomId, userId: user?._id || "unknown" });
      });

      // Existing users already in the room -> we initiate connections to them
      socket.on("room-users", (existingIds: string[]) => {
        existingIds.forEach((id) => {
          const peer = createPeer(id, true, stream);
          peersRef.current.push({ socketId: id, peer });
        });
      });

      // A new user joined after us -> they will initiate, we just wait for their signal
      socket.on("user-joined", ({ socketId }: { socketId: string }) => {
        const peer = createPeer(socketId, false, stream);
        peersRef.current.push({ socketId, peer });
      });

      socket.on("signal", ({ from, signal }: { from: string; signal: SimplePeer.SignalData }) => {
        const entry = peersRef.current.find((p) => p.socketId === from);
        if (entry) {
          entry.peer.signal(signal);
        }
      });

      socket.on("peer-toggle-media", ({ socketId, kind, enabled }: { socketId: string; kind: string; enabled: boolean }) => {
        // Optional: reflect peer's mute/cam state in UI. Left as a no-op hook for now.
        console.log(`Peer ${socketId} toggled ${kind}: ${enabled}`);
      });

      socket.on("user-left", ({ socketId }: { socketId: string }) => {
        const entry = peersRef.current.find((p) => p.socketId === socketId);
        entry?.peer.destroy();
        peersRef.current = peersRef.current.filter((p) => p.socketId !== socketId);
        setRemoteStreams((prev) => {
          const copy = { ...prev };
          delete copy[socketId];
          return copy;
        });
      });
    };

    start();

    return () => {
      peersRef.current.forEach((p) => p.peer.destroy());
      peersRef.current = [];
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      socketRef.current?.emit("leave-room");
      socketRef.current?.disconnect();
    };
  }, [roomId, user, createPeer]);

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextEnabled = !micOn;
    stream.getAudioTracks().forEach((t) => (t.enabled = nextEnabled));
    setMicOn(nextEnabled);
    socketRef.current?.emit("toggle-media", { roomId, kind: "audio", enabled: nextEnabled });
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const nextEnabled = !camOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = nextEnabled)); 
    setCamOn(nextEnabled);
    socketRef.current?.emit("toggle-media", { roomId, kind: "video", enabled: nextEnabled });
  };

  const endCall = () => {
    peersRef.current.forEach((p) => p.peer.destroy());
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    socketRef.current?.emit("leave-room");
    socketRef.current?.disconnect();
    navigate(-1);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#fff", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", fontSize: 14, opacity: 0.7 }}>
        Room: {roomId} — {connected ? "Connected" : "Connecting..."}
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          padding: 20,
        }}
      >
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          style={{ width: "100%", borderRadius: 8, background: "#222" }}
        />
        {Object.entries(remoteStreams).map(([socketId, stream]) => (
          <RemoteVideo key={socketId} stream={stream} />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, padding: 20 }}>
        <button onClick={toggleMic} style={btnStyle(micOn)}>
          {micOn ? "Mute Mic" : "Unmute Mic"}
        </button>
        <button onClick={toggleCam} style={btnStyle(camOn)}>
          {camOn ? "Turn Off Camera" : "Turn On Camera"}
        </button>
        <button onClick={endCall} style={{ ...btnStyle(true), background: "#dc3545" }}>
          End Call
        </button>
      </div>
    </div>
  );
}

function RemoteVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline style={{ width: "100%", borderRadius: 8, background: "#222" }} />;
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    padding: "10px 20px",
    borderRadius: 8,
    border: "none",
    background: active ? "#3174ad" : "#555",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  };
}
