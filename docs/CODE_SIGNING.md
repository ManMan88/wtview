# Code Signing & Notarization Guide

This guide covers code signing and notarization for the Git Worktree Manager application across macOS and Windows platforms.

## Overview

Code signing is essential for distribution of desktop applications because it:

- **Verifies Publisher Identity** - Users can confirm the application comes from a trusted source
- **Prevents Tampering** - Cryptographic signatures ensure the binary hasn't been modified
- **Enables OS-Level Protections** - Modern operating systems trust signed applications more and provide fewer security warnings
- **Supports Auto-Updates** - Signed apps can receive secure updates without manual re-downloads
- **Meets Distribution Requirements** - App stores and secure distribution channels require valid code signatures
- **Reduces User Friction** - Eliminates browser warnings and OS security dialogs that deter installation

## macOS Code Signing & Notarization

macOS requires both code signing and notarization for distribution outside the App Store. Notarization is Apple's security scanning process that ensures the app doesn't contain malware.

### Prerequisites

Before you can sign and notarize on macOS, you need:

- **Apple Developer Program Membership** - $99/year subscription at [developer.apple.com](https://developer.apple.com)
- **Developer ID Application Certificate** - Issued by Apple for signing applications distributed outside the App Store
- **Mac with Xcode installed** - For codesign and notarization tools
- **Apple ID** - Used for notarization submission

### Certificate Setup

#### Step 1: Create Developer ID Application Certificate

1. Visit [developer.apple.com/account/resources/certificates](https://developer.apple.com/account/resources/certificates)
2. Click the "+" button to create a new certificate
3. Select "Developer ID Application"
4. Follow the prompts to generate a Certificate Signing Request (CSR)
5. Download the certificate and double-click to install into Keychain Access

#### Step 2: Export Certificate as .p12

1. Open **Keychain Access** on your Mac
2. Locate your "Developer ID Application" certificate
3. Right-click and select **Export**
4. Save as `developer-id.p12`
5. Enter a password to protect the .p12 file (remember this for GitHub Secrets)

#### Step 3: Base64 Encode Certificate

```bash
base64 -i developer-id.p12 | pbcopy
```

This copies the base64-encoded certificate to your clipboard for pasting into GitHub Secrets.

#### Step 4: Create App-Specific Password

1. Visit [appleid.apple.com](https://appleid.apple.com)
2. Navigate to **Security** → **App-Specific Passwords**
3. Generate a new app-specific password for "CI/CD"
4. Save this password for GitHub Secrets

### Required GitHub Secrets

Add these secrets to your GitHub repository settings under **Settings** → **Secrets and variables** → **Actions**:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `APPLE_CERTIFICATE` | Base64 encoded .p12 | Developer ID Application certificate |
| `APPLE_CERTIFICATE_PASSWORD` | String | Password protecting the .p12 file |
| `KEYCHAIN_PASSWORD` | String | Temporary keychain password (can be any value, used during CI) |
| `APPLE_SIGNING_IDENTITY` | String | Format: `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Email | Your Apple ID email address |
| `APPLE_PASSWORD` | String | App-specific password from Step 4 above |
| `APPLE_TEAM_ID` | String | 10-character team ID from developer.apple.com |

#### Finding Your Team ID

1. Visit [developer.apple.com/account](https://developer.apple.com/account)
2. Click **Membership details**
3. Your Team ID is the 10-character alphanumeric string displayed

#### Finding Your Signing Identity

```bash
# List all Developer ID certificates in your keychain
security find-identity -v -p codesigning
```

Look for entries like `"Developer ID Application: Your Name (ABC1234567)"` - this is your signing identity.

### Local Testing

Before pushing to CI/CD, test signing locally on macOS:

#### Sign the Application

```bash
# After building with: npm run tauri build

# Sign the app bundle
codesign --force --options runtime \
  --sign "Developer ID Application: Your Name (TEAMID)" \
  "src-tauri/target/release/bundle/macos/wtview.app"
```

The `--options runtime` flag is required for notarization.

#### Verify the Signature

```bash
codesign -vvv --deep --strict "src-tauri/target/release/bundle/macos/wtview.app"
```

Expected output:
```
valid on disk
satisfies its Designated Requirement
```

#### Check Entitlements

```bash
codesign -d --entitlements :- "src-tauri/target/release/bundle/macos/wtview.app"
```

#### Notarize Locally (Optional)

```bash
# Create a DMG for notarization
hdiutil create -volname "wtview" -srcfolder "src-tauri/target/release/bundle/macos/wtview.app" -ov -format UDZO "wtview.dmg"

# Submit for notarization
xcrun notarytool submit wtview.dmg \
  --apple-id your-email@example.com \
  --password "your-app-specific-password" \
  --team-id ABC1234567 \
  --wait

# Staple the notarization ticket to the DMG
xcrun stapler staple wtview.dmg
```

## Windows Code Signing

Windows code signing authenticates the publisher and provides SmartScreen reputation. Unsigned executables trigger warnings in Windows Defender SmartScreen.

### Option 1: Traditional PFX Certificate (Recommended for Development)

For testing and small-scale distribution, use a traditional code signing certificate.

#### Step 1: Purchase OV or EV Certificate

1. Purchase from a recognized Certificate Authority (CA):
   - **OV (Organization Validation)** - ~$100/year, verifies company existence
   - **EV (Extended Validation)** - ~$300+/year, includes SmartScreen reputation
2. Common providers: DigiCert, Sectigo, GoDaddy
3. Follow CA instructions to generate Certificate Signing Request (CSR)
4. Receive certificate bundle (usually as .p12 or .pfx)

#### Step 2: Convert to .pfx if Needed

```bash
# If you have separate .cer and .key files:
openssl pkcs12 -export -out certificate.pfx -inkey private.key -in certificate.cer
```

#### Step 3: Base64 Encode Certificate

On macOS or Linux:
```bash
base64 -i certificate.pfx | pbcopy
```

On Windows (PowerShell):
```powershell
$cert = [System.IO.File]::ReadAllBytes("certificate.pfx")
$base64 = [System.Convert]::ToBase64String($cert)
$base64 | Set-Clipboard
```

### Option 2: Azure Key Vault (HSM) - Recommended for Production EV Certificates

For EV certificates in production, use Azure Key Vault with Hardware Security Module (HSM) protection.

#### Prerequisites

- Azure subscription ($0-pay-as-you-go available)
- Azure Key Vault with HSM enabled
- Azure SignTool installed

#### Setup

1. **Create Azure Key Vault:**
   ```bash
   az keyvault create --name wtview-signing --resource-group your-rg --location eastus
   ```

2. **Import Certificate:**
   ```bash
   az keyvault certificate import \
     --vault-name wtview-signing \
     --name code-signing-cert \
     --file certificate.pfx \
     --password "cert-password"
   ```

3. **Get Certificate Details:**
   ```bash
   az keyvault certificate show --vault-name wtview-signing --name code-signing-cert
   ```

4. **Create Service Principal for CI/CD:**
   ```bash
   az ad sp create-for-rbac \
     --name wtview-ci-signer \
     --role "Key Vault Crypto Officer"
   ```

5. **Add GitHub Secrets:**
   - `AZURE_CLIENT_ID` - Service principal client ID
   - `AZURE_TENANT_ID` - Tenant ID
   - `AZURE_CLIENT_SECRET` - Service principal secret
   - `AZURE_VAULT_NAME` - Key vault name
   - `AZURE_CERT_NAME` - Certificate name in vault

#### Using in CI/CD

GitHub Actions example:
```yaml
- name: Sign Windows Executable (Azure Key Vault)
  run: |
    AzureSignTool sign \
      -kvu "https://${{ secrets.AZURE_VAULT_NAME }}.vault.azure.net/" \
      -kvc ${{ secrets.AZURE_CERT_NAME }} \
      -kvsi ${{ secrets.AZURE_CLIENT_ID }} \
      -kvst ${{ secrets.AZURE_TENANT_ID }} \
      -kvsp ${{ secrets.AZURE_CLIENT_SECRET }} \
      -tr http://timestamp.digicert.com \
      -td sha256 \
      -fd sha256 \
      "target\release\wtview.exe"
```

### Required GitHub Secrets (PFX Method)

Add these secrets to your GitHub repository:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `WINDOWS_CERTIFICATE` | Base64 encoded .pfx | Code signing certificate |
| `WINDOWS_CERTIFICATE_PASSWORD` | String | Password protecting the .pfx file |

### Local Testing (Windows)

#### Prerequisites

- Windows or WSL2
- Microsoft Visual Studio (includes signtool.exe) or download Windows SDK
- Your .pfx certificate file

#### Sign the Executable

```powershell
# Find signtool (usually in Program Files)
$signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"

& $signtool sign /f certificate.pfx `
  /p "your-certificate-password" `
  /tr http://timestamp.digicert.com `
  /td sha256 `
  /fd sha256 `
  "target\release\wtview.exe"
```

#### Verify the Signature

```powershell
& $signtool verify /pa "target\release\wtview.exe"
```

Expected output:
```
Signing certificate chain:
    Issued to: Your Company Name
    Issued by: DigiCert (or other CA)
```

#### Check File Properties

Right-click `wtview.exe` → **Properties** → **Digital Signatures** tab should show your certificate details.

## CI/CD Integration

### GitHub Actions Workflow Example (macOS)

```yaml
name: Sign and Notarize macOS

on:
  release:
    types: [published]

jobs:
  sign-notarize:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build app
        run: npm run tauri build

      - name: Import signing certificate
        run: |
          echo "${{ secrets.APPLE_CERTIFICATE }}" | base64 --decode > certificate.p12

          # Create temporary keychain
          security create-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain
          security default-keychain -s build.keychain
          security unlock-keychain -p "${{ secrets.KEYCHAIN_PASSWORD }}" build.keychain

          # Import certificate
          security import certificate.p12 \
            -k build.keychain \
            -P "${{ secrets.APPLE_CERTIFICATE_PASSWORD }}" \
            -T /usr/bin/codesign

      - name: Sign application
        run: |
          codesign --force --options runtime \
            --sign "${{ secrets.APPLE_SIGNING_IDENTITY }}" \
            "src-tauri/target/release/bundle/macos/wtview.app"

      - name: Create DMG
        run: |
          hdiutil create -volname "wtview" \
            -srcfolder "src-tauri/target/release/bundle/macos/wtview.app" \
            -ov -format UDZO "wtview.dmg"

      - name: Notarize app
        run: |
          xcrun notarytool submit wtview.dmg \
            --apple-id "${{ secrets.APPLE_ID }}" \
            --password "${{ secrets.APPLE_PASSWORD }}" \
            --team-id "${{ secrets.APPLE_TEAM_ID }}" \
            --wait

      - name: Staple notarization
        run: |
          xcrun stapler staple wtview.dmg

      - name: Upload to release
        uses: softprops/action-gh-release@v1
        with:
          files: wtview.dmg
```

### GitHub Actions Workflow Example (Windows)

```yaml
name: Sign Windows

on:
  release:
    types: [published]

jobs:
  sign:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build app
        run: npm run tauri build

      - name: Decode certificate
        run: |
          $cert = [System.Convert]::FromBase64String("${{ secrets.WINDOWS_CERTIFICATE }}")
          [System.IO.File]::WriteAllBytes("certificate.pfx", $cert)

      - name: Sign executable
        run: |
          $signtool = "C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64\signtool.exe"

          & $signtool sign /f certificate.pfx `
            /p "${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}" `
            /tr http://timestamp.digicert.com `
            /td sha256 `
            /fd sha256 `
            "target\release\wtview.exe"

      - name: Upload to release
        uses: softprops/action-gh-release@v1
        with:
          files: target/release/wtview.exe
```

## Troubleshooting

### macOS Issues

#### "code signature invalid" error

**Cause:** Entitlements mismatch or missing runtime hardening flag

**Solution:**
```bash
# Verify entitlements match Tauri config
codesign -d --entitlements :- "src-tauri/target/release/bundle/macos/wtview.app"

# Re-sign with correct options
codesign --force --options runtime --deep \
  --sign "Developer ID Application: Your Name (TEAMID)" \
  "src-tauri/target/release/bundle/macos/wtview.app"
```

#### "app is damaged and can't be opened" on first launch

**Cause:** App not notarized

**Solution:**
- Ensure notarization completes successfully
- Verify notarization ticket is stapled:
  ```bash
  stapler validate "src-tauri/target/release/bundle/macos/wtview.app"
  ```

#### "Keychain error" during CI/CD

**Cause:** Incorrect keychain password or certificate import failed

**Solution:**
- Verify `KEYCHAIN_PASSWORD` matches workflow script
- Test certificate export locally:
  ```bash
  security import certificate.p12 -k login.keychain -P "password"
  ```

#### Notarization times out or fails

**Cause:** Network issues or server overload

**Solution:**
- Check Apple's System Status page
- Retry notarization with `--wait` flag
- Use `xcrun notarytool log <request-uuid>` to view detailed error

### Windows Issues

#### "certificate not trusted" in SmartScreen

**Cause:** Using self-signed or OV certificate with low reputation

**Solution:**
- Use EV certificate from recognized CA (DigiCert, Sectigo)
- Build reputation over time - users must run the app multiple times
- Consider Azure Key Vault HSM for production EV certificates

#### Timestamp server errors

**Cause:** Selected timestamp server is unreliable or offline

**Solution:**
Try alternative timestamp servers:
```powershell
# DigiCert (recommended)
/tr http://timestamp.digicert.com

# GlobalSign
/tr http://timestamp.globalsign.com/tsa

# Entrust
/tr http://timestamp.entrust.net/rfc3161ts
```

#### signtool.exe not found

**Cause:** Windows SDK not installed or not in PATH

**Solution:**
```powershell
# Install Windows SDK
winget install Microsoft.WindowsSDK.10.0

# Or manually locate signtool
dir "C:\Program Files*" -Recurse -Filter signtool.exe
```

#### Certificate password rejected during signing

**Cause:** Special characters in password not properly escaped

**Solution:**
```powershell
# For special characters, wrap in quotes or use environment variables
$password = ${{ secrets.WINDOWS_CERTIFICATE_PASSWORD }}
signtool sign /f certificate.pfx /p "$password" ...
```

## Without Code Signing

If you choose not to sign your application, be aware of the consequences:

### macOS (Without Signing)

- **GateKeeper Warning** - Users see "cannot be opened because the developer cannot be verified"
- **Users Must Bypass** - Right-click app → Select "Open" → Click "Open" in dialog to override
- **No Notarization Ticket** - Older macOS versions will quarantine the app
- **Auto-Update Blocked** - Sparkle and other update frameworks require valid signatures
- **Distribution Challenges** - App stores and secure distribution channels require signing

### Windows (Without Signing)

- **SmartScreen Warning** - "Windows protected your PC - Unknown Publisher"
- **Users Must Click "More info"** - Then "Run anyway" to execute
- **No Reputation** - Application has zero SmartScreen reputation, triggering warnings indefinitely
- **Corporate Environments** - Many organizations block unsigned executables via policy
- **Perceived Risk** - Users strongly associate unsigned software with malware

### User Workarounds

**macOS:**
```bash
# Users can bypass with this (not ideal):
xattr -d com.apple.quarantine wtview.app
```

**Windows:**
```powershell
# Users can bypass with this (not ideal):
Unblock-File -Path "wtview.exe"
```

## Best Practices

1. **Automate Signing** - Always sign in CI/CD, never rely on manual local signing
2. **Rotate Certificates** - Renew certificates before expiration (use calendar reminders)
3. **Keep Secrets Safe** - Use GitHub repository secrets, never commit certificates
4. **Test Locally First** - Verify signing works before deploying to CI/CD
5. **Monitor Reputation** - Check SmartScreen reputation status for Windows certificates
6. **Version Consistency** - Sign all builds released to users, not just production builds
7. **Timestamp Always** - Always use timestamp servers to maintain signature validity after certificate expiration
8. **Document Access** - Keep clear records of who has access to signing credentials

## Additional Resources

- [Apple Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Tauri Signing Guide](https://tauri.app/v1/guides/distribution/sign/)
- [Microsoft Authenticode Documentation](https://docs.microsoft.com/en-us/windows/win32/seccrypto/authenticode)
- [MSIX Signing](https://docs.microsoft.com/en-us/windows/msix/package/sign-app-package-using-signtool)
