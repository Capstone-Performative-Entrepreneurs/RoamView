#!/bin/bash
set -e

# Source the ROS 2 underlay (system install)
source "/opt/ros/${ROS_DISTRO}/setup.bash"

# Source the workspace overlay once it has been built with colcon
if [ -f "${ROS_WS}/install/setup.bash" ]; then
    source "${ROS_WS}/install/setup.bash"
fi

exec "$@"
