# AerzonWave - 3D Cyber Audio Visualizer
*Created by [Nerzon](https://nerzon.online)*

A zero-dependency, local-first 3D Cyber Audio Visualizer crafted with WebGL / Three.js, UnrealBloomPass post-processing, and the Web Audio API. Features live system sound/tab loopback sync, multiline kinetic typography, 8 procedural visual modes, freeform RGB color palettes, in-browser 60 FPS 1080p MP4 video rendering, and 100% free online deployment via GitHub Pages.

---

## 🚀 How to Run Locally

You can run this application immediately in **either of these 2 ways**:

### Option 1: Double-Click (Zero Install)
Just double-click **`index.html`** in your file manager to open it in any web browser (Chrome, Edge, Firefox, Brave, Safari).

### Option 2: Local HTTP Server (Optional)
If you prefer running via `localhost`:
- Double-click **`start.bat`**
- Or run in terminal:
  ```bash
  python -m http.server 8000
  # Then open http://localhost:8000
  ```

---

## 🔊 Live Spotify & Computer Audio Sync

You can sync the visualizer directly with **Spotify, YouTube, Apple Music, games, or any sounds playing on your computer**:

1. Click **🔊 Live Audio** on the bottom HUD.
2. Select **🖥️ Spotify & System Audio (Recommended)**:
   - When the browser prompt opens, select **"Entire Screen"** (or the **"Spotify / YouTube"** tab/window).
   - **Important**: Make sure to check the box: **☑ "Also share system audio"** (or **"Share tab audio"**).
3. Play any song on Spotify! The visualizer and your custom kinetic text will instantly dance to the beats.
4. **Zero Feedback / Zero Echo**: The visualizer analyzes the sound digitally without playing it back over your speakers, so your music sounds clean and natural.
5. Click **🔴 Stop Sync** anytime to return to local file or synth mode.
6. *(Alternative)*: Select **🎙️ Microphone / DJ Speakers** if you want to capture live sound from speakers in your room.

---

## 🎬 In-Browser MP4 Video Recording & Export

You can render and export your music visualizer directly as a high-definition **`.mp4` video with synchronized digital audio** without installing any screen recorder or software!

1. Load your `.mp3` or `.wav` song, or start playing Spotify/built-in audio.
2. Pick your visual mode (`1` - `7`), custom kinetic text, color palette, and aspect ratio:
   - **`9:16`**: Optimized for TikTok, Instagram Reels, and YouTube Shorts.
   - **`16:9`**: Standard widescreen for YouTube.
   - **`1:1`**: Square for Instagram feed.
   - **`FULL`**: Borderless display.
3. Click **🎬 Render Video** on the top bar:
   - **Option A - Render Full Track**: Automatically rewinds to `0:00`, plays through the track once, and auto-downloads the completed `.mp4` video as soon as the song finishes!
   - **Option B - Record Custom Clip**: Starts recording immediately; click **Finish & Download** whenever you want to capture a short 15s/30s snippet.
4. **Pristine Video Output**: All buttons, sliders, and menus are automatically excluded during recording so the exported video contains **only the pure 60 FPS 3D visual art and your kinetic typography**.

---

## ✍️ Custom Multiline Kinetic Text Studio

Type any custom text or phrase (e.g., your DJ name, song title, brand, or phrase):
- **Press Enter for 2nd & 3rd Lines**: Neatly stack multiple lines (`NIRZ`, `DROP THE BASS`, etc.).
- **Auto-Balanced Scaling**: Line heights, vertical centering, and font sizes automatically scale to keep everything centered and legible without overflowing.
- **Calm & Crisp on Silence**: Stays clean, readable, and floats gently with a soft neon aura when music stops.
- **Goes Wild on Music**:
  - **Bass Slam & Scale Punch**: Letters bounce and slam with the kick drum.
  - **RGB Chromatic Glitch**: Digital color-splitting aberration flashes on transients and beat drops.
  - **Frequency Wave Ripple**: Text undulates and warps with mid/high spectrum frequencies.
  - **Spark Explosions**: Particle sparks burst outward from the letters on heavy beats.
  - **3D Wobble & Camera Tilt**: Rotates and banks dynamically with track energy.
- **Controls**:
  - Open **✍️ Text Studio** from the top bar (or press **`T`**).
  - Pick from 4 typography fonts: *Cyberpunk Orbitron*, *Bold Montserrat*, *Mythic Cinzel*, or *Terminal Space Mono*.
  - Adjust the **Crazy / Chaos Level** slider (from subtle pulse to complete overdrive).

---

## 🌌 7 Switchable 3D Visual Modes

1. **Cosmic Swarm (`1`)**: 16,000+ particle galactic swarm orbiting in harmonic flow fields with central star pulses and expanding shockwaves.
2. **Cyber Tunnel / Grid (`2`)**: Retro synthwave wireframe highway with mountainous audio ridges and glowing horizon sun.
3. **Liquid Orb / Morph Mesh (`3`)**: Dynamic 3D sphere displaced in real-time by Simplex 3D noise with outer neon cage and gyroscopic frequency rings.
4. **Kinetic Text Arena (`4`)**: Monumental typography stage with a soundwave mirror floor, reactive vertical neon light pillars, and moving-head spotlights.
5. **Neon Spectrum City (`5`)**: 3D equalizer skyscraper skyline pumping to discrete FFT frequency bins with physics-driven peak caps.
6. **Black Hole Singularity (`6`)**: Ultra-dense event horizon sphere, photon lensing ring, relativistic accretion disk with Doppler beaming, and bipolar plasma jets.
7. **Cyber Laser Matrix (`7`)**: Concert stage laser scanners with oscillating beam fans, crisscrossing beams, and reactive volumetric haze floor.

---

## 🎨 Full Customization & Freeform Colors

- **Freeform Color Pickers**: Open **⚙️ Tune** to pick custom **Primary**, **Secondary**, and **Accent** colors with full RGB/Hex color wheels.
- **Preset Palettes**: Quick switch between *Cyber Neon*, *Sunset Horizon*, *Matrix Toxic*, *Deep Glacier*, *Vaporwave Dream*, and *Aurora Borealis*.
- **Surprise Me (`R`)**: Smoothly morphs parameters, speed, and color harmonies.
- **Auto-Pilot (`A`)**: Party mode that automatically shifts parameters and cycles visual modes across heavy beat drops.
- **Custom Presets**: Save, name, and recall custom setups to `localStorage`.

---

## 🌐 How to Deploy Online for Free (GitHub Pages)

Because AetherWave is 100% client-side (no backend or database required), you can host it **100% free forever** on **GitHub Pages** with free SSL and custom domain support!

### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new) and create a new repository (e.g. `MusicVisualizer`).
2. Make it **Public**.

### Step 2: Push the Code
In your local `MusicVisualizer` directory, run in terminal:
```bash
git init
git add .
git commit -m "Initial release of AetherWave 3D Music Visualizer"
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository on GitHub.
2. Click **Settings** ➔ **Pages** (in the left sidebar).
3. Under **Build and deployment** ➔ **Source**, select **GitHub Actions** (the included `.github/workflows/deploy.yml` will automatically deploy your site on every push).
4. Within 1 minute, GitHub will provide your live URL:
   ```
   https://<YOUR-USERNAME>.github.io/<YOUR-REPO-NAME>/
   ```

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| **`Space`** | Play / Pause Audio |
| **`T`** | Toggle Kinetic Text Overlay |
| **`1` - `7`** | Switch Visual Mode (Cosmic, Tunnel, Liquid, Arena, City, Singularity, Lasers) |
| **`R`** | Surprise Me (Randomize Parameters) |
| **`A`** | Toggle Auto-Pilot (Party Mode) |
| **`F`** | Toggle Fullscreen |
| **`H`** | Show / Hide HUD |
| **`?`** | Open Shortcuts Guide |
| **`Esc`** | Close Open Drawers & Modals |
