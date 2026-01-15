#!/bin/bash
# Force paths to the current user's home to avoid root/vercel mismatch
export RUSTUP_HOME=$HOME/.rustup
export CARGO_HOME=$HOME/.cargo

# Install Rust without trying to modify .bashrc/.profile
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain stable

# Manually add cargo to path for this script session
export PATH=$CARGO_HOME/bin:$PATH

# Verify installation
rustc --version
cargo --version

# Setup Dioxus Environment
rustup target add wasm32-unknown-unknown

# COMPILE from source to ensure GLIBC compatibility with Vercel's OS
# This takes longer (3-5 mins) but is the most robust solution.
cargo install dioxus-cli@0.5 --locked

# Build
dx build --release --web
