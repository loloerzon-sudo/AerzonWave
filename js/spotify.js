/**
 * SpotifyService
 * Pure client-side integration with Spotify Web API using OAuth 2.0 PKCE.
 * Provides real-time "Now Playing" tracking (track title, artist, album art)
 * with automatic synchronization to 3D Kinetic Text and HUD badge.
 */

class SpotifyService {
  constructor() {
    this.clientIdKey = 'aetherwave_spotify_client_id';
    this.tokenKey = 'aetherwave_spotify_access_token';
    this.refreshTokenKey = 'aetherwave_spotify_refresh_token';
    this.expiryKey = 'aetherwave_spotify_token_expires_at';
    this.verifierKey = 'aetherwave_spotify_code_verifier';
    this.syncTextKey = 'aetherwave_spotify_sync_text';
    this.formatKey = 'aetherwave_spotify_text_format';

    this.defaultClientId = '48074cb4b10f486fa81ec9e52345ca26';
    this.clientId = localStorage.getItem(this.clientIdKey) || this.defaultClientId;
    this.accessToken = localStorage.getItem(this.tokenKey) || null;
    this.refreshToken = localStorage.getItem(this.refreshTokenKey) || null;
    this.expiresAt = parseInt(localStorage.getItem(this.expiryKey) || '0', 10);
    this.syncToText = localStorage.getItem(this.syncTextKey) !== 'false'; // default true
    this.textFormat = localStorage.getItem(this.formatKey) || 'title_artist'; // 'title_artist' | 'title_only'

    this.currentTrack = null;
    this.pollInterval = null;
    this.isPolling = false;

    // Event listeners
    this.onTrackChangeCallbacks = [];
    this.onStatusChangeCallbacks = [];

    // Auto-refresh token buffer (60 seconds before expiration)
    this.refreshThreshold = 60 * 1000;
  }

  // --- Configuration ---

  setClientId(id) {
    this.clientId = (id || '').trim();
    localStorage.setItem(this.clientIdKey, this.clientId);
  }

  getClientId() {
    return this.clientId || this.defaultClientId;
  }

  setSyncToText(enabled) {
    this.syncToText = !!enabled;
    localStorage.setItem(this.syncTextKey, this.syncToText.toString());
  }

  setTextFormat(format) {
    this.textFormat = format === 'title_only' ? 'title_only' : 'title_artist';
    localStorage.setItem(this.formatKey, this.textFormat);
  }

  isConnected() {
    return !!(this.accessToken && (Date.now() < this.expiresAt || this.refreshToken));
  }

  getRedirectUri() {
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      // Spotify strictly requires explicit loopback 127.0.0.1 instead of localhost
      const origin = window.location.origin.replace('localhost', '127.0.0.1');
      return origin + (window.location.pathname || '/');
    }
    return 'http://127.0.0.1:8000/';
  }

  // --- OAuth 2.0 PKCE Helpers ---

  getCrypto() {
    if (typeof window !== 'undefined' && window.crypto) return window.crypto;
    if (typeof globalThis !== 'undefined' && globalThis.crypto) return globalThis.crypto;
    if (typeof crypto !== 'undefined') return crypto;
    throw new Error('Web Crypto API is not available.');
  }

  generateRandomString(length = 64) {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const cryptoObj = this.getCrypto();
    const values = cryptoObj.getRandomValues(new Uint8Array(length));
    return Array.from(values).map(x => possible[x % possible.length]).join('');
  }

  async sha256(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const cryptoObj = this.getCrypto();
    return cryptoObj.subtle.digest('SHA-256', data);
  }

  base64url(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  }

  async generateCodeChallenge(codeVerifier) {
    const hashed = await this.sha256(codeVerifier);
    return this.base64url(hashed);
  }

  // --- Authentication Flow ---

  async login() {
    if (!this.clientId) {
      throw new Error('Please enter your Spotify Client ID first.');
    }

    const codeVerifier = this.generateRandomString(64);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    localStorage.setItem(this.verifierKey, codeVerifier);

    const redirectUri = this.getRedirectUri();
    const scopes = [
      'user-read-currently-playing',
      'user-read-playback-state',
      'user-read-playback-position',
      'user-modify-playback-state'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: scopes,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async handleAuthCallback() {
    if (typeof window === 'undefined' || !window.location || !window.location.search) {
      return false;
    }
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      this.clearUrlParams();
      throw new Error(`Spotify authorization denied: ${error}`);
    }

    if (!code) return false;

    const codeVerifier = localStorage.getItem(this.verifierKey);
    if (!codeVerifier) {
      this.clearUrlParams();
      return false;
    }

    const redirectUri = this.getRedirectUri();

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || 'Failed to exchange token with Spotify');
      }

      const data = await response.json();
      this.saveTokens(data);
      localStorage.removeItem(this.verifierKey);
      this.clearUrlParams();
      this.emitStatusChange(true);
      this.startPolling();
      return true;
    } catch (err) {
      this.clearUrlParams();
      throw err;
    }
  }

  async getValidToken() {
    if (!this.accessToken) return null;

    // Check if token is still valid
    if (Date.now() < (this.expiresAt - this.refreshThreshold)) {
      return this.accessToken;
    }

    // Refresh token if expired
    if (this.refreshToken) {
      try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'refresh_token',
            refresh_token: this.refreshToken
          })
        });

        if (response.ok) {
          const data = await response.json();
          this.saveTokens(data);
          return this.accessToken;
        }
      } catch (e) {
        console.warn('Spotify token refresh failed:', e);
      }
    }

    return null;
  }

  saveTokens(data) {
    this.accessToken = data.access_token;
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
      localStorage.setItem(this.refreshTokenKey, this.refreshToken);
    }
    this.expiresAt = Date.now() + (data.expires_in * 1000);

    localStorage.setItem(this.tokenKey, this.accessToken);
    localStorage.setItem(this.expiryKey, this.expiresAt.toString());
  }

  disconnect() {
    this.stopPolling();
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    this.currentTrack = null;

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.expiryKey);
    localStorage.removeItem(this.verifierKey);

    this.emitStatusChange(false);
    this.emitTrackChange(null);
  }

  clearUrlParams() {
    if (window.history && window.history.replaceState) {
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }

  // --- Real-Time Polling & Track Sync ---

  startPolling(intervalMs = 2500) {
    if (this.isPolling) return;
    this.isPolling = true;
    this.fetchCurrentlyPlaying();

    this.pollInterval = setInterval(() => {
      this.fetchCurrentlyPlaying();
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isPolling = false;
  }

  async fetchCurrentlyPlaying() {
    const token = await this.getValidToken();
    if (!token) {
      this.stopPolling();
      return null;
    }

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 204) {
        // No song currently playing
        if (this.currentTrack && this.currentTrack.isPlaying) {
          this.currentTrack.isPlaying = false;
          this.emitTrackChange(this.currentTrack);
        }
        return null;
      }

      if (response.status === 401) {
        // Token expired or invalid, try refresh on next loop
        return null;
      }

      if (!response.ok) return null;

      const data = await response.json();
      if (!data || !data.item) {
        return null;
      }

      const item = data.item;
      const title = item.name || 'Unknown Track';
      const artist = (item.artists && item.artists.length > 0)
        ? item.artists.map(a => a.name).join(', ')
        : 'Unknown Artist';
      const albumArt = (item.album && item.album.images && item.album.images[0])
        ? item.album.images[0].url
        : '';
      const isPlaying = !!data.is_playing;
      const trackId = item.id || title;

      const trackInfo = {
        id: trackId,
        title,
        artist,
        album: item.album ? item.album.name : '',
        albumArt,
        isPlaying,
        progressMs: data.progress_ms || 0,
        durationMs: item.duration_ms || 0,
        spotifyUrl: item.external_urls ? item.external_urls.spotify : ''
      };

      const hasChanged = !this.currentTrack ||
        this.currentTrack.id !== trackInfo.id ||
        this.currentTrack.isPlaying !== trackInfo.isPlaying;

      this.currentTrack = trackInfo;

      if (hasChanged) {
        this.emitTrackChange(trackInfo);
      }

      return trackInfo;
    } catch (err) {
      console.warn('Spotify fetch currently playing error:', err);
      return null;
    }
  }

  // --- Remote Playback Controls (user-modify-playback-state) ---

  async play() {
    if (this.currentTrack && this.currentTrack.isDemo) {
      this.currentTrack.isPlaying = true;
      this.emitTrackChange(this.currentTrack);
      return true;
    }
    const token = await this.getValidToken();
    if (!token) return false;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) {
        if (this.currentTrack) this.currentTrack.isPlaying = true;
        this.emitTrackChange(this.currentTrack);
        return true;
      }
    } catch (e) {
      console.warn('Spotify play error:', e);
    }
    return false;
  }

  async pause() {
    if (this.currentTrack && this.currentTrack.isDemo) {
      this.currentTrack.isPlaying = false;
      this.emitTrackChange(this.currentTrack);
      return true;
    }
    const token = await this.getValidToken();
    if (!token) return false;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) {
        if (this.currentTrack) this.currentTrack.isPlaying = false;
        this.emitTrackChange(this.currentTrack);
        return true;
      }
    } catch (e) {
      console.warn('Spotify pause error:', e);
    }
    return false;
  }

  async togglePlay() {
    if (this.currentTrack && this.currentTrack.isPlaying) {
      return this.pause();
    } else {
      return this.play();
    }
  }

  async next() {
    if (this.currentTrack && this.currentTrack.isDemo) {
      this.simulateTrack();
      return true;
    }
    const token = await this.getValidToken();
    if (!token) return false;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) {
        setTimeout(() => this.fetchCurrentlyPlaying(), 400);
        return true;
      }
    } catch (e) {
      console.warn('Spotify next error:', e);
    }
    return false;
  }

  async previous() {
    if (this.currentTrack && this.currentTrack.isDemo) {
      this.simulateTrack();
      return true;
    }
    const token = await this.getValidToken();
    if (!token) return false;
    try {
      const res = await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok || res.status === 204) {
        setTimeout(() => this.fetchCurrentlyPlaying(), 400);
        return true;
      }
    } catch (e) {
      console.warn('Spotify previous error:', e);
    }
    return false;
  }

  // --- Hybrid Reactivity: Synthetic Rhythm & Audio Metrics ---

  isActive() {
    return !!(this.currentTrack && this.currentTrack.isPlaying);
  }

  getAudioMetrics(delta = 0.016) {
    if (!this.isActive()) {
      return {
        bass: 0,
        mid: 0,
        treble: 0,
        overall: 0,
        frequencyData: this.syntheticFreqBuffer || new Uint8Array(1024),
        timeDomainData: this.syntheticTimeBuffer || new Uint8Array(1024),
        beatDetected: false
      };
    }

    this.syntheticClock = (this.syntheticClock || 0) + delta;
    const t = this.syntheticClock;

    // Standard 124 BPM electronic/pop beat: 0.48387s per beat, 1.935s per 4-beat bar
    const beatInterval = 0.484;
    const barInterval = beatInterval * 4;
    const beatProgress = (t % beatInterval) / beatInterval;
    const beatNumber = Math.floor((t % barInterval) / beatInterval); // 0, 1, 2, 3

    // Studio Smooth idle wave: gentle organic breathing without erratic random noise
    const breath = 0.5 + 0.5 * Math.sin(t * 1.8);
    const midPulse = 0.5 + 0.5 * Math.cos(t * 2.6);
    const treblePulse = 0.5 + 0.5 * Math.sin(t * 3.4);

    const bass = 0.35 * Math.max(0, Math.pow(1.0 - beatProgress, 2.8)) + 0.15 * breath;
    const mid = 0.28 * midPulse;
    const treble = 0.22 * treblePulse;
    const overall = (bass * 0.45 + mid * 0.35 + treble * 0.2);

    // Detect calm beat pulse
    let beatDetected = false;
    const currentBeatId = Math.floor(t / beatInterval);
    if (currentBeatId !== this.lastSyntheticBeatId) {
      this.lastSyntheticBeatId = currentBeatId;
      beatDetected = true;
    }

    if (!this.syntheticFreqBuffer) {
      this.syntheticFreqBuffer = new Uint8Array(1024);
      this.syntheticTimeBuffer = new Uint8Array(1024);
    }

    for (let i = 0; i < 1024; i++) {
      let amp = 0;
      if (i < 16) {
        amp = bass * 210 * (1 - i / 16);
      } else if (i < 140) {
        amp = mid * 170 * Math.sin(((i - 16) / 124) * Math.PI);
      } else if (i < 500) {
        amp = treble * 140 * (1 - (i - 140) / 360);
      }
      // Silky studio spectrum curve without chaotic Math.random() jitter
      this.syntheticFreqBuffer[i] = Math.min(255, Math.max(0, Math.round(amp)));
      this.syntheticTimeBuffer[i] = 128 + Math.round(Math.sin(i * 0.08 + t * 4.0) * (bass * 42));
    }

    return {
      bass,
      mid,
      treble,
      overall,
      frequencyData: this.syntheticFreqBuffer,
      timeDomainData: this.syntheticTimeBuffer,
      beatDetected
    };
  }

  // --- Formatting Helpers ---

  getFormattedPhrase(track = this.currentTrack) {
    if (!track) return 'NIRZ';
    const cleanTitle = (track.title || '').toUpperCase();
    const cleanArtist = (track.artist || '').toUpperCase();

    if (this.textFormat === 'title_only' || !cleanArtist) {
      return cleanTitle;
    }

    return `${cleanTitle}\n${cleanArtist}`;
  }

  // --- Demo / Simulation Mode ---

  simulateTrack(demoTitle = 'STARBOY', demoArtist = 'THE WEEKND', demoArt = '') {
    const demo = {
      id: 'demo-' + Date.now(),
      title: demoTitle,
      artist: demoArtist,
      album: 'AetherWave Demo',
      albumArt: demoArt || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=120&auto=format&fit=crop&q=80',
      isPlaying: true,
      progressMs: 64000,
      durationMs: 230000,
      isDemo: true
    };
    this.currentTrack = demo;
    this.emitTrackChange(demo);
    return demo;
  }

  // --- Event Handling ---

  onTrackChange(cb) {
    if (typeof cb === 'function') this.onTrackChangeCallbacks.push(cb);
  }

  onStatusChange(cb) {
    if (typeof cb === 'function') this.onStatusChangeCallbacks.push(cb);
  }

  emitTrackChange(track) {
    this.onTrackChangeCallbacks.forEach(cb => {
      try { cb(track); } catch (e) { console.error(e); }
    });
  }

  emitStatusChange(isConnected) {
    this.onStatusChangeCallbacks.forEach(cb => {
      try { cb(isConnected); } catch (e) { console.error(e); }
    });
  }
}

window.SpotifyService = SpotifyService;
