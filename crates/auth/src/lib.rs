use anyhow::{bail, Context, Result};
use gitpersona_core::DeviceFlowStart;
use reqwest::Client;
use serde::{Deserialize, Serialize};

const GITHUB_DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const GITHUB_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL: &str = "https://api.github.com/user";

/// GitHub scopes we request. "repo" is needed for HTTPS clone/push.
const SCOPES: &str = "read:user,repo,write:public_key";

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: u32,
    interval: u32,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    error: Option<String>,
    error_description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitHubUserInfo {
    pub login: String,
    pub name: Option<String>,
    pub avatar_url: String,
    pub html_url: String,
}

/// Start the GitHub Device Flow. Returns the codes the user needs to enter.
pub async fn start_device_flow(client_id: &str) -> Result<DeviceFlowStart> {
    let client = Client::new();
    let response = client
        .post(GITHUB_DEVICE_CODE_URL)
        .header("Accept", "application/json")
        .header("User-Agent", "gitpersona/1.0")
        .form(&[("client_id", client_id), ("scope", SCOPES)])
        .send()
        .await
        .context("Failed to contact GitHub")?;

    let data: DeviceCodeResponse = response
        .json()
        .await
        .context("Failed to parse device code response")?;

    Ok(DeviceFlowStart {
        device_code: data.device_code,
        user_code: data.user_code,
        verification_uri: data.verification_uri,
        expires_in: data.expires_in,
        interval: data.interval,
    })
}

/// Poll GitHub for an access token. Returns the token on success, or None if
/// authorization is still pending. Returns an Err for unrecoverable errors.
pub async fn poll_device_flow(client_id: &str, device_code: &str) -> Result<Option<String>> {
    let client = Client::new();
    let response = client
        .post(GITHUB_TOKEN_URL)
        .header("Accept", "application/json")
        .header("User-Agent", "gitpersona/1.0")
        .form(&[
            ("client_id", client_id),
            ("device_code", device_code),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .context("Failed to contact GitHub token endpoint")?;

    let data: TokenResponse = response
        .json()
        .await
        .context("Failed to parse token response")?;

    match (data.access_token, data.error.as_deref()) {
        (Some(token), _) if !token.is_empty() => Ok(Some(token)),
        (_, Some("authorization_pending")) => Ok(None),
        (_, Some("slow_down")) => {
            // The caller should increase polling interval
            Ok(None)
        }
        (_, Some("expired_token")) => bail!("Device code has expired. Please try again."),
        (_, Some("access_denied")) => bail!("GitHub authorization was denied by the user."),
        (_, Some(err)) => bail!(
            "GitHub error: {} — {}",
            err,
            data.error_description.unwrap_or_default()
        ),
        _ => Ok(None),
    }
}

/// Fetch the authenticated GitHub user info.
pub async fn get_user_info(token: &str) -> Result<GitHubUserInfo> {
    let client = Client::new();
    let user: GitHubUserInfo = client
        .get(GITHUB_USER_URL)
        .header("Authorization", format!("Bearer {}", token))
        .header("User-Agent", "gitpersona/1.0")
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .context("Failed to reach GitHub API")?
        .error_for_status()
        .context("GitHub API returned an error — token may be invalid")?
        .json()
        .await
        .context("Failed to parse GitHub user response")?;

    Ok(user)
}
