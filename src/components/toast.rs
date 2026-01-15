use dioxus::prelude::*;

#[derive(Clone, PartialEq)]
pub enum ToastType {
    Success,
    #[allow(dead_code)]
    Error,
}

#[derive(Clone, PartialEq)]
pub struct ToastMessage {
    pub text: String,
    pub toast_type: ToastType,
}

#[derive(PartialEq, Props, Clone)]
pub struct ToastProps {
    pub message: Option<ToastMessage>,
    pub on_dismiss: EventHandler<()>,
}

#[allow(clippy::needless_pass_by_value)]
pub fn Toast(props: ToastProps) -> Element {
    let visible = props.message.is_some();

    use_effect(move || {
        if visible {
            let dismiss = props.on_dismiss;
            let handle = gloo_timers::callback::Timeout::new(3000, move || {
                dismiss.call(());
            });
            handle.forget();
        }
    });

    let Some(msg) = props.message.as_ref() else {
        return rsx! {};
    };

    let type_class = match msg.toast_type {
        ToastType::Success => "success",
        ToastType::Error => "error",
    };

    rsx! {
        div {
            class: "toast show {type_class}",
            "{msg.text}"
        }
    }
}