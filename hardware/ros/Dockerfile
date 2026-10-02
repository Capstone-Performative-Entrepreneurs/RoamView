# syntax=docker/dockerfile:1

# -----------------------------------------------------------------------------
# ROS 2 Lyrical Luth development container
# Base: the official "ros" Docker image, tag lyrical-ros-base
# (built on Ubuntu 26.04 "Resolute Raccoon", the Tier 1 platform for Lyrical)
# -----------------------------------------------------------------------------
ARG ROS_DISTRO=lyrical
FROM ros:${ROS_DISTRO}-ros-base

ARG ROS_DISTRO=lyrical
# Set to "true" (via --build-arg) if you need RViz/demos/other GUI tools
ARG INSTALL_DESKTOP=false

ENV DEBIAN_FRONTEND=noninteractive \
    ROS_DISTRO=${ROS_DISTRO} \
    LANG=en_US.UTF-8

# --- Development tooling: colcon, rosdep, compilers, editors ---------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        ros-dev-tools \
        python3-colcon-common-extensions \
        python3-rosdep \
        build-essential \
        git \
        nano \
    && (rosdep init || true) \
    && rosdep update \
    && rm -rf /var/lib/apt/lists/*

# --- Optional: full desktop (RViz2, demos, GUI tools) -----------------------
RUN if [ "$INSTALL_DESKTOP" = "true" ]; then \
        apt-get update && \
        apt-get install -y --no-install-recommends ros-${ROS_DISTRO}-desktop && \
        rm -rf /var/lib/apt/lists/* ; \
    fi

# --- Workspace ---------------------------------------------------------------
ENV ROS_WS=/root/ros2_ws
RUN mkdir -p ${ROS_WS}/src
WORKDIR ${ROS_WS}

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bash"]
