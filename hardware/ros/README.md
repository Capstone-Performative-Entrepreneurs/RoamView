> [!WARNING]
> This markdown is written with Claude's help.
# ROS 2 Lyrical Luth — Docker container

A minimal, reproducible dev container for ROS 2 **Lyrical Luth**, built on the
official `ros:lyrical-ros-base` image (Ubuntu 26.04 "Resolute Raccoon", the
Tier 1 platform for this distro).

## Files

| File               | Purpose                                                         |
|--------------------|------------------------------------------------------------------|
| `Dockerfile`       | Builds the image: ROS base + dev tools (colcon, rosdep, build-essential) |
| `entrypoint.sh`    | Sources the ROS underlay (and your workspace overlay) on every `docker run` |
| `docker-compose.yml` | One-command build/run, with your `src/` folder mounted in     |
| `.dockerignore`    | Keeps build artifacts out of the image build context             |
| `src/`             | Where your ROS 2 packages live (create this folder — it's mounted, not copied) |

## Prerequisites

- Docker Desktop (Mac/Windows) or Docker Engine (Linux), reasonably recent.
- On Windows, use WSL2 as the Docker backend.
- No local ROS install needed — everything runs inside the container.

## 1. Build the image

```bash
mkdir -p src   # your ROS 2 packages go here
docker compose build
```

This pulls `ros:lyrical-ros-base` and layers on `ros-dev-tools`,
`python3-colcon-common-extensions`, `python3-rosdep`, and basic build tools.
First build takes a few minutes; later builds are cached.

**Need RViz2 or other GUI/demo packages?** Build with the desktop variant:

```bash
docker compose build --build-arg INSTALL_DESKTOP=true
```

## 2. Run the container

```bash
docker compose run --rm ros2
```

You'll land in a bash shell inside the container at `/root/ros2_ws`, with
`/opt/ros/lyrical/setup.bash` already sourced (see `entrypoint.sh`).
Your host's `./src` folder is mounted at `/root/ros2_ws/src`, so you can edit
code with your normal editor on the host and build it inside the container.

Prefer plain `docker` commands instead of Compose?

```bash
docker build -t ros2-lyrical .
docker run -it --rm --network host \
    -v "$(pwd)/src:/root/ros2_ws/src" \
    ros2-lyrical
```

## 3. Verify the install

Inside the container:

```bash
ros2 run demo_nodes_cpp talker
```

Open a second shell into the *same* running container:

```bash
docker exec -it ros2_lyrical bash
source /opt/ros/lyrical/setup.bash
ros2 run demo_nodes_py listener
```

You should see the talker publishing messages and the listener receiving
them — this confirms both the C++ and Python APIs work.

(`docker exec` only works if the container is still running — use
`docker compose up -d` instead of `run --rm` if you want it to stay up in the
background.)

## 4. Building your own packages

Inside the container:

```bash
cd /root/ros2_ws
colcon build --symlink-install
source install/setup.bash
```

The next time you `docker compose run`, `entrypoint.sh` automatically
sources `install/setup.bash` for you if it exists, so your packages are
ready to `ros2 run` immediately.

## 5. GUI apps (RViz2, rqt, Gazebo, etc.)

You need an image built with `INSTALL_DESKTOP=true` (step 1), plus a way to
forward X11 to the container:

- **Linux host:** run `xhost +local:docker` once per session, then
  `docker compose run --rm ros2` (the compose file already mounts the X11
  socket and sets `DISPLAY`).
- **macOS:** install [XQuartz](https://www.xquartz.org/), enable
  "Allow connections from network clients" in its preferences, run
  `xhost +localhost`, and set `DISPLAY=host.docker.internal:0` before
  running compose.
- **Windows (WSL2):** recent Docker Desktop + WSLg forward GUI apps out of
  the box — no extra X server needed; just make sure you're launching from
  a WSL2 terminal, not PowerShell directly.

## Troubleshooting

- **`locale` warnings / garbled output:** the base image already sets
  `en_US.UTF-8`; if you added more `apt-get` layers and see this again,
  reinstall `locales` and re-run `locale-gen en_US.UTF-8`.
- **`rosdep update` fails during build (network):** Docker build needs
  internet access; retry the build, or add `--network=host` to
  `docker build` if you're behind a restrictive proxy.
- **Nodes on different containers can't see each other:** stick to
  `network_mode: host` (Linux only) for local multi-container setups, or
  look into ROS 2's DDS discovery configuration for bridged networks —
  `network_mode: host` doesn't work on macOS/Windows Docker Desktop, so
  there you'd publish specific ports or use a single container per system.
- **Permission errors editing files created by the container:** the
  container runs as root by default, so files it writes into the mounted
  `src/` volume will be root-owned on Linux hosts. Add a non-root user to
  the Dockerfile (with a matching UID) if that's a problem for you.

## Sources

- [Installing on Ubuntu — ROS 2 Lyrical documentation](https://docs.ros.org/en/lyrical/Get-Started/Installation/Ubuntu-Install-Debs.html)
- [Installation options — ROS 2 Lyrical documentation](https://docs.ros.org/en/lyrical/Get-Started/Installation.html)
- [`ros` official image tags (Docker Hub)](https://hub.docker.com/_/ros/tags)
