use crate::error::AppError;
use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::Engine as _;
use hkdf::Hkdf;
use serde::{Deserialize, Serialize};
use sha2::Sha256;

const NEXT_AUTH_JWE_INFO: &[u8] = b"NextAuth.js Generated Encryption Key";
const CLOCK_TOLERANCE_SECS: i64 = 15;
const IV_LEN: usize = 12;
const JWE_PART_COUNT: usize = 5;
const ENCRYPTED_KEY_PART: usize = 1;
const IV_PART: usize = 2;
const CIPHERTEXT_PART: usize = 3;
const TAG_PART: usize = 4;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Option<String>,
    pub id: Option<String>,
    pub email: Option<String>,
    pub name: Option<String>,
    pub exp: Option<i64>,
    pub iat: Option<i64>,
    pub jti: Option<String>,
}

fn derive_key(secret: &str) -> [u8; 32] {
    let mut key = [0u8; 32];
    let hkdf = Hkdf::<Sha256>::new(Some(b""), secret.as_bytes());
    hkdf.expand(NEXT_AUTH_JWE_INFO, &mut key)
        .expect("32 bytes is a valid HKDF output length");
    key
}

fn b64url_decode(input: &str) -> Result<Vec<u8>, AppError> {
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(input)
        .map_err(|error| AppError::Auth(format!("invalid token encoding: {error}")))
}

pub fn verify_token(token: &str, secret: &str) -> Result<Claims, AppError> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != JWE_PART_COUNT || !parts[ENCRYPTED_KEY_PART].is_empty() {
        return Err(AppError::Auth(
            "invalid token: expected a compact JWE with dir key management".into(),
        ));
    }
    let header = b64url_decode(parts[0])?;
    let header_json: serde_json::Value = serde_json::from_slice(&header)
        .map_err(|error| AppError::Auth(format!("invalid token header: {error}")))?;
    if header_json.get("alg").and_then(|v| v.as_str()) != Some("dir")
        || header_json.get("enc").and_then(|v| v.as_str()) != Some("A256GCM")
    {
        return Err(AppError::Auth(
            "unsupported token encryption algorithm".into(),
        ));
    }
    let iv = b64url_decode(parts[IV_PART])?;
    if iv.len() != IV_LEN {
        return Err(AppError::Auth("invalid token iv".into()));
    }
    let mut ciphertext = b64url_decode(parts[CIPHERTEXT_PART])?;
    ciphertext.extend_from_slice(&b64url_decode(parts[TAG_PART])?);
    let cipher = Aes256Gcm::new((&derive_key(secret)).into());
    let nonce =
        Nonce::try_from(iv.as_slice()).map_err(|_| AppError::Auth("invalid token iv".into()))?;
    let plaintext = cipher
        .decrypt(
            &nonce,
            Payload {
                msg: &ciphertext,
                aad: parts[0].as_bytes(),
            },
        )
        .map_err(|_| AppError::Auth("invalid token: decryption failed".into()))?;
    let claims: Claims = serde_json::from_slice(&plaintext)
        .map_err(|error| AppError::Auth(format!("invalid token payload: {error}")))?;
    let exp = claims
        .exp
        .ok_or_else(|| AppError::Auth("token does not contain an expiry".into()))?;
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .unwrap_or_default();
    if now > exp + CLOCK_TOLERANCE_SECS {
        return Err(AppError::Auth("token expired".into()));
    }
    Ok(claims)
}

pub fn user_id_from_claims(claims: &Claims) -> Option<String> {
    claims.sub.clone().or_else(|| claims.id.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encrypt(secret: &str, claims: serde_json::Value) -> String {
        let header = base64::engine::general_purpose::URL_SAFE_NO_PAD
            .encode(r#"{"alg":"dir","enc":"A256GCM"}"#);
        let iv = [7u8; IV_LEN];
        let cipher = Aes256Gcm::new((&derive_key(secret)).into());
        let ciphertext = cipher
            .encrypt(
                &Nonce::try_from(&iv[..]).unwrap(),
                Payload {
                    msg: serde_json::to_vec(&claims).unwrap().as_slice(),
                    aad: header.as_bytes(),
                },
            )
            .unwrap();
        let (ct, tag) = ciphertext.split_at(ciphertext.len() - 16);
        let enc = |bytes: &[u8]| base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(bytes);
        format!(
            "{}.{}.{}.{}.{}",
            header,
            enc(b""),
            enc(&iv),
            enc(ct),
            enc(tag)
        )
    }

    fn claims(exp: i64) -> serde_json::Value {
        serde_json::json!({
            "sub": "cm8abc123",
            "id": "cm8abc123",
            "email": "user@example.com",
            "name": "Test User",
            "iat": 1700000000,
            "exp": exp,
            "jti": "abc-123"
        })
    }

    fn now_plus(secs: i64) -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64
            + secs
    }

    #[test]
    fn verifies_nextauth_style_token() {
        let secret = "super-secret-secret-secret-secret-secret";
        let token = encrypt(secret, claims(now_plus(3600)));
        let claims = verify_token(&token, secret).unwrap();
        assert_eq!(user_id_from_claims(&claims).as_deref(), Some("cm8abc123"));
    }

    #[test]
    fn uses_sub_as_fallback_when_id_missing() {
        let secret = "super-secret-secret-secret-secret-secret";
        let token = encrypt(
            secret,
            serde_json::json!({ "sub": "user-sub", "exp": now_plus(3600) }),
        );
        let claims = verify_token(&token, secret).unwrap();
        assert_eq!(user_id_from_claims(&claims).as_deref(), Some("user-sub"));
    }

    #[test]
    fn rejects_token_with_wrong_secret() {
        let secret = "super-secret-secret-secret-secret-secret";
        let token = encrypt("other-secret", claims(now_plus(3600)));
        assert!(verify_token(&token, secret).is_err());
    }

    #[test]
    fn rejects_expired_token() {
        let secret = "super-secret-secret-secret-secret-secret";
        let token = encrypt(secret, claims(now_plus(-100)));
        assert!(verify_token(&token, secret).is_err());
    }

    #[test]
    fn rejects_malformed_token() {
        assert!(verify_token("not-a-jwe", "secret").is_err());
    }

    #[test]
    fn rejects_token_without_expiry() {
        let secret = "super-secret-secret-secret-secret-secret";
        let token = encrypt(secret, serde_json::json!({ "sub": "user-sub" }));
        assert!(verify_token(&token, secret).is_err());
    }
}
