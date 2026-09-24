# Theory — The Interview Bible

A complete reference of every concept, design decision, architectural pattern, and technical problem solved in **YT Shield**. Formatted for interview preparation, technical discussions, and code architecture walkthroughs.

---

## 1. Core Architecture & Tech Stack

### Technology Stack Decisions

| Technology | Choice Rationale & Architectural Tradeoffs |
| :--- | :--- |
| **Manifest V3 (MV3)** | Required for all modern Chromium extensions. Replaces persistent background pages with ephemeral **Service Workers** (`background/service-worker.js`), replaces `webRequestBlocking` with declarative filtering (`declarativeNetRequest`), and enforces tighter security models. |
| **TypeScript** | Eliminates runtime messaging type mismatches between popup, content script, and service worker. Enforces strict types on `ExtensionMessage`, `ShieldSettings`, and `PlayerState`. |
| **Vite 6** | Extremely fast bundling with Rollup under the hood. Configured with a dedicated dual-target pipeline: standard ES Module chunks for popup/options/background, and a dedicated **IIFE library bundle** for `content.js` to ensure 100% compliance with content script execution sandboxes. |
| **Vanilla CSS with CSS Variables** | Zero runtime CSS dependencies. Enables instantaneous rendering, seamless native system dark/light mode switching (`@media (prefers-color-scheme: dark)`), and pixel-perfect 60fps UI animations. |

---

## 2. Design Patterns & Engineering Concepts

### 1. Finite State Machine (FSM) Pattern
- **Where**: [`src/content/state/player-state.ts`](file:///c:/Users/prati/OneDrive/Desktop/YT-Shield/src/content/state/player-state.ts)
- **Why**: YouTube's DOM changes asynchronously dozens of times per second (SPA navigations, dynamic ad insertions, buffering, resolution changes). Without a state machine, race conditions occur where multiple asynchronous callbacks attempt conflicting video manipulations simultaneously.
- **How**: `PlayerStateMachine` defines strict allowed transitions:
  ```typescript
  private allowedTransitions: Record<PlayerState, PlayerState[]> = {
    IDLE: ['LOADING', 'PLAYING', 'PAUSED', 'SUSPICIOUS', 'AD_DETECTED'],
    AD_DETECTED: ['RECOVERING', 'PLAYING', 'PAUSED', 'RECOVERED', 'FAILED', 'IDLE'],
    RECOVERING: ['RECOVERED', 'FAILED', 'AD_DETECTED', 'IDLE'],
    // ...
  };
  ```
  Any attempt to jump to an invalid state is blocked and logged, preserving application stability.

### 2. Strategy Pattern (Recovery Pipeline)
- **Where**: [`src/content/recovery/recovery-manager.ts`](file:///c:/Users/prati/OneDrive/Desktop/YT-Shield/src/content/recovery/recovery-manager.ts) & [`src/content/recovery/player-recovery.ts`](file:///c:/Users/prati/OneDrive/Desktop/YT-Shield/src/content/recovery/player-recovery.ts)
- **Why**: Not all ads or playback freezes can be resolved the same way. The Strategy pattern decouples individual recovery mechanisms into independent classes sharing a common interface (`RecoveryStrategy`).
- **Escalation Levels**:
  1. **Level 1 (Least Disruptive)**: `PlayerRecovery` — Mute, set `playbackRate = 16.0`, jump `currentTime` to end, and trigger synthetic skip button clicks.
  2. **Level 2 (Moderately Disruptive)**: `NavigationRecovery` — Re-seek through YouTube's player API or re-initialize playback at the last saved timestamp.
  3. **Level 3 (Most Disruptive / Last Resort)**: `ReloadRecovery` — Page reload preserving video ID and start timestamp query parameter (`&t=X`).

### 3. Bayesian Independent Probability Aggregation (Confidence Engine)
- **Where**: [`src/content/detection/confidence-engine.ts`](file:///c:/Users/prati/OneDrive/Desktop/YT-Shield/src/content/detection/confidence-engine.ts)
- **Concept**: Instead of relying on a single brittle DOM selector that YouTube could rename tomorrow, the extension calculates a weighted cumulative confidence score from multiple detectors (DOM, Player classes, Video duration anomalies, Navigation patterns).
- **Formula**:
  $$\text{Confidence} = 1 - \prod_{i=1}^{n} (1 - c_i)$$
  where $c_i$ is the normalized confidence of each signal ($0 \le c_i \le 1$).
  If detector A reports 75% confidence and detector B reports 60% confidence:
  $$P(\text{ad}) = 1 - (1 - 0.75)(1 - 0.60) = 1 - (0.25 \times 0.40) = 1 - 0.10 = 90\%$$

### 4. Synthetic Pointer Event Dispatching
- **Concept**: Modern web applications (especially Google/YouTube) attach event handlers that verify whether click interactions originate from a user gesture (`event.isTrusted`) or test for mouse coordinate properties.
- **Implementation**: Instead of relying solely on element `.click()`, the extension synthesizes bubbling mouse events:
  ```typescript
  el.click();
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  ```

### 5. Declarative Net Request (MV3 DNR) vs. Content Script Blocking
- **Concept**: MV3 phased out `chrome.webRequest.onBeforeRequest` with blocking capabilities for security and performance reasons.
- **DNR Engine**: Rules are compiled statically into the browser engine. The browser blocks tracking requests (such as DoubleClick ad calls and telemetry pings) at the C++ network layer before they even reach JavaScript memory, resulting in near-zero CPU overhead.

---

## 3. High-Value Interview Questions & Answers

### Q1: Why did `Uncaught SyntaxError: Cannot use import statement outside a module` happen in `content.js`, and how did you resolve it?
> **Answer**:
> "Chrome content scripts run inside an isolated world of the webpage and by default are loaded as traditional scripts rather than ES modules. When Vite bundled the project with multiple entry points, it extracted shared utilities (like `storage.ts` and `logger.ts`) into a common chunk and placed ES `import ... from '../chunks/...'` statements at the head of `content.js`. Chrome rejected this because content scripts do not parse ES module imports.
> 
> To solve this, I configured Vite with a dedicated build target using library mode (`formats: ['iife']`). This bundles all dependencies inline into a self-executing closure `(function(){ ... })()`, producing a standalone file with zero external imports while still allowing the popup, options page, and background worker to benefit from code-splitting."

### Q2: Why were actual YouTube videos getting fast-forwarded and skipped instead of the ads? How did you isolate and fix this bug?
> **Answer**:
> "In single-page applications like YouTube, DOM nodes created during an ad sequence (such as `.ytp-ad-text` or skip button containers) are often retained in the DOM in a detached or hidden state long after the ad has completed.
> 
> The initial detection logic used simple `document.querySelector` existence checks without verifying element visibility or player class ownership. As a result, once an ad played, the check remained persistently true for the rest of the session, causing the real video to run at 16x speed and seek to the end.
> 
> The fix was two-fold:
> 1. Strict Active Player Verification: We now check whether YouTube's active player container (`#movie_player`) explicitly carries the `ad-showing` or `ad-interrupting` classes.
> 2. Guaranteed Restoration: When the active ad flag becomes false, we immediately and unconditionally reset `video.playbackRate = 1.0` and `video.muted = false`."

### Q3: Why did skip buttons disappear when protection was turned ON?
> **Answer**:
> "To prevent visual flicker from companion ads and sponsored banner overlays, the content script injected high-priority global CSS rules. However, the rule included:
> ```css
> .ytp-ad-overlay-container, .ytp-ad-player-overlay-layout { display: none !important; }
> ```
> Modern YouTube renders its skip button component inside `.ytp-ad-player-overlay-layout`. By applying `display: none !important` to that container, YouTube's skip button was completely removed from the layout hierarchy, preventing the user or scripts from interacting with it.
> 
> Removing player overlay containers from the injected CSS and keeping the rule scoped strictly to promotional feeds and masthead containers (`#player-ads`, `ytd-ad-slot-renderer`, `#masthead-ad`) resolved the issue."

### Q4: How do you handle YouTube's Single Page App (SPA) navigations?
> **Answer**:
> "YouTube does not trigger traditional browser page reloads when a user clicks a new video; instead, it uses internal custom events via its polymer framework: `yt-navigate-start` and `yt-navigate-finish`, alongside standard HTML5 `popstate` events.
> 
> In `content.ts`, we listen to both `yt-navigate-finish` and `popstate`, extract the new video ID from the URL (`v=XYZ`), reset the recovery manager attempt counters, and re-bind listeners to the active `<video>` element."

### Q5: How is loop protection implemented to prevent infinite recovery or reload loops?
> **Answer**:
> "Recovery mechanisms can be dangerous if YouTube modifies its internal player API. To prevent the extension from endlessly refreshing or seeking:
> 1. **Exponential Cooldown**: `canAttemptRecovery` enforces a minimum cooldown window between attempts.
> 2. **Attempt Capping**: Each video session tracks `attemptCount` against `maxAttempts` (default: 5).
> 3. **Session Storage Reload Marker**: Before invoking a reload recovery, a timestamp marker is placed in `sessionStorage.setItem('yt_shield_reloaded', Date.now())`. If the page reloads and encounters another error within 10 seconds, reload recovery is suppressed."

---

## 4. Glossary of Key Terms

| Term | Technical Definition |
| :--- | :--- |
| **Manifest V3** | Chrome's latest extension manifest specification featuring declarative permissions, service workers, and enhanced privacy policies. |
| **Declarative Net Request (DNR)** | An API allowing extensions to block or modify network requests by specifying rules declaratively, executed natively in C++ rather than JS. |
| **Isolated World** | A private execution environment for content scripts that shares the DOM with the host page but has isolated JavaScript execution contexts, variables, and prototypes. |
| **IIFE** | Immediately Invoked Function Expression `(() => {})()`. Used to encapsulate code within local scope, preventing namespace pollution and avoiding ES Module requirements. |
| **MutationObserver** | A native Web API providing the ability to watch for changes being made to the DOM tree with minimal CPU overhead compared to continuous DOM polling. |
| **Bayesian Combination** | Combining probabilistic evidence from multiple independent sources to compute a posterior belief probability. |
