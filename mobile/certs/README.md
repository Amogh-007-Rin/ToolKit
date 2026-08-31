# Expo update signing

OTA update signing is enabled when `EXPO_UPDATES_CODE_SIGNING_CERTIFICATE` points to the public certificate generated for the selected EAS environment.

Generate a staging keypair locally with:

```sh
mkdir -p certs/private
openssl req -x509 -newkey rsa:2048 -sha256 -nodes \
  -keyout certs/private/staging-update-private-key.pem \
  -out certs/staging-update-certificate.pem \
  -days 3650 -subj "/CN=ToolKit Staging Updates"
```

The private key must be stored in the EAS environment secret `EXPO_UPDATES_CODE_SIGNING_PRIVATE_KEY` or an equivalent protected release secret. Never commit it. Configure `EXPO_UPDATES_CODE_SIGNING_CERTIFICATE=./certs/staging-update-certificate.pem` for builds that verify signed updates.

Final bundle identifiers, EAS project ID, signing ownership, store accounts, and production certificates remain owner-controlled release gates.
