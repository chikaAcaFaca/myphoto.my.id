# Desktop — Microsoft Store (MSIX) distribution

Store-distributed installs have **no SmartScreen "Unknown publisher" warning**
(Microsoft signs the package). This is the "download from our site → install,
no warning" path — but it requires a one-time **$19** Partner Center account and
passing Microsoft's certification review (~1–3 days).

The `.exe` (NSIS) download from `/api/download/desktop` keeps working in
parallel; nothing here blocks ongoing desktop development.

## Steps to publish

1. **Create a Partner Center account** (https://partner.microsoft.com) — $19
   one-time. Reserve the app name "MyPhoto Sync".
2. **Fill the real identity values** Partner Center gives you into
   `package.json → build.appx`:
   - `identityName` (e.g. `12345Publisher.MyPhotoSync`)
   - `publisher` (e.g. `CN=ABCD1234-...`)
   - `publisherDisplayName`
3. **Build the MSIX package:** `pnpm run dist:msix` → produces an `.appx`/`.msix`
   in `release/`. (Needs the Windows 10/11 SDK on the build machine for
   `makeappx`/`makepri`.)
4. **Upload** the package in Partner Center → submit for certification.
5. When approved, copy the **Store listing URL** into
   `apps/web/.../download/page.tsx → STORE_URL`. The "Microsoft Store" button
   then appears on `/download` (it shows "uskoro" until then).

## ⚠️ Folder-sync caveat (must test)

MSIX runs in a partial sandbox. The sync engine watches arbitrary folders
(`chokidar`), which needs the **`broadFileSystemAccess`** restricted
capability. That:
- requires a custom AppxManifest capability entry (electron-builder's `appx`
  config doesn't expose it directly — needs a manifest template/patch), and
- must be **justified to Microsoft** during Store review.

So before committing to the Store path, build the MSIX and verify the desktop
folder sync still works under it. If `broadFileSystemAccess` approval is a
blocker, Azure Trusted Signing (sign the `.exe`, ~$10/mo) is the simpler
no-warning route that keeps the current distribution.
