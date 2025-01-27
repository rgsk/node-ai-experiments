#!/bin/bash
set -e  # Exit immediately if a command exits with a non-zero status

# Function to build a runner
build_runner() {
    local runner_dir=$1
    echo "Building $runner_dir..."
    cd "$runner_dir"  # Change to the directory
    sh bin/build.sh  # Run the build script
    cd - > /dev/null  # Return to the previous directory
    echo "$runner_dir build completed."
}

build_runner "code-runners/cpp-runner"

build_runner "code-runners/node-runner"

build_runner "code-runners/python-runner"

echo "All builds completed successfully."