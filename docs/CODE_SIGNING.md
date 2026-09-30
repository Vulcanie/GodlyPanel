# Code signing

Windows SmartScreen warns about a program nobody has signed ("Windows protected your PC"). A signed
program still gets a warning at first, until enough people have run it, but it names a real publisher
and the warning fades. The release workflow is ready to sign with **SignPath**, which signs
open-source projects for free. The pieces that can't be done from the code are below.

## What is already in the repository

- `.signpath/artifact-configuration.xml`: tells SignPath to sign `GodlyPanel.exe` inside the release zip.
- `.github/workflows/release.yml`: after packaging, uploads the zip, asks SignPath to sign it, and
  releases the signed zip. These steps run **only when** the repository variable
  `SIGNPATH_ORGANIZATION_ID` is set, so nothing changes until signing is set up.

## What you have to do

1. **Make the repository public.** SignPath's free programme (SignPath Foundation) is for public
   open-source projects with an OSI-approved licence. GodlyPanel is MIT.
2. **Apply** at https://signpath.org/ ("Apply for free code signing"). They ask for the repository, what
   the program does, and that it isn't malware. Approval takes days to weeks. The certificate will show
   "SignPath Foundation" as the publisher, not your name.
3. In the SignPath web app create a project with the slug `godlypanel`, add the artifact configuration
   from `.signpath/artifact-configuration.xml` (or let it read the file from the repository), and a
   signing policy with the slug `release-signing` set to use the release certificate.
4. Connect GitHub: in SignPath add a trusted build system for GitHub.com, and create an API token for CI.
5. In the repository's Settings → Secrets and variables → Actions:
   - variable `SIGNPATH_ORGANIZATION_ID`: your SignPath organisation id
   - secret `SIGNPATH_API_TOKEN`: the token from step 4
6. Push a version tag. The release now carries a signed zip. Check it: right-click `GodlyPanel.exe` →
   Properties → Digital Signatures.

SignPath can require a person to approve each release (a setting on the signing policy). That is worth
turning on: it means a stolen token alone can't publish a signed build.

## Verifying a signed build

```powershell
Get-AuthenticodeSignature .\GodlyPanel.exe | Format-List Status, SignerCertificate
```

`Status` should be `Valid`.

## If you'd rather pay

A standard code-signing certificate from a certificate authority, or Azure Trusted Signing, works too:
replace the SignPath steps with `signtool sign` (or the Azure action) on `dist/win-unpacked/GodlyPanel.exe`
before it is zipped. Nothing else in the build needs to change.
