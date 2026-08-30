# Class Diagram

Covers the backend domain model, service layer, and frontend viewer classes. Enums define shared state values used across layers.

---

## Domain Model

```mermaid
classDiagram
    class Organization {
        +UUID id
        +String name
        +String slug
        +DateTime createdAt
        +createSite(name, address) Site
        +inviteUser(email, role) User
    }

    class User {
        +UUID id
        +String email
        +String passwordHash
        +Role role
        +DateTime createdAt
        +hasPermission(action) bool
    }

    class Role {
        <<enumeration>>
        ADMIN
        OPERATOR
        VIEWER
        ON_SITE
    }

    class Site {
        +UUID id
        +String name
        +String address
        +Geometry footprint
        +JSON floorPlans
        +listSessions(limit, offset) Session[]
        +getRobot() Robot
    }

    class Robot {
        +UUID id
        +String name
        +String serialNumber
        +RobotStatus status
        +int batteryPct
        +DateTime lastSeenAt
        +isOnline() bool
        +canAcceptTeleop() bool
    }

    class RobotStatus {
        <<enumeration>>
        ONLINE
        OFFLINE
        CHARGING
        ERROR
    }

    class Session {
        +UUID id
        +SessionMode mode
        +SessionStatus status
        +DateTime startedAt
        +DateTime endedAt
        +JSON metadata
        +start() void
        +end() void
        +getTileset() Tileset
        +getAssets(kind) Asset[]
    }

    class SessionMode {
        <<enumeration>>
        AUTONOMOUS
        TELEOP
    }

    class SessionStatus {
        <<enumeration>>
        RECORDING
        UPLOADING
        QUEUED
        PROCESSING
        READY
        FAILED
    }

    class Scan {
        +UUID id
        +int sequenceNumber
        +Geometry pose
        +DateTime capturedAt
    }

    class Asset {
        +UUID id
        +AssetKind kind
        +String storageKey
        +String contentType
        +long byteSize
        +String checksumSha256
        +int lodLevel
        +getSignedUrl(ttlSeconds) String
    }

    class AssetKind {
        <<enumeration>>
        RAW_IMAGE
        RAW_LIDAR
        RAW_DEPTH
        VIDEO
        MESH
        TILE
        PREVIEW
    }

    class Tileset {
        +UUID id
        +String rootTilesetKey
        +JSON boundingVolume
        +float geometricError
        +int maxLodLevel
        +getRootUrl() String
    }

    class Annotation {
        +UUID id
        +Geometry position
        +String label
        +Severity severity
        +String notes
        +DateTime createdAt
        +update(label, notes) void
        +delete() void
    }

    class Severity {
        <<enumeration>>
        INFO
        WARNING
        CRITICAL
    }

    class Measurement {
        +UUID id
        +MeasurementType type
        +JSON points
        +float valueMeters
        +String label
        +DateTime createdAt
    }

    class MeasurementType {
        <<enumeration>>
        DISTANCE
        AREA
    }

    class Report {
        +UUID id
        +String title
        +JSON content
        +String pdfStorageKey
        +DateTime generatedAt
        +generate() void
        +getPdfUrl() String
    }

    Organization "1" --> "*" User : has
    Organization "1" --> "*" Site : owns
    Organization "1" --> "*" Robot : owns
    Site "1" --> "*" Session : hosts
    Robot "1" --> "*" Session : performs
    User "1" --> "*" Session : operates
    Session "1" --> "*" Scan : contains
    Session "1" --> "*" Asset : produces
    Session "1" --> "*" Annotation : has
    Session "1" --> "*" Measurement : has
    Session "1" --> "0..1" Report : generates
    Asset "1" --> "0..1" Tileset : mayHave
    User "1" --> "*" Annotation : authors
    User "1" --> "*" Measurement : authors
```

---

## Service Layer

```mermaid
classDiagram
    class SessionService {
        -db: Database
        -jobQueue: JobQueue
        +createSession(siteId, robotId, mode) Session
        +endSession(sessionId) void
        +getSession(sessionId) Session
        +listSessions(siteId, pagination) Session[]
        +updateStatus(sessionId, status) void
        +enqueueReconstruction(sessionId) void
    }

    class AssetService {
        -db: Database
        -storage: ObjectStorage
        -urlProvider: SignedUrlProvider
        +registerAsset(sessionId, kind, storageKey, metadata) Asset
        +getAsset(assetId) Asset
        +listAssets(sessionId, kind) Asset[]
        +initiateMultipartUpload(sessionId, kind) UploadHandle
        +completeMultipartUpload(handle) Asset
        +deleteAsset(assetId) void
    }

    class SignedUrlProvider {
        -storage: ObjectStorage
        +getSignedUrl(storageKey, ttlSeconds) String
        +getSignedUrls(keys, ttlSeconds) Map~String,String~
    }

    class ReconstructionJob {
        -sessionId: UUID
        -status: JobStatus
        +run() void
        -runColmap() SparseModel
        -runOpenMvs(sparse) Mesh
        -runTiler(mesh) TilesetFiles
        -uploadResults(files) void
        -updateSessionStatus(status) void
    }

    class JobStatus {
        <<enumeration>>
        PENDING
        RUNNING
        COMPLETED
        FAILED
    }

    class ReportService {
        -db: Database
        -storage: ObjectStorage
        +generateReport(sessionId, authorId) Report
        -renderPdf(report) Buffer
        -uploadPdf(buffer, sessionId) String
    }

    SessionService --> ReconstructionJob : enqueues
    AssetService --> SignedUrlProvider : uses
    ReconstructionJob --> AssetService : registers results
    ReportService --> AssetService : fetches assets
```

---

## Frontend Viewer Classes

```mermaid
classDiagram
    class TourViewer {
        -loader: TilesetLoader
        -lodController: LODController
        -measurementTool: MeasurementTool
        -annotationLayer: AnnotationLayer
        -camera: THREE.Camera
        -renderer: THREE.WebGLRenderer
        +loadSession(sessionId) void
        +setCameraMode(mode) void
        +render() void
        +dispose() void
    }

    class CameraMode {
        <<enumeration>>
        ORBIT
        PAN
        WALK
    }

    class TilesetLoader {
        -tilesRenderer: TilesRenderer
        -sessionId: String
        -rootUrl: String
        +load(tilesetUrl) void
        +getLoadedTileCount() int
        +getLoadingProgress() float
        +onTileLoaded(callback) void
        +onError(callback) void
    }

    class LODController {
        -maxSSE: float
        -memoryBudgetMb: int
        -loadedTiles: Map
        +evaluate(camera, tileset) Tile[]
        +evictExcess() void
        +setMemoryBudget(mb) void
    }

    class MeasurementTool {
        -activePoints: Vector3[]
        -mode: MeasurementType
        +activate(type) void
        +deactivate() void
        +onClick(worldPoint) void
        +getResult() Measurement
        +renderOverlay(scene) void
    }

    class AnnotationLayer {
        -annotations: Annotation[]
        -placing: bool
        +load(annotations) void
        +startPlacement() void
        +place(worldPoint, label) Annotation
        +select(annotationId) void
        +renderMarkers(scene) void
    }

    class TeleopController {
        -signalingWs: WebSocket
        -peerConnection: RTCPeerConnection
        -videoElement: HTMLVideoElement
        -driveState: DriveCommand
        +connect(robotId) void
        +disconnect() void
        +sendDriveCommand(cmd) void
        +emergencyStop() void
        +onTelemetry(callback) void
    }

    class DriveCommand {
        +float linear
        +float angular
        +bool estop
    }

    TourViewer --> TilesetLoader
    TourViewer --> LODController
    TourViewer --> MeasurementTool
    TourViewer --> AnnotationLayer
    TilesetLoader --> LODController : notifies
```

---

## Key Relationships Summary

| Relationship | Cardinality | Notes |
|--------------|-------------|-------|
| Organization → Site | 1 : * | Tenant isolation boundary |
| Site → Session | 1 : * | All sessions scoped to a site |
| Session → Asset | 1 : * | One session produces many assets |
| Asset → Tileset | 1 : 0..1 | Only `kind=tile` assets have a tileset row |
| Session → Annotation | 1 : * | Placed in viewer, persisted on save |
| TourViewer → TilesetLoader | 1 : 1 | Viewer owns exactly one loader |
| SessionService → ReconstructionJob | 1 : 0..1 | One job per session after upload |

---

## State Machines

### SessionStatus transitions

```mermaid
stateDiagram-v2
    [*] --> recording : session.start()
    recording --> uploading : session.end()
    uploading --> queued : upload complete
    queued --> processing : worker picks up job
    processing --> ready : pipeline success
    processing --> failed : pipeline error
    failed --> queued : retry
    ready --> [*]
```

### RobotStatus transitions

```mermaid
stateDiagram-v2
    [*] --> offline
    offline --> online : heartbeat received
    online --> charging : dock detected
    charging --> online : undock
    online --> offline : heartbeat timeout
    online --> error : fault reported
    error --> offline : fault cleared
```
