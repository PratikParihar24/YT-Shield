# YT Shield

A minimalistic, high-performance personal-use Chrome Extension designed to minimize/prevent YouTube advertisements through a modular layered architecture and intelligent playback recovery.

---

## Architecture Overview

YT Shield does not rely on a single fragile selector or brute-force hacks. It implements a multi-tier defense and recovery pipeline:

```text
DeclarativeNetRequest (Network filtering)
       ↓
Page/Player Detection (DOM, Classes, Overlays, Video State)
       ↓
Confidence Engine (Multi-signal probabilistic combination)
       ↓
Player State Machine (Strict validated lifecycle transitions)
       ↓
Recovery Manager (Tiered strategy escalation & loop guards)
       ↓
Playback Verifier (Confirmation before resuming normal playback)
       ↓
Local Statistics & Logging (Zero tracking, 100% on-device)
```

### Subsystems

1. **Network Filtering (`declarativeNetRequest`)**
   - Ruleset targeting known ad tracking and beacon endpoints (`/api/stats/ads`, `/pagead/`, `googleads`) without breaking video media segment streams.
2. **Detection Engine (`AdDetector`)**
   - Multi-detector architecture: `PlayerDetector`, `DOMDetector`, `NavigationDetector`, `VideoStateDetector`.
3. **Confidence Engine (`ConfidenceEngine`)**
   - Evaluates incoming signals probabilistically (`1 - product(1 - p_i)`), triggering `AD_DETECTED` only when threshold (>=70%) is met.
4. **State Machine (`PlayerStateMachine`)**
   - Formal states: `IDLE`, `LOADING`, `PLAYING`, `PAUSED`, `SUSPICIOUS`, `AD_DETECTED`, `RECOVERING`, `RECOVERED`, `FAILED`.
5. **Tiered Recovery Manager (`RecoveryManager`)**
   - **Level 1 (Least Disruptive):** Skip button auto-trigger, ad fast-forwarding, overlay removal.
   - **Level 2 (Moderately Disruptive):** Player API seek-to saved timestamp and auto-play re-engagement.
   - **Level 3 (Last Resort):** Targeted URL parameter reload with saved playback timestamp.
   - **Loop Protection:** 3-second cooldown, max attempt caps per video ID, and reload session suppression.
6. **UI / UX**
   - Restrained monochrome design (White/Black/Gray), system font stack, dark/light mode via `prefers-color-scheme`.
   - Compact popup (360px × 460px) and dedicated settings page.

---

## Installation & Setup

### Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)
- Google Chrome (or Chromium-based browser)

### Building the Extension

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npm run test

# 3. Build production extension package
npm run build
```

The output bundle is generated in the `dist/` directory.

### Loading Unpacked Extension into Chrome

1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Toggle **Developer mode** in the upper-right corner.
4. Click **Load unpacked**.
5. Select the `dist/` folder inside the `YT-Shield` directory:
   `c:\Users\prati\OneDrive\Desktop\YT-Shield\dist`
6. Pin **YT Shield** to your Chrome toolbar.

---

## Manual Testing Checklist

Use this checklist to verify extension functionality:

- [ ] **Extension Loading:** Extension loads without manifest or service worker errors in `chrome://extensions`.
- [ ] **Popup UI (Non-YouTube Tab):** Open popup on a non-YouTube tab. Status shows "YouTube not detected".
- [ ] **Popup UI (YouTube Tab):** Open popup on `youtube.com/watch`. Status shows active status dot and current video state.
- [ ] **Protection Toggle:** Toggling ON/OFF in popup updates state and enables/disables DNR rules.
- [ ] **Normal Playback:** Regular videos play smoothly without interruptions, stuttering, or playback rate issues.
- [ ] **Player Controls:** Manual pause, seek, volume change, fullscreen, and playback speed adjustments behave normally.
- [ ] **Video Navigation (SPA):** Clicking related videos or search results smoothly resets recovery attempts and tracks the new video.
- [ ] **YouTube Shorts:** Navigating to `/shorts/` maintains normal Shorts playback without false positives.
- [ ] **Settings Page:** Open Settings from popup. Settings toggles persist to `chrome.storage.local`.
- [ ] **Dark Mode:** Toggling OS dark mode updates popup and options UI smoothly to dark tokens.
- [ ] **Recovery Execution:** When an ad sequence appears, the extension clicks skip/fast-forwards and verifies playback restoration.
- [ ] **Loop Protection:** Stalled ads will never trigger infinite reload cycles; halts after max configured attempts.

---

## Known Limitations

1. **Encrypted/Server-Stitched Streams:** When YouTube serves server-side injected ads directly in the video manifest without ad metadata or DOM overlays, DOM-level skip triggers cannot detect them.
2. **Third-party DOM Changes:** YouTube regularly experiments with obfuscated DOM class names. Selectors are centralized in [constants.ts](file:///c:/Users/prati/OneDrive/Desktop/YT-Shield/src/shared/constants.ts) for easy ongoing updates.
3. **No External Bypasses:** YT Shield operates strictly locally with zero external proxy servers or remote script injections to ensure absolute privacy and security.

---

## Project Structure

```text
YT-Shield/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
├── assets/
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   ├── content.ts
│   │   ├── detection/
│   │   │   ├── ad-detector.ts
│   │   │   ├── confidence-engine.ts
│   │   │   ├── detector-interface.ts
│   │   │   ├── dom-detector.ts
│   │   │   ├── navigation-detector.ts
│   │   │   ├── player-detector.ts
│   │   │   └── video-state-detector.ts
│   │   ├── recovery/
│   │   │   ├── navigation-recovery.ts
│   │   │   ├── playback-verifier.ts
│   │   │   ├── player-recovery.ts
│   │   │   ├── recovery-manager.ts
│   │   │   ├── reload-recovery.ts
│   │   │   └── strategy-interface.ts
│   │   └── state/
│   │       └── player-state.ts
│   ├── options/
│   │   ├── options.css
│   │   ├── options.html
│   │   └── options.ts
│   ├── popup/
│   │   ├── popup.css
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── rules/
│   │   └── youtube-rules.json
│   └── shared/
│       ├── constants.ts
│       ├── logger.ts
│       ├── storage.ts
│       └── types.ts
└── tests/
    └── unit/
        ├── confidence-engine.test.ts
        ├── player-state.test.ts
        └── recovery-manager.test.ts
```
