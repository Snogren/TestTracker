# Quick Start - Load Extension in Chrome

## Step 1: Open Chrome Extensions Page
1. Open Google Chrome browser
2. Navigate to: `chrome://extensions/`
3. Or use menu: `⋮ (Menu) → Extensions → Manage Extensions`

## Step 2: Enable Developer Mode
1. Look for "Developer mode" toggle in the **top-right corner**
2. Click to enable it (should turn blue/active)
3. New buttons will appear: "Load unpacked", "Pack extension", "Update"

## Step 3: Load the Extension
1. Click **"Load unpacked"** button
2. Navigate to your project directory
3. Select the **`src`** folder: `c:\Code\DomTrackerSpecd\src`
4. Click "Select Folder"

## Step 4: Verify Installation
You should see the extension card appear with:
- Name: "DOM Interaction Recorder"
- Version: 1.0.0
- Description: "Records user interactions with websites..."
- Blue/gray icon (or default Chrome icon if PNGs not created)

### Extension Card Should Show:
- ✅ Enabled toggle (ON)
- ⚙️ Details button
- 🔄 Reload button (for development)
- 🗑️ Remove button

## Step 5: Pin Extension to Toolbar
1. Click the **puzzle piece icon** in Chrome toolbar (Extensions menu)
2. Find "DOM Interaction Recorder" in the list
3. Click the **pin icon** next to it
4. Extension icon will appear in toolbar for easy access

## Step 6: Test Basic Functionality

### Quick Test (2 minutes):
1. Click the extension icon in toolbar
2. You should see the popup with "Record" button
3. Click "Record"
4. Navigate to any webpage (e.g., google.com)
5. Click any element on the page
6. Accept/reject popup should appear
7. Accept and add annotation (or skip)
8. Click extension icon again → "Stop"
9. JSON file should download

### If It Works:
✅ Extension is loaded correctly!  
✅ Ready for full testing per `quickstart.md`

### If It Doesn't Work:
See "Troubleshooting" section below

---

## Troubleshooting

### Extension Won't Load
**Error: "Manifest file is missing or unreadable"**
- Verify you selected the `src` folder, not the project root
- Check that `manifest.json` exists in `src/`
- Open `manifest.json` and verify it's valid JSON

**Error: "Service worker registration failed"**
- Check `src/background/service-worker.js` exists
- Look at console for syntax errors (click "Errors" in extension card)

### Extension Loads but Doesn't Work
**Popup doesn't open when clicking icon**
- Check console: Right-click extension icon → Inspect popup
- Verify `src/ui/popup/popup.html` exists
- Check for JavaScript errors in popup console

**Content script not capturing events**
- Reload the webpage after loading extension
- Check webpage console (F12) for errors
- Verify content script has permissions in manifest

**Export doesn't work**
- Check Chrome console (F12) in background page
- Click extension card → "Inspect views: service worker"
- Look for "downloads" permission errors

### Common Issues

1. **"Cannot access chrome:// URLs"**
   - This is expected - extension can't run on chrome:// pages
   - Test on regular websites instead

2. **Annotation popup doesn't appear**
   - Check if `annotation.css` is loaded
   - Open webpage console, look for CSS 404 errors
   - Verify `web_accessible_resources` in manifest

3. **Sidepanel doesn't open**
   - Requires Chrome 93+ for sidePanel API
   - Update Chrome if on older version
   - Try right-clicking extension icon → "View Logs" won't work on older Chrome

4. **Events not saving**
   - Check storage permissions in manifest
   - Open background console: Extension card → "Inspect views: service worker"
   - Look for storage quota errors

---

## Development Workflow

### Making Changes
1. Edit files in `src/` directory
2. Return to `chrome://extensions/`
3. Click **"Reload"** button (🔄) on extension card
4. Reload any open webpages to get updated content script
5. Test changes

### Viewing Logs

**Background Service Worker:**
- Extension card → "Inspect views: service worker"
- Shows background script console

**Popup:**
- Right-click extension icon → "Inspect popup"
- Shows popup console

**Content Script:**
- Open any webpage → F12 → Console tab
- Content script logs appear here

**Sidepanel:**
- Open sidepanel → F12
- Sidepanel has its own devtools

---

## Chrome Version Requirements

**Minimum:** Chrome 93+
- sidePanel API requires Chrome 93
- Manifest V3 stable in Chrome 88+

**Recommended:** Latest stable Chrome
- Better performance
- Latest APIs
- Fewer bugs

Check your version:
1. Chrome menu (⋮) → Help → About Google Chrome
2. Or navigate to: `chrome://settings/help`

---

## Next Steps

Once loaded successfully:

1. ✅ **Basic smoke test** (see Step 6 above)
2. 📋 **Full manual testing**: Follow `specs/001-chrome-browser-extension/quickstart.md`
3. 🐛 **Report bugs**: Document in `tests/manual/test-results.md`
4. 🎨 **Create icons**: Convert SVG to PNG (optional)
5. 🚀 **Use it**: Record interactions on real websites

---

## Uninstalling

To remove the extension:
1. Go to `chrome://extensions/`
2. Find "DOM Interaction Recorder"
3. Click **"Remove"** button
4. Confirm removal

Your recorded data will be deleted from Chrome storage.

---

## Getting Help

If you encounter issues:

1. **Check Console Logs**
   - Background, popup, content script consoles
   - Look for red error messages

2. **Verify File Structure**
   - Compare with `STATUS.md` file listing
   - Ensure all files are in correct locations

3. **Review Implementation**
   - See `IMPLEMENTATION_SUMMARY.md` for technical details
   - Check `README.md` for feature descriptions

4. **Test in Incognito**
   - Sometimes extensions conflict
   - Test in incognito mode (enable extension for incognito in extension card → Details)

---

**Ready to test!** 🎉

Load the extension and start recording interactions!
