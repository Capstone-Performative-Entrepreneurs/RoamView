# Platform Constraints

This document flags **platform-specific constraints** for the RoamView mobile app, as required by the project task. It records the WebView vs native rendering decision and lists limits that affect design and implementation.

---

## WebView vs Native 3D Rendering

### Decision matrix

| Criterion | WebView (shared web viewer) | Native expo-gl + react-three-fiber |
|-----------|----------------------------|-------------------------------------|
| Code reuse | **High** — one Three.js + 3D Tiles codebase | Low — second renderer |
| Time to MVP | **Fast** — embed existing viewer | Slow — port tile loader |
| Gesture fidelity | Good (pinch/pan in WebView) | **Better** — direct GL touch |
| Performance on low-end Android | Moderate; WebView overhead | **Better** on some devices |
| Memory control | Limited; OS may kill WebView | **More control** over GL context |
| Debugging | Chrome remote debug (Android); Safari Web Inspector (iOS) | React Native debugger + Flipper |
| Maintenance | **Single viewer team** | Split web + native viewer |
| Offline tiles | Same signed-URL model | Same |

### Chosen approach (v1)

**Hybrid: WebView for 3D tour viewer; native React Native for all other screens and teleop.**

Rationale: Capstone timeline favors reusing the web viewer documented in [web 03-streaming-and-viewing.md](../web-application/03-streaming-and-viewing.md). Native `expo-gl` migration is documented as **v2** if profiling shows WebView OOM on target devices.

---

## Memory and Thermal Limits

| Platform | Typical WebView GPU budget | OS behavior |
|----------|---------------------------|-------------|
| iOS (recent iPhone) | ~128–256 MB practical | `memoryWarning` → RN should `dispose` viewer |
| iOS (older) | ~64–128 MB | Jetsam may kill app without warning |
| Android (mid-range) | Highly variable | `onTrimMemory` callbacks |
| Android (low RAM) | < 64 MB | Frequent WebView process kill |

**Mitigation:** Lower LOD defaults (see [03-streaming-and-viewing.md](./03-streaming-and-viewing.md)); unload WebView when navigating away; avoid keeping viewer mounted in background tab.

---

## Background Execution

| Scenario | iOS | Android |
|----------|-----|---------|
| Teleop video active | ~30 s then suspended unless audio background mode | Foreground service recommended for long sessions |
| Tile download | Paused when backgrounded | WorkManager can continue on unmetered network |
| Sync queue flush | Runs on next foreground | Background fetch (limited) |
| Push notification | Delivered when app killed | Delivered when app killed |

**UX:** Show "Session paused — return to app to continue teleop" when backgrounded during teleop.

---

## Permissions Matrix

| Permission | iOS | Android | Used for |
|------------|-----|---------|----------|
| Camera | `NSCameraUsageDescription` | `CAMERA` | QR pairing (F-MOB-04), optional snapshot |
| Microphone | `NSMicrophoneUsageDescription` | `RECORD_AUDIO` | Teleop two-way audio |
| Notifications | User prompt (iOS 10+) | `POST_NOTIFICATIONS` (13+) | F-MOB-01 |
| Face ID / Touch ID | `NSFaceIDUsageDescription` | `USE_BIOMETRIC` | F-MOB-03 |
| Local network | Bonjour (if LAN robot) | `NEARBY_WIFI_DEVICES` | Optional dev only |

Request permissions **in context** (e.g. mic when user enables audio on teleop), not at first launch.

---

## Network Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Cellular metering | Large tile downloads expensive | F-MOB-05 Wi-Fi-only toggle |
| Wi-Fi ↔ cellular handoff | WebRTC ICE disconnect | Auto ICE restart; user message |
| iOS ATS | HTTPS required for API/CDN | No cleartext except dev localhost |
| Android cleartext | Blocked by default | `usesCleartextTraffic` false in prod |
| High latency on 4G | Teleop drive lag | Show latency indicator; warn if > 500 ms |
| Captive portals | API calls fail | Detect and show "Sign in to Wi-Fi" |

---

## Touch and Ergonomics

| Constraint | Design response |
|------------|-----------------|
| No hover state | All actions on tap; no tooltip-on-hover |
| Minimum touch target | **44×44 pt** (Apple HIG); 48×48 dp (Material) |
| Thumb reach (phone) | E-stop and primary actions in bottom third |
| One-handed use | Fleet cards full-width; bottom tab navigation |
| Measurement precision | **Crosshair center + Confirm** instead of tap-two-points |
| Small screen | No side-by-side session compare; vertical list |
| Landscape teleop | Optional; portrait default for one-hand drive |

---

## WebView-Specific Constraints

| Issue | Platform | Mitigation |
|-------|----------|------------|
| `postMessage` size limit | Both | Chunk large annotation arrays; paginate |
| Third-party cookie blocking | iOS ITP | Do not rely on cookies; use viewer token in message |
| File access from WebView | Both | Tiles via HTTPS signed URLs, not `file://` in v1 |
| JavaScript disabled | N/A | WebView JS always enabled for viewer screen only |
| Multiple WebViews | Memory | **Single** viewer instance; unmount when leaving screen |

---

## Store Review and Release

| Topic | iOS App Store | Google Play |
|-------|---------------|-------------|
| Review time | 1–3 days typical | Hours to days |
| Background location | Not used in v1 | Not used in v1 |
| Data safety / privacy label | Declare camera, mic, analytics | Data safety form |
| Export compliance | HTTPS only; encryption registration if custom crypto | Similar |
| Test distribution | TestFlight (10k testers) | Internal / closed testing tracks |

**OTA policy:** Apple allows JS updates via Expo EAS Update if they do not change app purpose; avoid using OTA to bypass review for major feature pivots.

---

## Summary Checklist for Implementers

- [ ] WebView viewer only on Tour screen; dispose on unmount
- [ ] Never put JWT in WebView URL
- [ ] Refresh signed URLs on app resume
- [ ] Request permissions in feature context
- [ ] E-stop and teleop controls in thumb zone
- [ ] Wi-Fi-only tile setting default on for phones
- [ ] Handle offline queue and conflict UI
- [ ] Test on physical low-RAM Android device before demo
