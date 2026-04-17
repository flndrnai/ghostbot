# Publishing the GhostBot VS Code extension

End-to-end guide for shipping the extension to the Visual Studio Code Marketplace. Everything up to `vsce publish` is done — this guide is what YOU run when you're ready to hit publish.

## One-time setup

You'll do these once and never again.

### 1. Create a Marketplace publisher

Go to <https://marketplace.visualstudio.com/manage> and sign in with the Microsoft account that should own the `flndrn` publisher name. Create a publisher with:

- **Publisher ID**: `flndrn` (must match `package.json` → `publisher`)
- **Publisher name**: anything you want shown on Marketplace (e.g. "flndrn")

### 2. Create an Azure DevOps Personal Access Token

`vsce` authenticates with Marketplace via an Azure DevOps PAT (not a GitHub one).

1. Open <https://dev.azure.com> and sign in with the **same Microsoft account**. If you don't have an Azure DevOps organisation yet, it will create one when you first visit — any name works.
2. Top-right avatar → **Personal access tokens** → **+ New Token**.
3. Settings:
   - **Name**: `vsce-ghostbot`
   - **Organization**: **All accessible organizations** ← critical
   - **Expiration**: 90 days (or longer — your call)
   - **Scopes**: choose **Custom defined** → **Marketplace** → check **Manage**
4. Click **Create** and copy the token IMMEDIATELY — you can't see it again.

### 3. Generate the icon PNG

Marketplace requires a 128×128 PNG (SVG isn't accepted). Current repo only has `icon.svg`.

```bash
# Option 1 — using rsvg-convert (macOS: brew install librsvg)
cd vscode-extension
rsvg-convert -w 128 -h 128 icon.svg > icon.png

# Option 2 — using Inkscape
inkscape icon.svg --export-type=png --export-width=128 --export-filename=icon.png

# Option 3 — online
# Upload icon.svg to cloudconvert.com / convertio.co, export as 128x128 PNG
```

Commit `icon.png` so it ships in the `.vsix`.

### 4. Install vsce locally

```bash
cd vscode-extension
npm install
```

`@vscode/vsce` is now in `devDependencies` so `npx vsce <command>` works without a global install.

### 5. Log in with your PAT

```bash
cd vscode-extension
npx vsce login flndrn
# paste the PAT from step 2 when prompted
```

vsce stashes it in `~/.vsce` so you won't need to paste again.

## Publishing a release

From here it's two commands per release.

```bash
cd vscode-extension
npm install           # in case deps drifted
npx vsce package      # produces ghostbot-vscode-0.2.0.vsix locally — inspect it
```

Open the `.vsix` in VS Code (`File → Install from VSIX…`) and smoke-test it against your GhostBot instance. If the webview loads, commands fire, and CodeLens shows up, you're good.

Then:

```bash
# Manual version — you set the number in package.json first
npx vsce publish

# Or auto-bump:
npm run publish:patch   # 0.2.0 → 0.2.1
npm run publish:minor   # 0.2.1 → 0.3.0
```

Publishing takes 5–10 minutes to propagate to Marketplace. Check
<https://marketplace.visualstudio.com/items?itemName=flndrn.ghostbot-vscode>
when it's live.

## Post-publish

### Pin the Marketplace link in the main README

After the first successful publish, add a badge to the repo-root `README.md`:

```markdown
[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/flndrn.ghostbot-vscode?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=flndrn.ghostbot-vscode)
```

### GitHub Action for future releases (optional)

`.github/workflows/vscode-publish.yml` already exists — triggered on `vscode-ext/v*` tags. Two things to make it go:

1. Add a GitHub Actions secret called `VSCE_PAT` with the Azure DevOps PAT from setup step 2.
2. Tag and push:
   ```bash
   git tag vscode-ext/v0.2.1
   git push origin vscode-ext/v0.2.1
   ```

The workflow will build and publish automatically.

## Version policy

- **Patch (0.2.x)** — bug fixes only, no new commands or settings
- **Minor (0.x.0)** — new features, backward-compatible settings
- **Major (x.0.0)** — breaking changes (renamed commands, removed settings)

Update `CHANGELOG.md` in the same commit as the version bump. Marketplace shows the changelog on the extension page.

## Unpublishing / pulling a broken release

```bash
npx vsce unpublish flndrn.ghostbot-vscode
```

Use sparingly — unpublished versions can't be re-used. Prefer shipping a patch bump that fixes the issue.

## Troubleshooting

**"ERROR: 401 Unauthorized"** on `vsce publish`: your PAT expired or lost the `Marketplace: Manage` scope. Generate a new one (step 2).

**"ERROR: Publisher 'flndrn' doesn't exist"**: you've PAT'd the wrong Azure DevOps organisation. The PAT must be scoped to "All accessible organizations" AND you must have created the `flndrn` publisher on marketplace.visualstudio.com FIRST.

**"Icon must be a PNG"**: you skipped step 3. Generate the PNG and commit it.

**"README references a broken link"**: Marketplace validates links. Relative links to files outside the `.vsix` fail. Make every link in `vscode-extension/README.md` absolute (https://…).
