# Feature List

Features are grouped by domain. Each entry has a stable ID, user-facing description, actor role, priority, and traceability to architecture elements documented in the component, class, and deployment diagrams.

**Priority legend:** `MVP` = required for first demo; `v1` = first production release; `stretch` = post-v1 enhancement.

---

## Authentication & Access Control

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-AUTH-01 | Email/password sign-up and sign-in | All users | MVP | Auth Service, React Auth module |
| F-AUTH-02 | Organization (tenant) creation and membership | Admin | MVP | Organization, User, Role |
| F-AUTH-03 | Role-based access: Admin, Operator, Viewer, On-Site | Admin | MVP | Auth Service, RBAC middleware |
| F-AUTH-04 | Invite users to an organization via email link | Admin | v1 | Auth Service |
| F-AUTH-05 | SSO via SAML/OIDC (enterprise) | Admin | stretch | Auth Service, IdP integration |
| F-AUTH-06 | Audit log of sign-ins and permission changes | Admin | v1 | audit_log table, Audit Service |

---

## Site & Fleet Management

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-FLEET-01 | Register and name physical sites (addresses, floor plans) | Admin, Operator | MVP | Site, Asset Service |
| F-FLEET-02 | Register robots and assign them to sites | Admin | MVP | Robot, FleetControl module |
| F-FLEET-03 | Real-time robot status: online/offline, battery %, docked/charging | Operator, Viewer | MVP | Robot Agent, WebSocket telemetry |
| F-FLEET-04 | Schedule autonomous inspection runs (cron-style) | Operator | v1 | Session Service, job queue |
| F-FLEET-05 | Fleet overview dashboard with status cards per robot | Operator, Viewer | MVP | FleetControl module, Dashboard |
| F-FLEET-06 | Geofence and no-go zone configuration per site | Admin, Operator | v1 | Site geometry, Nav2 integration |

---

## Live Teleoperation

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-TELEOP-01 | Connect to a robot and take manual control | Operator | MVP | TeleopController, Media/Signaling Service |
| F-TELEOP-02 | Live HD video stream (low latency) | Operator, Viewer | MVP | WebRTC, Robot Agent |
| F-TELEOP-03 | Virtual joystick / keyboard drive controls | Operator | MVP | TeleopController, WebSocket commands |
| F-TELEOP-04 | Two-way audio between remote operator and on-site personnel | Operator, On-Site | v1 | WebRTC audio tracks |
| F-TELEOP-05 | Live telemetry sidebar: speed, heading, IMU tilt, encoder distance | Operator | MVP | WebSocket telemetry channel |
| F-TELEOP-06 | Battery level and docking status indicator | Operator | MVP | Robot telemetry |
| F-TELEOP-07 | Emergency stop button (immediate halt) | Operator | MVP | TeleopController, MCU motor halt |
| F-TELEOP-08 | Session recording toggle (start/stop capture) | Operator | MVP | Session Service, Robot Agent |
| F-TELEOP-09 | Viewer mode (watch-only, no drive controls) | Viewer | v1 | RBAC gate on TeleopController |

---

## Session Lifecycle

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-SESSION-01 | Create a session record when teleop or autonomous run starts | System | MVP | Session, SessionService |
| F-SESSION-02 | Upload raw sensor data (images, LiDAR, depth) from robot to cloud | System | MVP | Robot Agent, Asset Service, Object Storage |
| F-SESSION-03 | Track reconstruction job status: queued → processing → ready → failed | Operator, Viewer | MVP | ReconstructionJob, sessions.status |
| F-SESSION-04 | Notify user when reconstruction completes | Operator, Viewer | v1 | Notification Service |
| F-SESSION-05 | Retry or cancel a failed reconstruction job | Operator | v1 | ReconstructionJob, job queue |
| F-SESSION-06 | Session metadata: start/end time, mode (autonomous/teleop), robot, operator | All | MVP | Session, Scan |

---

## 3D Tour Viewer

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-VIEW-01 | Open a completed session in the 3D tour viewer | Viewer, Operator | MVP | TourViewer, TilesetLoader |
| F-VIEW-02 | Navigate the 3D scene (orbit, pan, zoom, walk mode) | Viewer, Operator | MVP | TourViewer, Three.js camera |
| F-VIEW-03 | Progressive tile loading with LOD based on camera position | Viewer, Operator | MVP | LODController, Cesium 3D Tiles |
| F-VIEW-04 | Real-world distance measurement tool (point-to-point) | Operator, Viewer | v1 | MeasurementTool, Measurement |
| F-VIEW-05 | Area measurement tool (polygon) | Operator | stretch | MeasurementTool |
| F-VIEW-06 | Place and edit annotations (pin, text, severity tag) | Operator | v1 | AnnotationLayer, Annotation |
| F-VIEW-07 | Floor/level selector for multi-story sites | Viewer, Operator | v1 | Tileset bounding volumes |
| F-VIEW-08 | Minimap showing current camera position in floor plan | Viewer, Operator | v1 | TourViewer overlay |
| F-VIEW-09 | Loading progress indicator while tiles stream in | Viewer, Operator | MVP | TilesetLoader state |

---

## Historical Comparison & Progress Tracking

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-HIST-01 | List all sessions for a site, sorted by date | Viewer, Operator | MVP | SessionService, sessions index |
| F-HIST-02 | Side-by-side comparison of two sessions (split viewer) | Operator | v1 | TourViewer dual-pane mode |
| F-HIST-03 | Overlay diff highlighting changes between sessions | Operator | stretch | Reconstruction Worker diff tool |
| F-HIST-04 | Timeline scrubber across session dates | Viewer, Operator | v1 | Sessions page, date filter |
| F-HIST-05 | Thumbnail preview per session | Viewer, Operator | v1 | Asset (preview image) |

---

## Reports & Export

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-REPORT-01 | Generate inspection report from a session (annotations + measurements) | Operator | v1 | Report, Report Service |
| F-REPORT-02 | Export report as PDF | Operator, Viewer | v1 | Report Service, PDF renderer |
| F-REPORT-03 | Include session metadata, screenshots, and measurement table in report | Operator | v1 | Report template |
| F-REPORT-04 | Share report via time-limited link | Operator | stretch | SignedUrlProvider |

---

## Notifications & Audit

| ID | Feature | Actor | Priority | Implements |
|----|---------|-------|----------|------------|
| F-NOTIF-01 | In-app notification bell for job completion and robot alerts | All | v1 | Notification Service |
| F-NOTIF-02 | Email notification for scheduled scan completion | Operator | v1 | Notification Service, email provider |
| F-NOTIF-03 | Immutable audit log of all user actions (view, annotate, export) | Admin | v1 | audit_log table |

---

## Feature Count Summary

| Priority | Count |
|----------|-------|
| MVP | 22 |
| v1 | 18 |
| stretch | 5 |
| **Total** | **45** |

---

## Traceability Matrix (Diagram Elements)

| Diagram | Covers Features |
|---------|----------------|
| [Component Diagram](./04-component-diagram.md) | All — maps features to services and modules |
| [Class Diagram](./05-class-diagram.md) | F-SESSION-*, F-VIEW-*, F-HIST-*, F-REPORT-* |
| [Deployment Diagram](./06-deployment-diagram.md) | F-TELEOP-*, F-SESSION-02, F-VIEW-03 |
| [Storage & Metadata](./02-storage-and-metadata.md) | F-SESSION-*, F-HIST-*, F-VIEW-* |
| [Streaming & Viewing](./03-streaming-and-viewing.md) | F-TELEOP-02, F-VIEW-*, F-SESSION-03 |
