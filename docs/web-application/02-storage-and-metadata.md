# Storage & Metadata

RoamView uses a **hybrid storage model**: PostgreSQL holds structured metadata and pointers; an S3-compatible object store holds all large binary assets (meshes, 3D Tiles, video, raw sensor captures). The API never proxies file bytes — it resolves metadata in Postgres and returns short-lived pre-signed URLs so the browser streams directly from the CDN/object store.

---

## Object Storage Layout

All keys are scoped under an organization prefix. No two tenants share a bucket prefix.

```
org/{orgId}/
  site/{siteId}/
    session/{sessionId}/
      raw/
        images/{frameIndex}.jpg
        lidar/{scanIndex}.pcd
        depth/{frameIndex}.png
      video/
        live_recording.mp4
        thumbnail.jpg
      mesh/
        dense_cloud.ply
        textured_mesh.obj
        textured_mesh.mtl
        textures/{name}.jpg
      tiles/
        tileset.json
        {level}/{x}_{y}.b3dm
        {level}/{x}_{y}.json
      preview/
        overview.jpg
        minimap.png
```

### Key conventions

| Prefix | Content | Typical size | Retention |
|--------|---------|--------------|-----------|
| `raw/` | Source sensor data from robot | 500 MB – 5 GB per session | 90 days, then cold tier |
| `video/` | Recorded live stream + thumbnail | 100 MB – 1 GB | Indefinite |
| `mesh/` | OpenMVS output (PLY, OBJ) | 50 MB – 500 MB | Indefinite |
| `tiles/` | Cesium 3D Tiles tileset | 20 MB – 2 GB | Indefinite |
| `preview/` | Low-res overview images | < 1 MB | Indefinite |

### Content types

| Extension | MIME type |
|-----------|-----------|
| `.b3dm` | `application/octet-stream` |
| `.json` (tileset) | `application/json` |
| `.ply` | `application/octet-stream` |
| `.obj` | `model/obj` |
| `.mp4` | `video/mp4` |
| `.jpg` | `image/jpeg` |
| `.pcd` | `application/octet-stream` |

---

## PostgreSQL Schema

```mermaid
erDiagram
    organizations ||--o{ users : has
    organizations ||--o{ sites : owns
    organizations ||--o{ robots : owns
    sites ||--o{ sessions : hosts
    robots ||--o{ sessions : performs
    users ||--o{ sessions : operates
    sessions ||--o{ scans : contains
    sessions ||--o{ assets : produces
    sessions ||--o{ annotations : has
    sessions ||--o{ measurements : has
    sessions ||--o| reports : generates
  assets ||--o| tilesets : "may reference"

    organizations {
        uuid id PK
        string name
        string slug
        timestamp created_at
    }

    users {
        uuid id PK
        uuid org_id FK
        string email
        string password_hash
        enum role "admin|operator|viewer|on_site"
        timestamp created_at
    }

    sites {
        uuid id PK
        uuid org_id FK
        string name
        string address
        geometry footprint "PostGIS polygon"
        jsonb floor_plans
        timestamp created_at
    }

    robots {
        uuid id PK
        uuid org_id FK
        uuid site_id FK
        string name
        string serial_number
        enum status "online|offline|charging|error"
        int battery_pct
        timestamp last_seen_at
    }

    sessions {
        uuid id PK
        uuid site_id FK
        uuid robot_id FK
        uuid operator_id FK
        enum mode "autonomous|teleop"
        enum status "recording|uploading|queued|processing|ready|failed"
        timestamp started_at
        timestamp ended_at
        jsonb metadata
    }

    scans {
        uuid id PK
        uuid session_id FK
        int sequence_number
        geometry pose "PostGIS point + heading"
        timestamp captured_at
    }

    assets {
        uuid id PK
        uuid session_id FK
        enum kind "raw_image|raw_lidar|raw_depth|video|mesh|tile|preview"
        string storage_key
        string content_type
        bigint byte_size
        string checksum_sha256
        int lod_level
        timestamp created_at
    }

    tilesets {
        uuid id PK
        uuid asset_id FK
        string root_tileset_key
        jsonb bounding_volume
        float geometric_error
        int max_lod_level
    }

    annotations {
        uuid id PK
        uuid session_id FK
        uuid author_id FK
        geometry position "PostGIS point"
        string label
        enum severity "info|warning|critical"
        text notes
        timestamp created_at
    }

    measurements {
        uuid id PK
        uuid session_id FK
        uuid author_id FK
        enum type "distance|area"
        jsonb points "array of 3D coordinates"
        float value_meters
        string label
        timestamp created_at
    }

    reports {
        uuid id PK
        uuid session_id FK
        uuid author_id FK
        string title
        jsonb content
        string pdf_storage_key
        timestamp generated_at
    }

    audit_log {
        uuid id PK
        uuid org_id FK
        uuid user_id FK
        string action
        jsonb details
        timestamp created_at
    }
```

### Indexing strategy

```sql
-- Session list per site, newest first
CREATE INDEX idx_sessions_site_captured
  ON sessions (site_id, started_at DESC);

-- Asset lookup by session and kind
CREATE INDEX idx_assets_session_kind
  ON assets (session_id, kind);

-- Spatial queries on annotations
CREATE INDEX idx_annotations_position
  ON annotations USING GIST (position);

-- Audit log per org, newest first
CREATE INDEX idx_audit_org_created
  ON audit_log (org_id, created_at DESC);
```

### Retention policy

| Data class | Hot storage | Cold/archive | Delete |
|------------|-------------|--------------|--------|
| `raw/` sensor data | 90 days | S3 Glacier after 90 days | After 1 year |
| `tiles/`, `mesh/`, `video/` | Indefinite | — | Manual only |
| `preview/` | Indefinite | — | With session |
| PostgreSQL rows | Indefinite | — | Cascade on org delete |

---

## Query Flows

### Flow 1: Load a site's session list

**Trigger:** User opens the Sessions page for a site.

1. Browser sends `GET /api/sites/{siteId}/sessions?limit=20&offset=0` with JWT.
2. API validates JWT, checks org membership and site access.
3. API queries Postgres:
   ```sql
   SELECT s.id, s.mode, s.status, s.started_at, s.ended_at,
          r.name AS robot_name, u.email AS operator_email,
          a.storage_key AS preview_key
   FROM sessions s
   JOIN robots r ON r.id = s.robot_id
   LEFT JOIN users u ON u.id = s.operator_id
   LEFT JOIN assets a ON a.session_id = s.id AND a.kind = 'preview'
   WHERE s.site_id = $1
   ORDER BY s.started_at DESC
   LIMIT 20 OFFSET 0;
   ```
4. API generates pre-signed URLs (15 min TTL) for each `preview_key`.
5. API returns JSON array with session metadata and preview URLs.
6. Browser renders session cards with thumbnails.

```mermaid
sequenceDiagram
    participant Browser
    participant API as Node.js API
    participant PG as PostgreSQL
    participant S3 as Object Storage

    Browser->>API: GET /api/sites/{siteId}/sessions
    API->>API: Validate JWT and RBAC
    API->>PG: SELECT sessions + preview assets
    PG-->>API: Session rows
    API->>S3: Generate pre-signed URLs for previews
    S3-->>API: Signed URLs
    API-->>Browser: JSON sessions with preview URLs
    Browser->>S3: GET preview.jpg (direct, via CDN)
    S3-->>Browser: Image bytes
```

---

### Flow 2: Open a session in the 3D viewer

**Trigger:** User clicks "View 3D Tour" on a ready session.

1. Browser sends `GET /api/sessions/{sessionId}/tileset` with JWT.
2. API validates access; queries Postgres for the tileset asset:
   ```sql
   SELECT t.root_tileset_key, t.bounding_volume, t.geometric_error, t.max_lod_level
   FROM tilesets t
   JOIN assets a ON a.id = t.asset_id
   WHERE a.session_id = $1 AND a.kind = 'tile';
   ```
3. API returns tileset metadata plus a pre-signed URL for `tileset.json` (1 hour TTL).
4. Browser fetches `tileset.json` directly from CDN/object store.
5. `TilesetLoader` parses the root tile, computes visible tiles from camera frustum.
6. For each visible tile, browser requests `.../tiles/{level}/{x}_{y}.b3dm` via pre-signed URL or CDN (no API round-trip per tile).
7. Three.js renders loaded tiles; `LODController` evicts distant tiles to stay within memory budget.

```mermaid
sequenceDiagram
    participant Browser
    participant Viewer as TourViewer
    participant API as Node.js API
    participant PG as PostgreSQL
    participant CDN as CDN / Object Storage

    Browser->>API: GET /api/sessions/{sessionId}/tileset
    API->>PG: SELECT tileset metadata
    PG-->>API: root_tileset_key, bounding_volume
    API-->>Browser: tileset metadata + signed tileset.json URL
    Browser->>CDN: GET tileset.json
    CDN-->>Viewer: tileset root JSON
    Viewer->>Viewer: Compute visible tiles from frustum
    loop For each visible tile
        Viewer->>CDN: GET tiles/{level}/{x}_{y}.b3dm (Range supported)
        CDN-->>Viewer: tile binary
        Viewer->>Viewer: Parse b3dm, add to Three.js scene
    end
```

---

### Flow 3: Fetch a single asset (video playback)

**Trigger:** User plays back a recorded session video.

1. Browser sends `GET /api/sessions/{sessionId}/assets?kind=video` with JWT.
2. API queries Postgres for the video asset row.
3. API returns asset metadata and a pre-signed URL (2 hour TTL).
4. Browser's `<video>` element sets `src` to the signed URL.
5. Browser sends HTTP `Range: bytes=0-` requests directly to object store for seeking.
6. No bytes pass through the Node.js API.

```mermaid
sequenceDiagram
    participant Browser
    participant API as Node.js API
    participant PG as PostgreSQL
    participant S3 as Object Storage

    Browser->>API: GET /api/sessions/{sessionId}/assets?kind=video
    API->>PG: SELECT asset WHERE kind=video
    PG-->>API: storage_key, content_type, byte_size
    API-->>Browser: asset metadata + signed URL
    Browser->>S3: GET video.mp4 (Range: bytes=0-1048575)
    S3-->>Browser: 206 Partial Content
    Browser->>S3: GET video.mp4 (Range: bytes=5242880-)
    S3-->>Browser: 206 Partial Content (seek)
```

---

## Postgres BLOB vs Object Storage — Trade-off

The original project proposal specified storing 3D maps as BLOBs in PostgreSQL. The hybrid model below is the chosen approach for the web application.

| Concern | PostgreSQL BLOB | Object Storage + Postgres metadata |
|---------|-----------------|-------------------------------------|
| HTTP Range requests | Not supported natively; requires API proxy | Native S3 Range support; browser seeks video and partial tile loads work |
| CDN caching | Cannot cache through CDN | CDN edge caches tiles and video globally |
| Connection pool pressure | Large reads tie up DB connections | DB handles only small metadata queries |
| Partial tile loading | Must read entire BLOB or implement custom chunking | Each `.b3dm` file is independently addressable |
| Backup & replication | DB backups grow with every session | Object store has independent lifecycle policies |
| Cost at scale | Expensive DB storage ($/GB) | S3 Standard ~$0.023/GB; Glacier for raw data |
| Transactional integrity | Single ACID transaction for metadata + blob | Two-phase: write to S3, then insert metadata row; compensating delete on failure |
| Query complexity | Simple (one table) | Requires join between `assets` and object key |

**Decision:** Use object storage for all assets ≥ 1 MB. PostgreSQL stores only metadata, spatial data, and relational links. The `assets` table's `storage_key` column is the single source of truth for where bytes live.

**Compensating transaction pattern:**
1. Upload bytes to S3 with a staging key.
2. Insert `assets` row with `storage_key`.
3. On DB insert failure, delete the S3 object.
4. On success, promote staging key to final key (or use the staging key directly).
