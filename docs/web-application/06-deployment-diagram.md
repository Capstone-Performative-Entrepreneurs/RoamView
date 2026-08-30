# Deployment Diagram

Physical and logical deployment of RoamView components across the robot, client browser, CDN edge, and cloud VPC. Trust boundaries, protocols, and ports are annotated.

---

## Deployment Overview

```mermaid
flowchart TB
    subgraph robotZone ["Trust Boundary: Robot (On-Site Network)"]
        subgraph rpi ["Raspberry Pi 5"]
            ROS2["ROS 2 Stack\n(Nav2, SLAM, sensor drivers)"]
            RobotAgent["Robot Agent\n(upload, WebRTC, telemetry)"]
            CamDriver["Camera Driver\n(RPi Camera Module 3)"]
            DepthCam["OAK-D Lite Driver"]
            LiDAR["LiDAR Driver\n(Waveshare D500)"]
        end
        subgraph mcu ["ESP32 MCU"]
            MotorCtrl["Motor Controller"]
            SensorPoll["Sensor Polling\n(IMU, encoders)"]
        end
        Dock["Charging Dock\n(IR beacon)"]
    end

    subgraph clientZone ["Trust Boundary: Client (Public Internet)"]
        Browser["Web Browser\n(React SPA)"]
    end

    subgraph cdnZone ["Trust Boundary: CDN (Public)"]
        CDNEdge["CDN Edge PoP\n(tile + video cache)"]
    end

    subgraph cloudZone ["Trust Boundary: Cloud VPC (Private)"]
        subgraph publicSubnet ["Public Subnet"]
            ALB["Application Load Balancer\n:443 HTTPS / :443 WSS"]
            TURNServer["TURN Server\n:3478 UDP / :5349 TLS"]
        end
        subgraph privateSubnet ["Private Subnet"]
            APIContainer["API Containers\n(Node.js x N)"]
            MediaContainer["Media/Signaling Container\n(Node.js WebSocket)"]
            WorkerContainer["Reconstruction Workers\n(GPU, COLMAP + OpenMVS)"]
        end
        subgraph dataSubnet ["Data Subnet (no internet)"]
            PostgresDB[("Managed PostgreSQL\n:5432")]
            RedisQueue[("Redis / SQS\n:6379 / :443")]
        end
        ObjBucket[("Object Storage Bucket\n(S3-compatible)")]
    end

    CamDriver --> ROS2
    DepthCam --> ROS2
    LiDAR --> ROS2
    SensorPoll -->|"UART serial"| ROS2
    ROS2 --> RobotAgent
    RobotAgent -->|"motor commands"| MotorCtrl
    RobotAgent -->|"IR homing signal"| Dock

    Browser -->|"HTTPS :443\nREST + JWT"| ALB
    Browser -->|"WSS :443\nWebRTC signaling"| ALB
    Browser -->|"SRTP/UDP :3478\nWebRTC media"| TURNServer
    Browser -->|"HTTPS :443\nRange requests"| CDNEdge

    ALB --> APIContainer
    ALB --> MediaContainer

    APIContainer -->|"SQL :5432"| PostgresDB
    APIContainer -->|"S3 API :443"| ObjBucket
    APIContainer -->|"enqueue :6379"| RedisQueue

    MediaContainer -->|"relay commands"| RobotAgent

    RedisQueue --> WorkerContainer
    WorkerContainer -->|"SQL :5432"| PostgresDB
    WorkerContainer -->|"S3 API :443"| ObjBucket

    CDNEdge -->|"origin pull :443"| ObjBucket

    RobotAgent -->|"HTTPS :443\nmultipart upload"| ObjBucket
    RobotAgent -->|"HTTPS :443\nsession API"| ALB
    RobotAgent -->|"WSS :443\nsignaling"| ALB
    RobotAgent -->|"SRTP/UDP :3478"| TURNServer
```

---

## Node Descriptions

### Robot (On-Site Network)

| Node | Hardware | Software | Role |
|------|----------|----------|------|
| Raspberry Pi 5 | 4 GB RAM, WiFi | Ubuntu 22.04, ROS 2 Humble | SLAM, navigation, video encoding, cloud upload |
| ESP32 MCU | — | FreeRTOS firmware | Real-time motor control, IMU/encoder polling |
| Charging Dock | IR beacon emitter | — | Autonomous homing and charging |
| Waveshare D500 LiDAR | 360° 2D scan | ROS 2 driver node | SLAM input, obstacle detection |
| OAK-D Lite | RGB + depth | DepthAI SDK | 3D mapping input |
| RPi Camera Module 3 Wide | 1080p | libcamera / GStreamer | Live teleop video feed |

**Network:** Robot connects to site WiFi. Outbound HTTPS/WSS to cloud only; no inbound ports opened on site firewall.

---

### Client Browser

| Property | Value |
|----------|-------|
| Minimum browser | Chrome 90+, Firefox 88+, Safari 15+ |
| Required APIs | WebGL 2.0, WebRTC, WebSocket, Fetch (Range) |
| Deployment | Static files served from CDN or ALB (React build) |
| Auth | JWT stored in `httpOnly` cookie or `sessionStorage` |

---

### CDN Edge

| Property | Value |
|----------|-------|
| Provider | CloudFront, Cloudflare, or equivalent |
| Cached paths | `/org/*/site/*/session/*/tiles/**`, `/org/*/site/*/session/*/video/**` |
| Cache TTL | 1 year (immutable content-addressed tiles) |
| Range support | Required for video seeking |
| Origin | Object storage bucket (private, OAI/OAC access only) |

---

### Cloud VPC

#### Public Subnet

| Service | Container | Ports | Scaling |
|---------|-----------|-------|---------|
| Application Load Balancer | AWS ALB / nginx | 443 (HTTPS), 443 (WSS) | Managed |
| TURN Server | coturn | 3478 UDP, 5349 TLS | 1–2 instances |

#### Private Subnet

| Service | Container image | Ports | Scaling |
|---------|----------------|-------|---------|
| API | `roamview/api:latest` | 3000 (internal) | 2–8 replicas (CPU) |
| Media/Signaling | `roamview/media:latest` | 3001 (internal) | 2–4 replicas (CPU) |
| Reconstruction Worker | `roamview/worker:latest` | — (no inbound) | 0–4 replicas (GPU, scale-to-zero) |

#### Data Subnet

| Service | Type | Ports | Notes |
|---------|------|-------|-------|
| PostgreSQL | Managed (RDS / Cloud SQL) | 5432 | Private subnet only; no public IP |
| Redis / SQS | Managed | 6379 / 443 | Job queue; private subnet only |
| Object Storage | S3 / GCS / MinIO | 443 | Private bucket; CDN OAI access |

---

## Trust Boundaries

```mermaid
flowchart LR
    subgraph untrusted ["Untrusted: Public Internet"]
        Browser
    end
    subgraph semiTrusted ["Semi-Trusted: CDN"]
        CDNEdge
    end
    subgraph trusted ["Trusted: Cloud VPC"]
        APIContainer
        PostgresDB
        ObjBucket
    end
    subgraph siteNetwork ["Site Network (untrusted inbound)"]
        RobotAgent
    end

    Browser -->|"JWT required"| APIContainer
    Browser -->|"pre-signed URL only"| CDNEdge
    CDNEdge -->|"OAI/OAC, read-only"| ObjBucket
    RobotAgent -->|"robot API key"| APIContainer
    RobotAgent -->|"IAM role, write-only"| ObjBucket
```

| Boundary | Authentication | Authorization |
|----------|---------------|---------------|
| Browser → API | JWT Bearer token | RBAC per org/site |
| Browser → CDN | Pre-signed URL (time-limited) | URL encodes object key + expiry |
| Browser → TURN | ICE username/password (short-lived) | Generated by signaling server |
| Robot → API | Robot API key (per-device) | Scoped to assigned org/site |
| Robot → Object Storage | IAM role (write to `raw/` prefix only) | Least-privilege policy |
| Worker → Object Storage | IAM role (read `raw/`, write `tiles/`/`mesh/`) | Least-privilege policy |
| API → PostgreSQL | DB credentials (Secrets Manager) | Application-level RBAC |

---

## Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|----------------|
| `dev` | Local development | Docker Compose: Postgres, MinIO, Redis, API, worker (CPU only) |
| `staging` | Integration testing, demo | Single-region cloud VPC; 1 API replica; CPU worker |
| `prod` | Production | Multi-AZ VPC; auto-scaling API; GPU workers; CDN enabled |

### Dev environment (Docker Compose)

```yaml
# Simplified — not a committed file, for reference only
services:
  postgres:   { image: postgres:16, ports: ["5432:5432"] }
  minio:      { image: minio/minio, ports: ["9000:9000"] }
  redis:      { image: redis:7, ports: ["6379:6379"] }
  api:        { build: ./api, ports: ["3000:3000"] }
  worker:     { build: ./worker }  # CPU only in dev
  coturn:     { image: coturn/coturn, ports: ["3478:3478/udp"] }
```

---

## Port Reference

| Port | Protocol | Service | Direction |
|------|----------|---------|-----------|
| 443 | HTTPS | ALB → API, Browser → CDN | Inbound to cloud |
| 443 | WSS | ALB → Media/Signaling | Inbound to cloud |
| 3478 | UDP | TURN (STUN binding) | Inbound to cloud |
| 5349 | TLS | TURN (TLS) | Inbound to cloud |
| 5432 | TCP | PostgreSQL | Internal VPC only |
| 6379 | TCP | Redis | Internal VPC only |
| 3000 | TCP | API container | Internal VPC only |
| 3001 | TCP | Media container | Internal VPC only |
| — | UART | ESP32 ↔ RPi 5 | On-robot only |

---

## Scaling Considerations

| Component | Bottleneck | Scale strategy |
|-----------|-----------|----------------|
| API containers | Concurrent REST requests | Horizontal: 2–8 replicas behind ALB |
| Media/Signaling | Concurrent WebRTC sessions | Horizontal: 2–4 replicas; sticky sessions |
| Reconstruction Worker | GPU memory, COLMAP runtime | Scale-to-zero; burst to 4 GPU instances on queue depth |
| Object Storage | None (managed) | Unlimited; lifecycle rules for cost |
| PostgreSQL | Session list queries | Read replica for reporting; connection pooling (PgBouncer) |
| CDN | None (managed) | Global edge; no action needed |
