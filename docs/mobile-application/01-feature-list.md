# Feature List

Features are mapped against the web application feature IDs in [web 01-feature-list.md](../web-application/01-feature-list.md). Each web feature is marked **Full**, **Reduced**, or **Not on mobile**, with a reason when reduced. Mobile-only features use the `F-MOB-*` prefix.

**Priority legend:** `MVP` = first demo; `v1` = production; `stretch` = post-v1.

**Parity legend:** `Full` = same capability as web; `Reduced` = subset or adapted UX; `N/A` = not applicable on mobile.

---

## Web Parity Matrix

### Authentication & Access Control

| Web ID | Feature | Mobile parity | Notes |
|--------|---------|---------------|-------|
| F-AUTH-01 | Email/password sign-in | Full | MVP |
| F-AUTH-02 | Organization creation | Reduced | View/join only on mobile; create org deferred to web admin |
| F-AUTH-03 | RBAC: Admin, Operator, Viewer, On-Site | Full | MVP |
| F-AUTH-04 | Invite via email link | Full | Deep link opens app if installed |
| F-AUTH-05 | SSO SAML/OIDC | N/A | Enterprise admin configures on web |
| F-AUTH-06 | Audit log | Reduced | View recent activity; full audit on web |

### Site & Fleet Management

| Web ID | Feature | Mobile parity | Notes |
|--------|---------|---------------|-------|
| F-FLEET-01 | Register sites | Reduced | View sites; registration on web |
| F-FLEET-02 | Register robots | Reduced | View + QR pair (F-MOB-04); full registration on web |
| F-FLEET-03 | Real-time robot status | Full | MVP; push on status change (F-MOB-01) |
| F-FLEET-04 | Schedule autonomous runs | Reduced | View schedule; create/edit on web |
| F-FLEET-05 | Fleet overview dashboard | Full | MVP; single-column cards for thumb reach |
| F-FLEET-06 | Geofence configuration | N/A | Admin task on web |

### Live Teleoperation

| Web ID | Feature | Mobile parity | Notes |
|--------|---------|---------------|-------|
| F-TELEOP-01 | Connect and manual control | Full | MVP; native WebRTC + on-screen joystick |
| F-TELEOP-02 | Live HD video | Full | MVP |
| F-TELEOP-03 | Virtual joystick drive | Full | MVP; no keyboard on phone |
| F-TELEOP-04 | Two-way audio | Full | v1; requires mic permission |
| F-TELEOP-05 | Telemetry sidebar | Reduced | Collapsible strip; full detail on expand |
| F-TELEOP-06 | Battery / dock indicator | Full | MVP |
| F-TELEOP-07 | Emergency stop | Full | MVP; fixed thumb-zone button |
| F-TELEOP-08 | Session recording toggle | Full | MVP |
| F-TELEOP-09 | Viewer mode (watch-only) | Full | v1 |

### Session Lifecycle

| Web ID | Feature | Mobile parity | Notes |
|--------|---------|---------------|-------|
| F-SESSION-01 | Session record on start | Full | System |
| F-SESSION-02 | Robot upload to cloud | N/A | Robot-side; not mobile client |
| F-SESSION-03 | Reconstruction status tracking | Full | MVP |
| F-SESSION-04 | Notify on completion | Full | v1 via F-MOB-01 push |
| F-SESSION-05 | Retry/cancel reconstruction | Reduced | Retry only; cancel on web |
| F-SESSION-06 | Session metadata | Full | MVP |

### 3D Tour Viewer

| Web ID | Feature | Mobile parity | Notes |
|--------|---------|---------------|-------|
| F-VIEW-01 | Open session in 3D viewer | Full | MVP; WebView loads shared web viewer |
| F-VIEW-02 | Navigate scene (orbit, pan, zoom) | Full | MVP; touch gestures |
| F-VIEW-03 | Progressive tile LOD | Full | MVP; lower memory budget (see streaming doc) |
| F-VIEW-04 | Distance measurement | Reduced | v1; crosshair + confirm (44pt targets) |
| F-VIEW-05 | Area measurement | N/A | stretch; poor precision on small screen |
| F-VIEW-06 | Annotations | Full | v1; bottom sheet UI |
| F-VIEW-07 | Floor/level selector | Full | v1; picker in bottom sheet |
| F-VIEW-08 | Minimap | Reduced | v1; small overlay; tap to expand |
| F-VIEW-09 | Tile loading progress | Full | MVP |

### Historical Comparison & Reports

| Web ID | Feature | Mobile parity | Notes |
|--------|---------|---------------|-------|
| F-HIST-01 | Session list per site | Full | MVP |
| F-HIST-02 | Side-by-side comparison | N/A | v1+; screen too narrow |
| F-HIST-03 | Overlay diff | N/A | Web only |
| F-HIST-04 | Timeline scrubber | Reduced | v1; vertical list instead of scrubber |
| F-HIST-05 | Thumbnail preview | Full | v1 |
| F-REPORT-01 | Generate report | Reduced | v1; view + share; generate on web |
| F-REPORT-02 | Export PDF | Full | v1; share sheet |
| F-REPORT-03 | Report content | Full | v1 |
| F-REPORT-04 | Share via link | Full | v1; system share sheet |
| F-NOTIF-01 | In-app notification bell | Full | v1; tab badge + list |
| F-NOTIF-02 | Email notification | N/A | Server-side; not mobile UI |
| F-NOTIF-03 | Audit log | Reduced | View only |

---

## Mobile-Only Features

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-MOB-01 | Push notifications: scan complete, robot alerts | All | v1 | NotificationHandler, FCM/APNs |
| F-MOB-02 | Offline session cache; view previously opened tours | Operator, Viewer | v1 | CacheManager, SyncQueue |
| F-MOB-03 | Biometric unlock (Face ID / fingerprint) | All | v1 | AuthStore, secure enclave |
| F-MOB-04 | QR-code robot pairing via device camera | Admin, Operator | v1 | Fleet module, expo-camera |
| F-MOB-05 | Cellular data guard; Wi-Fi-only tile download toggle | All | v1 | Settings, NetworkMode |
| F-MOB-06 | Deep links from notification into specific session | All | v1 | DeepLinkRouter |

---

## Summary Counts

| Category | Full | Reduced | N/A | Mobile-only |
|----------|------|---------|-----|-------------|
| Web features | 28 | 14 | 8 | — |
| F-MOB-* | — | — | — | 6 |

---

## Traceability

| Diagram | Covers |
|---------|--------|
| [Component](./04-component-diagram.md) | All native modules + WebView |
| [Class](./05-class-diagram.md) | F-SESSION-*, F-VIEW-*, F-MOB-02 |
| [Deployment](./06-deployment-diagram.md) | F-MOB-01, F-TELEOP-*, push infra |
| [Platform Constraints](./07-platform-constraints.md) | F-VIEW-* (WebView), F-TELEOP-* (background) |
