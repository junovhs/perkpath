#!/bin/bash
export RUSTUP_HOME=$HOME/.rustup
export CARGO_HOME=$HOME/.cargo

curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --no-modify-path --default-toolchain stable

export PATH=$CARGO_HOME/bin:$PATH

rustc --version
cargo --version

rustup target add wasm32-unknown-unknown

cargo install dioxus-cli --version "0.5.6" --locked

# Remove Cargo.lock so Vercel generates v3 format
rm -f Cargo.lock

dx build --release --platform web
