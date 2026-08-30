# Class Diagram

Mobile client domain and infrastructure classes. Backend domain classes match [web 05-class-diagram.md](../web-application/05-class-diagram.md) where applicable.

---

## Mobile Client Classes

```mermaid
classDiagram
    class AppSession {
        +string accessToken
        +string refreshToken
        +User user
        +bool biometricEnabled
        +login(email, password) void
        +refreshTokens() void
        +unlockWithBiometric() bool
        +logout() void
    }

    class AuthStore {
        -MMKV storage
        +saveTokens(tokens) void
        +getAccessToken() string
        +clear() void
    }

    class RobotStore {
        +Robot[] robots
        +fetchFleet() void
        +subscribeTelemetry(robotId) void
        +getRobot(id) Robot
    }

    class SessionRepository {
        -SQLite db
        -CacheManager cache
        +listSessions(siteId) Session[]
        +getSession(id) Session
        +openViewer(sessionId) void
        +refreshTilesetUrls(sessionId) TilesetUrls
    }

    class CacheManager {
        -string cacheRoot
        -SQLite db
        +downloadAsset(storageKey) string
        +getLocalPath(storageKey) string
        +evictLRU(bytesToFree) void
        +getCacheSizeBytes() long
        +clearAll() void
    }

    class SyncQueue {
        -SQLite db
        +enqueue(write) void
        +flush() void
        +getPending() OfflineWrite[]
        +resolveConflict(id, resolution) void
    }

    class OfflineWrite {
        +string id
        +string sessionId
        +string kind
        +object payload
        +SyncStatus status
        +int createdAt
    }

    class ViewerBridge {
        -WebView ref
        +postMessage(msg) void
        +onMessage(handler) void
        +loadTileset(sessionId, urls) void
        +setTool(tool) void
        +dispose() void
    }

    class TeleopController {
        -RTCPeerConnection pc
        -WebSocket signaling
        +connect(robotId) void
        +disconnect() void
        +sendDrive(cmd) void
        +emergencyStop() void
        +reconnect() void
    }

    class NotificationHandler {
        +registerDevice() void
        +handlePush(payload) void
        +getInbox() Notification[]
    }

    class DeepLinkRouter {
        +parse(url) Route
        +navigateToSession(sessionId) void
    }

  class NetworkMode {
        <<enumeration>>
        WIFI_ONLY_TILES
        ALLOW_CELLULAR
    }

    class CacheState {
        <<enumeration>>
        MISS
        HIT
        DOWNLOADING
        EXPIRED
    }

    class SyncStatus {
        <<enumeration>>
        PENDING
        SYNCING
        SYNCED
        CONFLICT
    }

    AppSession --> AuthStore
    SessionRepository --> CacheManager
    SessionRepository --> SyncQueue
    SessionRepository --> ViewerBridge
    SyncQueue --> OfflineWrite
    NotificationHandler --> DeepLinkRouter
    DeepLinkRouter --> SessionRepository
```

---

## Sync Queue State Machine

```mermaid
stateDiagram-v2
    [*] --> pending : user action offline
    pending --> syncing : network available
    syncing --> synced : API 201
    syncing --> conflict : API 409
    syncing --> pending : API 5xx retry
    conflict --> synced : user resolves
    synced --> [*]
```

---

## ViewerBridge Message Types

```mermaid
classDiagram
    class BridgeMessage {
        <<interface>>
        +string type
    }

    class LoadTilesetCmd {
        +string sessionId
        +string tilesetUrl
        +string viewerToken
        +int memoryBudgetMb
    }

    class TileProgressEvent {
        +int loaded
        +int total
        +float bytesMb
    }

    class AnnotationPlacedEvent {
        +float[] position
        +string label
        +string severity
    }

    BridgeMessage <|-- LoadTilesetCmd
    BridgeMessage <|-- TileProgressEvent
    BridgeMessage <|-- AnnotationPlacedEvent
```

---

## Key Relationships

| Relationship | Cardinality | Notes |
|--------------|-------------|-------|
| SessionRepository → CacheManager | 1 : 1 | All tile paths resolved through cache |
| SessionRepository → ViewerBridge | 1 : 0..1 | Bridge only when viewer screen mounted |
| SyncQueue → OfflineWrite | 1 : * | One queue, many pending rows |
| TeleopController → RobotStore | * : 1 | Uses robot id from store |

---

## Platform-Specific Implementations

| Class | iOS | Android |
|-------|-----|---------|
| AuthStore biometric | LocalAuthentication | BiometricPrompt |
| NotificationHandler | APNs via expo-notifications | FCM |
| CacheManager filesystem | NSDocumentDirectory/cache | Context.getCacheDir() |
| TeleopController audio | AVAudioSession | AudioManager |

Details in [07-platform-constraints.md](./07-platform-constraints.md).
