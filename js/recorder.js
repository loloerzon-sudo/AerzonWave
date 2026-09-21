/**
 * Video & Audio Recorder Engine for AetherWave
 * Captures 60FPS WebGL canvas stream and digital Web Audio stream into an MP4/WebM video file.
 * Supports Full-Track Rendering and Clip Recording with auto-download.
 */

class VideoRecorder {
  constructor(canvas, audioEngine) {
    this.canvas = canvas;
    this.audio = audioEngine;

    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.recordMode = "full"; // "full" or "clip"

    this.startTime = 0;
    this.timerInterval = null;
    this.totalDuration = 0;

    this.onProgressCb = null;
    this.onCompleteCb = null;

    this.selectedMimeType = this.getBestMimeType();
  }

  getBestMimeType() {
    const types = [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];

    for (const type of types) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return "video/webm";
  }

  isMp4Supported() {
    return this.selectedMimeType.includes("mp4");
  }

  startRecording(mode = "full", fps = 60, callbacks = {}) {
    if (this.isRecording) return;

    this.recordMode = mode;
    this.onProgressCb = callbacks.onProgress || null;
    this.onCompleteCb = callbacks.onComplete || null;
    this.recordedChunks = [];
    this._pendingStart = true; // warm-up guard flag

    // 1. Capture Canvas Stream (60 or 30 FPS)
    const canvasStream = this.canvas.captureStream(fps);

    // 2. Get Audio Stream from Web Audio Engine
    const audioStream = this.audio.getAudioStream();
    const tracks = [...canvasStream.getVideoTracks()];

    if (audioStream && audioStream.getAudioTracks().length > 0) {
      tracks.push(audioStream.getAudioTracks()[0]);
    }

    const combinedStream = new MediaStream(tracks);

    // 3. Create MediaRecorder
    const options = {
      mimeType: this.selectedMimeType,
      videoBitsPerSecond: 20000000 // 20 Mbps — handles fast particle motion cleanly
    };

    try {
      this.mediaRecorder = new MediaRecorder(combinedStream, options);
    } catch (e) {
      console.warn("Primary MIME type failed, falling back to default:", e);
      this.mediaRecorder = new MediaRecorder(combinedStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.finishAndDownload();
    };

    // 4. If Full-Track Mode: rewind track to 0:00 and auto-stop when song finishes
    if (mode === "full") {
      this.audio.rewind();
      this.totalDuration = this.audio.getDuration() || 60;

      this.audio.onTrackEnded(() => {
        if (this.isRecording && this.recordMode === "full") {
          this.stop();
        }
      });
    } else {
      this.totalDuration = 0;
    }

    // Start playback immediately so audio analyser primes
    this.audio.play();

    // 800ms warm-up: lets particles, beatPunch and sparks settle before any pixel is captured
    // This eliminates the white particle glitch and first-frame flash artifacts
    setTimeout(() => {
      if (!this._pendingStart) return; // cancelled before warm-up finished
      this._pendingStart = false;

      this.mediaRecorder.start(50); // 50ms timeslice — tight chunks, no block artifacts
      this.isRecording = true;
      this.startTime = performance.now();

      // Progress Timer loop
      this.timerInterval = setInterval(() => {
        if (!this.isRecording) return;

        const elapsedSec = (performance.now() - this.startTime) / 1000;
        let percent = 0;

        if (this.recordMode === "full" && this.totalDuration > 0) {
          percent = Math.min(100, (elapsedSec / this.totalDuration) * 100);
          if (elapsedSec >= this.totalDuration + 0.5) {
            this.stop();
            return;
          }
        }

        if (this.onProgressCb) {
          this.onProgressCb({
            elapsed: elapsedSec,
            total: this.totalDuration,
            percent: percent,
            mode: this.recordMode
          });
        }
      }, 100);
    }, 800);
  }

  stop() {
    if (!this.isRecording || !this.mediaRecorder) return;

    this.isRecording = false;
    clearInterval(this.timerInterval);

    if (this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
  }

  cancel() {
    this._pendingStart = false;
    this.isRecording = false;
    clearInterval(this.timerInterval);
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.recordedChunks = [];
  }

  finishAndDownload() {
    clearInterval(this.timerInterval);
    this.isRecording = false;

    if (this.recordedChunks.length === 0) return;

    const mimeType = this.selectedMimeType;
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);

    // File naming
    const ext = this.isMp4Supported() ? "mp4" : "mp4"; // MP4 format
    const trackName = (this.audio.currentTrackName || "AetherWave").replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${trackName}_visualizer_${Date.now()}.${ext}`;

    // Auto-trigger browser download
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);

    if (this.onCompleteCb) {
      this.onCompleteCb({ filename, blobSize: blob.size });
    }
  }
}

window.VideoRecorder = VideoRecorder;
