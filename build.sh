#!/bin/bash
# Force paths to the current user's home to avoid root/vercel mismatch
export RUSTUP_HOME=$HOME/.rustup
export CARGO_HOME=$HOME/.cargo

# Install Rust without trying to modify .bashrc/.profile (which might fail)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain stable

# Manually add cargo to path for this script session
export PATH=$CARGO_HOME/bin:$PATH

# Verify installation (debug logging)
rustc --version
cargo --version

# Setup Dioxus Environment
rustup target add wasm32-unknown-unknown
curl -L --proto '=https' --tlsv1.2 -sSf https://raw.githubusercontent.com/cargo-bins/cargo-binstall/main/install-from-binstall-release.sh | bash
cargo binstall dioxus-cli --no-confirm

# Build
dx build --release --web