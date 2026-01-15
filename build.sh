#!/bin/bash
export RUSTUP_HOME=$HOME/.rustup
export CARGO_HOME=$HOME/.cargo

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain stable

export PATH=$CARGO_HOME/bin:$PATH

rustc --version
cargo --version

rustup target add wasm32-unknown-unknown

# Use --version flag with exact version
cargo install dioxus-cli --version "0.5.6" --locked

dx build --release --platform web
