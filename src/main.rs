#![allow(non_snake_case)]
use dioxus::prelude::*;

fn main() {
    launch(App);
}

fn App(cx: Scope) -> Element {
    cx.render(rsx! {
        div { "PerkPath Loading..." }
    })
}