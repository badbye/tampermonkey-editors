# Tampermonkey Editors

This fork can auto-connect to `tm-mcp-hub`, so AI agents no longer need a one-time connection code for every MCP server start.

The Chrome development manifest includes the official Tampermonkey Editors public key, so an unpacked local build keeps the official Chrome extension ID:

```text
lieodnapokbjkkdkhdljlllmgkmdokcm
```

Tampermonkey allows that ID to use its external userscript API, so local development builds can connect without patching the installed Tampermonkey extension.

## Auto-connect with tm-mcp-hub

1. Build and start the Hub from the `tampermonkey-mcp` checkout:

```bash
cd ../tampermonkey-mcp
npm install
npm run build
node dist/index.js init
node dist/index.js trust
node dist/index.js daemon start
```

2. Open the Tampermonkey Editors popup.

3. Enable `Auto-connect to tm-mcp-hub`.

4. Keep the default Hub URL unless you changed the Hub port:

```text
http://127.0.0.1:4001/.well-known/tampermonkey-mcp
```

5. Paste the token printed by `node dist/index.js trust` into `Hub token`.

After this one-time setup, the extension discovers the Hub and reconnects automatically after Chrome restarts, extension reloads, or Hub restarts. The old `Connection code` field is still available for legacy direct WebSocket connections, but it is no longer the normal MCP workflow.

## Building

```bash
./build_sys/mkrelease.sh -v 999
```

The extension packages then can be found at the `./release/` folder.

## Testing with Tampermonkey

```bash
mkdir -p other/tampermonkey
cd other/tampermonkey
wget https://www.tampermonkey.net/crx/tampermonkey_stable.crx
unzip tampermonkey_stable.crx
sed -i 's/"hohmicmmlneppdcbkhepamlgfdokipcd"/"kjmbknaomholdmpocgplbkgmjdnidinh"/' background.js
```

Start Chrome, go to `chrome://extensions/`, enable Developer mode, and click on `Load unpacked` and select the `other/tampermonkey` folder.
Search for "Tampermonkey" in the extensions list and copy the ID (e.g. `iomhjoeebbnlcpalefgjmleebfffgbmm`).
Now search for `Tampermonkey Editors` and click at `Inspect views: service worker` to open the console and paste the following code after you've changed the ID (`iomh...`) to the one you've copied before:

```javascript
chrome.storage.local.set({ 'config': { externalExtensionIds: [ 'iomhjoeebbnlcpalefgjmleebfffgbmm' ] } })
.then(() => {
    chrome.runtime.reload()
});
```

Now install a userscript in Tampermonkey and click at the `Tampermonkey Editors` icon in the toolbar to see the editor.
