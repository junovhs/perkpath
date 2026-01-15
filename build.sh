#!/bin/bash
export RUSTUP_HOME=$HOME/.rustup
export CARGO_HOME=$HOME/.cargo

# Pin to 1.77 which generates Cargo.lock v3
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain 1.77.0

export PATH=$CARGO_HOME/bin:$PATH

rustc --version
cargo --version

rustup target add wasm32-unknown-unknown

cargo install dioxus-cli --version "0.5.6" --locked

dx build --release --platform web
