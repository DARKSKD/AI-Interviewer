import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const WEBHOOK_URL = "http://localhost:5678/webhook/start";
const ANSWER_WEBHOOK_URL = "http://localhost:5678/webhook/answer";

export default function InterviewVoiceUI() {
  const [topic, setTopic] = useState("");
  const [specificTopic, setSpecificTopic] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState(null);
  const [history, setHistory] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [hintAvailable, setHintAvailable] = useState(false);
  const [done, setDone] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceRef = useRef(null);
  const streamRef = useRef(null);
  const spacebarPressedRef = useRef(false);

  // ========== SPACEBAR RECORDING ==========
  useEffect(() => {
    function handleKeyDown(e) {
      if (
        e.code === "Space" &&
        !e.repeat &&
        sessionId &&
        !listening &&
        !processing &&
        !isAudioPlaying &&
        !spacebarPressedRef.current
      ) {
        e.preventDefault();
        spacebarPressedRef.current = true;
        startRecording();
      }
    }

    function handleKeyUp(e) {
      if (e.code === "Space" && listening && spacebarPressedRef.current) {
        e.preventDefault();
        spacebarPressedRef.current = false;
        stopRecording();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [sessionId, listening, processing, isAudioPlaying]);

  // ========== AUTO-PLAY AUDIO ==========
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsAudioPlaying(true);
    const handleEnded = () => setIsAudioPlaying(false);
    const handleError = () => setIsAudioPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  // ========== POST TO WEBHOOK ==========
async function postToWebhook({ action, audioBlob = null }) {
  const fd = new FormData();

  if (action === "start") {
    fd.append("action", action);
    fd.append("topic", topic);
    fd.append("specific", specificTopic);
    fd.append("jobRole", jobRole);
    if (resumeFile) fd.append("resume", resumeFile, resumeFile.name);

    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Webhook error:", errorText);
        throw new Error("Webhook request failed: " + resp.status);
      }

      const data = await resp.json();
      console.log("Start interview response:", data);
      return data;
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error: " + err.message);
      throw err;
    }
    
  } else if (action === "answer") {
    fd.append("sessionId", sessionId);
    if (audioBlob) fd.append("audio", audioBlob, "answer.webm");

    try {
      const resp = await fetch(ANSWER_WEBHOOK_URL , {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Answer webhook error:", errorText);
        throw new Error("Answer webhook request failed: " + resp.status);
      }

      const data = await resp.json();
      console.log("Answer response:", data);
      return data;
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error: " + err.message);
      throw err;
    }
  } else if (action === "hint") {
    fd.append("action", action);
    fd.append("sessionId", sessionId);

    try {
      const resp = await fetch(WEBHOOK_URL, {
        method: "POST",
        body: fd,
      });

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error("Hint webhook error:", errorText);
        throw new Error("Hint request failed: " + resp.status);
      }

      return await resp.json();
    } catch (err) {
      console.error("Network error:", err);
      alert("Network error: " + err.message);
      throw err;
    }
  }
}

  // ========== START INTERVIEW ==========
  async function startInterview() {
  if (!topic.trim() || !jobRole.trim() || !resumeFile) {
    return alert("Please enter job role, topic and upload resume.");
  }

  setProcessing(true);
  try {
    const res = await postToWebhook({ action: "start" });
    
    console.log("Full response:", res);  // Debug: see entire response
    console.log("Wait Webhook URL from response:", res.waitWebhookUrl);  // Debug
    
    setQuestion(res.question || "Interview starting...");
    setHintAvailable(Boolean(res.hintAvailable));
    setSessionId(res.sessionId || `session_${Date.now()}`);
    setDone(Boolean(res.done));
    setIsFirstMessage(false);
    setHistory([]);
    
    
    
    if (res.ttsUrl) {
      await playAudioUrl(res.ttsUrl);
    }
    
    console.log("Interview started successfully!");
  } catch (err) {
    console.error("Failed to start interview:", err);
    alert("Failed to start interview: " + err.message);
  } finally {
    setProcessing(false);
  }
}

  // ========== PLAY AUDIO ==========
  async function playAudioUrl(url) {
    if (!url) return;

    setIsAudioPlaying(true);

    try {
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch (error1) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        audioRef.current.src = objectUrl;
        await audioRef.current.play();
      } catch (error2) {
        console.error("Failed to play TTS:", error2);
        setIsAudioPlaying(false);
      }
    }
  }

  // ========== REQUEST HINT ==========
  async function requestHint() {
    if (!sessionId && !question) return;
    setProcessing(true);
    try {
      const res = await postToWebhook({ action: "hint" });
      if (res.hint) {
        setHistory((h) => [...h, { role: "hint", text: res.hint }]);
      }
      if (res.ttsUrl) await playAudioUrl(res.ttsUrl);
      setHintAvailable(false);
    } finally {
      setProcessing(false);
    }
  }

  // ========== VISUALIZER ==========
  function startVisualizer(stream) {
    audioContextRef.current = new (window.AudioContext ||
      window.webkitAudioContext)();
    analyserRef.current = audioContextRef.current.createAnalyser();
    sourceRef.current =
      audioContextRef.current.createMediaStreamSource(stream);
    sourceRef.current.connect(analyserRef.current);
    analyserRef.current.fftSize = 2048;
    const bufferLength = analyserRef.current.fftSize;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    function draw() {
      if (!analyserRef.current) return;
      requestAnimationFrame(draw);
      analyserRef.current.getByteTimeDomainData(dataArrayRef.current);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#00ffea";
      ctx.beginPath();
      const sliceWidth = (canvas.width * 1.0) / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArrayRef.current[i] / 128.0;
        const y = (v * canvas.height) / 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();
    }
    draw();
  }

  // ========== START RECORDING ==========
  async function startRecording() {
    if (isAudioPlaying) {
      console.log("Cannot record while audio is playing");
      return;
    }

    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      startVisualizer(stream);

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await submitAnswer(blob);
        stream.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
      };

      mr.start();
      setListening(true);
    } catch (err) {
      alert("Could not access microphone: " + err.message);
      console.error("Microphone error:", err);
    }
  }

  // ========== STOP RECORDING ==========
  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setListening(false);
  }

  // ========== SUBMIT ANSWER ==========
  async function submitAnswer(audioBlob) {
  if (!sessionId) {
    console.error("No session ID available!");
    alert("Error: No session ID. Please restart the interview.");
    return;
  }
  
  console.log("Submitting answer with session ID:", sessionId);
  setProcessing(true);
  
  try {
    const res = await postToWebhook({ action: "answer", audioBlob });
    
    // Update state with response
    if (res.sessionId) setSessionId(res.sessionId);

    setHistory((h) => [
      ...h,
      { role: "user", text: res.transcript || "(audio answer sent)" },
    ]);

    setQuestion(res.question || question);
    setHintAvailable(Boolean(res.hintAvailable));
    setDone(Boolean(res.done));

    if (res.ttsUrl) await playAudioUrl(res.ttsUrl);
  } catch (err) {
    console.error("Submit answer error:", err);
    alert("Failed to submit answer: " + err.message);
  } finally {
    setProcessing(false);
  }
}
  // ========== FILE DROP HANDLER ==========
  function handleFileDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type.includes("pdf") ||
        file.type.includes("word") ||
        file.name.endsWith(".docx"))
    ) {
      setResumeFile(file);
    } else {
      alert("Please upload only PDF or DOCX file");
    }
  }

  // ========== RESET INTERVIEW ==========
  function resetInterview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }

    if (listening) {
      stopRecording();
    }

    setTopic("");
    setSpecificTopic("");
    setJobRole("");
    setSessionId(null);
    setResumeFile(null);
    setQuestion(null);
    setHistory([]);
    setDone(false);
    setIsFirstMessage(true);
    setProcessing(false);
    setListening(false);
    setIsAudioPlaying(false);
  }
return (
  <>
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <h1 style={styles.title}>AI Voice Interviewer</h1>

        <div style={styles.card}>
          <label style={styles.label}>Job Role</label>
          <input
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            placeholder="e.g. Frontend Engineer"
            style={styles.input}
            disabled={!!sessionId}
          />

          <label style={styles.label}>Focus Topics</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. React Basics"
            style={styles.input}
            disabled={!!sessionId}
          />

          <input
            value={specificTopic}
            onChange={(e) => setSpecificTopic(e.target.value)}
            placeholder="e.g. React Hooks (optional)"
            style={styles.input}
            disabled={!!sessionId}
          />

          <label style={styles.label}>Upload Resume</label>
          <div
            style={styles.dropzone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => !sessionId && document.getElementById("resumeInput").click()}
          >
            {resumeFile ? (
              <span style={{ color: "#00ffea" }}>✓ {resumeFile.name}</span>
            ) : (
              <span>Drag & drop PDF/DOCX here or click to upload</span>
            )}
          </div>
          <input
            type="file"
            id="resumeInput"
            hidden
            accept=".pdf,.doc,.docx"
            disabled={!!sessionId}
            onChange={(e) => setResumeFile(e.target.files[0])}
          />

          {uploadProgress > 0 && (
            <div style={styles.progress}>
              <div style={{ ...styles.progressBar, width: `${uploadProgress}%` }} />
            </div>
          )}

          <div style={styles.row}>
            <button
              onClick={startInterview}
              style={{ ...styles.btn, ...styles.neonBtn }}
              disabled={processing || !!sessionId}
            >
              {processing ? "Starting..." : "Start Interview"}
            </button>
            <button onClick={resetInterview} style={{ ...styles.btn, ...styles.grayBtn }}>
              Reset
            </button>
          </div>
        </div>
        <p style={{ color: "#00ffea", fontSize: "0.9rem", marginTop: "1rem" }}>Wait for 10-20 Seconds for Processing ...</p>

        <div style={styles.panel}>
          <div style={styles.avatar}>🤖</div>
          <div style={styles.content}>
            <div style={styles.question}>{question || "No question yet"}</div>
            <button
              onClick={requestHint}
              style={{ ...styles.btn, ...styles.hintBtn }}
              disabled={!hintAvailable || processing}
            >
              💡 Hint
            </button>
          </div>
        </div>

        {sessionId && (
          <div style={styles.instructions}>
            {isAudioPlaying ? (
              <div style={{ color: "#ff00d4", fontWeight: "bold" }}>
                🔊 Listening to question... Please wait
              </div>
            ) : (
              <div style={{ color: "#00ffea" }}>
                🎤 Press and HOLD <kbd style={styles.kbd}>SPACEBAR</kbd> to record your answer
              </div>
            )}
          </div>
        )}

        <div style={styles.recording}>
          <canvas ref={canvasRef} width={500} height={80} style={styles.canvas} />
          {!listening ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startRecording}
              style={{ ...styles.btn, ...styles.recordBtn }}
              disabled={!sessionId || processing || isAudioPlaying}
            >
              🎤 Start Answer
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={stopRecording}
              style={{ ...styles.btn, ...styles.stopBtn }}
            >
              ⏹ Stop & Send
            </motion.button>
          )}
        </div>

        {history.length > 0 && (
          <div style={styles.history}>
            <h3 style={{ color: "#00ffea", fontSize: "1rem", marginBottom: "0.5rem" }}>
              Conversation History
            </h3>
            {history.map((h, i) => (
              <div key={i} style={h.role === "user" ? styles.msgUser : styles.msgHint}>
                {h.text}
              </div>
            ))}
          </div>
        )}

        {done && (
          <div style={styles.doneMessage}>
            ✅ Interview Complete! Check your results.
          </div>
        )}

        <audio ref={audioRef} hidden autoPlay />
      </div>
    </div>
    </>
  );
}
const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#eee",
    fontFamily: "'Orbitron', sans-serif",
    padding: "1rem",
  },
  wrapper: {
    width: "95%",
    maxWidth: "900px",
    padding: "1.5rem",
    borderRadius: "20px",
    background: "rgba(10, 5, 25, 0.95)",
    boxShadow: "0 0 50px rgba(138, 43, 226, 0.6), 0 0 100px rgba(0, 255, 234, 0.3), inset 0 0 30px rgba(138, 43, 226, 0.1)",
    border: "1px solid rgba(138, 43, 226, 0.3)",
  },
  title: {
    textAlign: "center",
    fontSize: "2.2rem",
    background: "linear-gradient(90deg, #8A2BE2, #00FFEA, #FF00FF)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    marginBottom: "1rem",
    textShadow: "0 0 30px rgba(138, 43, 226, 0.8)",
    filter: "drop-shadow(0 0 20px rgba(138, 43, 226, 0.6))",
    fontWeight: "bold",
  },
  card: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginTop: "1rem",
    fontSize: "0.9rem",
    color: "#ccc",
  },
  input: {
    width: "97%",
    padding: "0.7rem",
    marginTop: "0.3rem",
    border: "2px solid rgba(138, 43, 226, 0.4)",
    borderRadius: "10px",
    background: "rgba(10, 5, 20, 0.8)",
    color: "#eee",
    outline: "none",
    boxShadow: "0 0 15px rgba(138, 43, 226, 0.3) inset",
    fontSize: "1rem",
    transition: "all 0.3s",
  },
  dropzone: {
    marginTop: "0.5rem",
    padding: "1.2rem",
    border: "2px dashed #8A2BE2",
    borderRadius: "12px",
    textAlign: "center",
    cursor: "pointer",
    color: "#999",
    transition: "all 0.3s",
    background: "rgba(138, 43, 226, 0.05)",
  },
  progress: {
    marginTop: "0.5rem",
    height: "8px",
    background: "#222",
    borderRadius: "5px",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    background: "linear-gradient(90deg, #00ffea, #ff00d4)",
    transition: "width 0.3s",
  },
  row: {
    display: "flex",
    gap: "1rem",
    marginTop: "1rem",
  },
  btn: {
    padding: "0.7rem 1.2rem",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.2s",
    fontSize: "1rem",
  },
  neonBtn: {
    background: "linear-gradient(135deg, #8A2BE2, #9D4EDD)",
    color: "#fff",
    boxShadow: "0 0 20px rgba(138, 43, 226, 0.8), 0 0 40px rgba(138, 43, 226, 0.4)",
    flex: 1,
    border: "2px solid rgba(157, 78, 221, 0.6)",
  },
  grayBtn: {
    background: "#444",
    color: "#eee",
  },
  hintBtn: {
    background: "linear-gradient(135deg, #FF00FF, #FF1493)",
    color: "#fff",
    marginTop: "0.5rem",
    boxShadow: "0 0 20px rgba(255, 0, 255, 0.8), 0 0 40px rgba(255, 0, 255, 0.4)",
    border: "2px solid rgba(255, 20, 147, 0.6)",
  },
  recordBtn: {
    background: "linear-gradient(135deg, #00FFEA, #00CED1)",
    color: "#0a0014",
    boxShadow: "0 0 25px rgba(0, 255, 234, 0.8), 0 0 50px rgba(0, 255, 234, 0.4)",
    width: "100%",
    border: "2px solid rgba(0, 206, 209, 0.6)",
    fontWeight: "bold",
  },
  stopBtn: {
    background: "#ff0033",
    color: "#fff",
    boxShadow: "0 0 10px #ff0033, 0 0 25px #ff0033",
    width: "100%",
  },
  panel: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1rem",
    alignItems: "center",
    padding: "1rem",
    background: "rgba(138, 43, 226, 0.08)",
    borderRadius: "12px",
    border: "1px solid rgba(138, 43, 226, 0.3)",
    boxShadow: "0 0 20px rgba(138, 43, 226, 0.2)",
  },
  avatar: {
    fontSize: "2rem",
  },
  content: {
    flex: 1,
  },
  question: {
    fontSize: "1.1rem",
    marginBottom: "0.5rem",
    color: "#B19CD9",
    textShadow: "0 0 10px rgba(138, 43, 226, 0.6)",
  },
  instructions: {
    padding: "0.8rem",
    background: "rgba(138, 43, 226, 0.12)",
    borderRadius: "10px",
    textAlign: "center",
    marginBottom: "1rem",
    fontSize: "0.95rem",
    border: "1px solid rgba(138, 43, 226, 0.3)",
  },
  kbd: {
    background: "rgba(138, 43, 226, 0.3)",
    padding: "0.2rem 0.5rem",
    borderRadius: "5px",
    border: "2px solid #8A2BE2",
    color: "#B19CD9",
    fontWeight: "bold",
    boxShadow: "0 0 10px rgba(138, 43, 226, 0.5)",
  },
  canvas: {
    width: "100%",
    maxWidth: "500px",
    margin: "0.8rem auto",
    display: "block",
    background: "rgba(10, 5, 20, 0.8)",
    borderRadius: "8px",
    boxShadow: "0 0 25px rgba(138, 43, 226, 0.5), inset 0 0 20px rgba(138, 43, 226, 0.2)",
    border: "1px solid rgba(138, 43, 226, 0.4)",
  },
  recording: {
    marginBottom: "1rem",
  },
  history: {
    marginTop: "1.5rem",
    maxHeight: "200px",
    overflowY: "auto",
    padding: "1rem",
    background: "rgba(0, 0, 0, 0.3)",
    borderRadius: "10px",
  },
  msgUser: {
    padding: "0.5rem 0.8rem",
    marginBottom: "0.5rem",
    borderRadius: "8px",
    background: "rgba(0, 255, 234, 0.15)",
    color: "#00FFEA",
    border: "1px solid rgba(0, 255, 234, 0.3)",
  },
  msgHint: {
    padding: "0.5rem 0.8rem",
    marginBottom: "0.5rem",
    borderRadius: "8px",
    background: "rgba(255, 0, 255, 0.15)",
    color: "#FF00FF",
    border: "1px solid rgba(255, 0, 255, 0.3)",
  },
  doneMessage: {
    marginTop: "1rem",
    padding: "1rem",
    background: "rgba(138, 43, 226, 0.2)",
    border: "2px solid #8A2BE2",
    borderRadius: "10px",
    textAlign: "center",
    color: "#B19CD9",
    fontWeight: "bold",
    fontSize: "1.1rem",
    boxShadow: "0 0 30px rgba(138, 43, 226, 0.5)",
  },
};