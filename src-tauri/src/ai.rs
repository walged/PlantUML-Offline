//! AI integration.
//!
//! All LLM HTTP calls are made from the Rust backend (not the webview) so that:
//!  - there are no browser CORS restrictions (important for Anthropic), and
//!  - the user's API key never has to live in the JS/DOM layer.
//!
//! The default provider is OpenRouter (one key → many models, OpenAI-compatible
//! and reachable from CIS). Any OpenAI-compatible endpoint works by setting a
//! custom base URL (DeepSeek, Qwen, Kie.AI, local Ollama, OpenAI, …). Anthropic
//! is supported via its OpenAI-compatible `/v1/chat/completions` endpoint.

use serde::{Deserialize, Serialize};

/// A single chat message.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String, // "system" | "user" | "assistant"
    pub content: String,
}

/// Request payload sent from the frontend.
#[derive(Debug, Clone, Deserialize)]
pub struct AiRequest {
    /// Full base URL of the provider, e.g. "https://openrouter.ai/api/v1".
    pub base_url: String,
    /// API key (Bearer token).
    pub api_key: String,
    /// Model id, e.g. "anthropic/claude-opus-4-8" or "deepseek/deepseek-chat".
    pub model: String,
    pub messages: Vec<ChatMessage>,
    #[serde(default)]
    pub temperature: Option<f32>,
    #[serde(default)]
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct AiResponse {
    pub content: String,
}

#[derive(Serialize)]
struct ChatCompletionRequest<'a> {
    model: &'a str,
    messages: &'a [ChatMessage],
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    stream: bool,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<Choice>,
}

#[derive(Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Deserialize)]
struct ResponseMessage {
    content: Option<String>,
}

/// Join a base URL and a path without doubling or dropping the slash.
fn join_url(base: &str, path: &str) -> String {
    format!("{}/{}", base.trim_end_matches('/'), path.trim_start_matches('/'))
}

/// Perform a (non-streaming) chat completion against an OpenAI-compatible API.
pub async fn chat_completion(req: AiRequest) -> Result<AiResponse, String> {
    if req.api_key.trim().is_empty() {
        return Err("API key is not set. Add it in Settings → AI.".to_string());
    }
    if req.base_url.trim().is_empty() {
        return Err("Provider base URL is not set.".to_string());
    }

    let url = join_url(&req.base_url, "chat/completions");

    let body = ChatCompletionRequest {
        model: &req.model,
        messages: &req.messages,
        temperature: req.temperature,
        max_tokens: req.max_tokens,
        stream: false,
    };

    let client = reqwest::Client::builder()
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {e}"))?;

    let mut request = client
        .post(&url)
        .bearer_auth(req.api_key.trim())
        .header("Content-Type", "application/json")
        // Optional OpenRouter attribution headers (ignored by other providers).
        .header("HTTP-Referer", "https://github.com/walged/PlantUML-Offline")
        .header("X-Title", "PlantUML Offline");

    // Anthropic's OpenAI-compatible endpoint requires this header when the call
    // originates from a browser; harmless to always send from the backend.
    if req.base_url.contains("api.anthropic.com") {
        request = request.header("anthropic-dangerous-direct-browser-access", "true");
    }

    let response = request
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Request failed: {e}"))?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        let detail = extract_api_error(&text).unwrap_or_else(|| text.chars().take(300).collect());
        return Err(format!("AI provider error {}: {}", status.as_u16(), detail));
    }

    let parsed: ChatCompletionResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse AI response: {e}"))?;

    let content = parsed
        .choices
        .into_iter()
        .next()
        .and_then(|c| c.message.content)
        .unwrap_or_default();

    if content.trim().is_empty() {
        return Err("AI returned an empty response.".to_string());
    }

    Ok(AiResponse { content })
}

/// Try to pull a useful message out of a provider's JSON error body.
fn extract_api_error(body: &str) -> Option<String> {
    let v: serde_json::Value = serde_json::from_str(body).ok()?;
    v.get("error")
        .and_then(|e| e.get("message").and_then(|m| m.as_str()).or_else(|| e.as_str()))
        .map(|s| s.to_string())
}
