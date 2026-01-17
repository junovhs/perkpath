use crate::geocoding::{search, SearchResult};
use dioxus::prelude::*;

#[derive(Clone, PartialEq, Props)]
pub struct LocationSearchProps {
    pub on_select: EventHandler<SearchResult>,
    #[props(default = "Search locations...".to_string())]
    pub placeholder: String,
}

#[component]
pub fn LocationSearch(props: LocationSearchProps) -> Element {
    let mut query = use_signal(String::new);
    let mut results = use_signal(Vec::<SearchResult>::new);
    let mut show_dropdown = use_signal(|| false);

    let on_input = move |evt: Event<FormData>| {
        let value = evt.value();
        query.set(value.clone());

        if value.len() >= 2 {
            let found = search(&value, 8);
            results.set(found);
            show_dropdown.set(true);
        } else {
            results.set(vec![]);
            show_dropdown.set(false);
        }
    };

    let mut select_result = move |result: SearchResult| {
        query.set(result.name.clone());
        show_dropdown.set(false);
        results.set(vec![]);
        props.on_select.call(result);
    };

    rsx! {
        div { class: "location-search",
            input {
                r#type: "text",
                placeholder: "{props.placeholder}",
                value: "{query}",
                oninput: on_input,
                onfocus: move |_| {
                    if !results.read().is_empty() {
                        show_dropdown.set(true);
                    }
                },
            }

            if show_dropdown() && !results.read().is_empty() {
                div { class: "search-dropdown",
                    for result in results.read().iter() {
                        div {
                            class: "search-result",
                            onclick: {
                                let result = result.clone();
                                move |_| select_result(result.clone())
                            },
                            span { class: "result-name", "{result.name}" }
                            span { class: "result-country", "{result.display_name}" }
                        }
                    }
                }
            }
        }
    }
}
