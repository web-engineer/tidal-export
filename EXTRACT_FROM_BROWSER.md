# Extract Tidal Playlists Using Browser Console

Since Tidal's API doesn't allow third-party access to user playlists, we can extract the data directly from the web player using browser DevTools.

## Quick Start

### Step 1: Load the Script Once

1. Go to https://listen.tidal.com
2. Open DevTools: Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to the **Console** tab
4. Copy the entire contents of **`tidal-devtool-playlists.js`** and paste it into the console
5. Press Enter

You should see: `✅ API interception ready!`

### Step 2: Extract Each Playlist

For each playlist (repeat this workflow):

1. **Navigate** to the playlist in Tidal
2. **Run** `startCapture()` - this begins capturing API data
3. **Scroll down** all the way to load ALL tracks (console shows progress)
4. **Run** `exportPlaylistData()` - exports and clears data
5. **Save** the JSON from your clipboard to `playlist/filename.json`
6. **Repeat** - navigate to next playlist and start from step 1

### Step 3: Check Status (Optional)

At any time, run `checkStatus()` to see:
- Whether capture is active
- Current playlist name
- Number of tracks captured
- What to do next

## Tips

- **Run `startCapture()` first!** - Capture is now manual to ensure all tracks are caught
- **Scroll completely** - Load all tracks before running `exportPlaylistData()`
- **Watch the console** - You'll see messages showing tracks being captured
- **Use `checkStatus()`** - See how many tracks captured so far
- **Save immediately** - Paste clipboard data into a file before next playlist

## Available Commands

- **`startCapture()`** - Begin capturing data for current playlist
- **`exportPlaylistData()`** - Export captured data to clipboard and reset
- **`checkStatus()`** - View current capture status and track count
- **`resetTidalPlaylistData()`** - Manual reset if needed (rarely required)

---

## What the Script Does

```javascript
// Intercept Tidal API calls to capture complete playlist data
## Technical Details

This method:
- ✅ Captures **actual API responses** with complete data (ISRCs, track IDs, etc.)
- ✅ Handles **pagination automatically** - captures all API calls as you scroll
- ✅ Gets **all tracks** even in 700+ track playlists
- ✅ Bypasses the DOM scraping issues
- ✅ Works exactly like Tidal's web player does internally
- ✅ Auto-detects playlist changes and resets data
- ✅ Exports clean JSON (no verbose raw data)
```

### Step 3: Load the Playlist

1. Navigate to your playlist (or refresh if already there)
2. **Scroll all the way down** - keep scrolling until no more tracks load
3. You'll see console messages showing tracks being captured

### Step 4: Export the Data

Once you've scrolled through the entire playlist, run this:
```javascript
function exportPlaylistData() {
  console.log('🔍 Processing captured data...');

  // Get metadata
  const metadata = window.tidalPlaylistData.metadata;
  if (!metadata) {
    console.error('❌ No playlist metadata captured! Make sure you navigated to/refreshed the playlist page.');
    return;
  }

  // Extract playlist info from metadata
  const playlistInfo = metadata.data || metadata;
  const playlistId = playlistInfo.uuid || playlistInfo.id || window.location.pathname.match(/playlist\/([a-f0-9-]+)/)?.[1];
  const playlistName = playlistInfo.title || playlistInfo.name || 'Unknown Playlist';
  const playlistDescription = playlistInfo.description || '';

  // Combine all track data from paginated responses
  let allTracks = [];
  window.tidalPlaylistData.itemsResponses.forEach(response => {
    const items = response.data || response.items || [];
    allTracks = allTracks.concat(items);
  });

  console.log(`📋 Playlist: ${playlistName}`);
  console.log(`🎵 Total tracks captured: ${allTracks.length}`);
  console.log(`� ID: ${playlistId}`);

  // Sort tracks by index (playlist order)
  allTracks.sort((a, b) => {
    const trackA = a.item || a.resource || a;
    const trackB = b.item || b.resource || b;
    return (trackA.index || 0) - (trackB.index || 0);
  });

  // Process tracks - keep only essential data
  const tracks = allTracks.map((item, index) => {
    // Handle different API response formats
    const track = item.item || item.resource || item;

    return {
      position: index + 1,
      id: track.id || '',
      title: track.title || 'Unknown',
      artist: track.artist?.name || track.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      album: track.album?.title || track.album?.name || 'Unknown Album',
      duration: track.duration || 0,
      isrc: track.isrc || '',
      explicit: track.explicit || false,
      // Optional useful fields
      ...(track.version && { version: track.version }),
      ...(track.album?.releaseDate && { releaseDate: track.album.releaseDate }),
      ...(track.bpm && { bpm: track.bpm })
    };
  });

  const playlist = {
    id: playlistId,
    name: playlistName,
    description: playlistDescription,
    created: playlistInfo.created || playlistInfo.createdAt || new Date().toISOString(),
    lastModified: playlistInfo.lastModified || playlistInfo.lastUpdatedAt || new Date().toISOString(),
    totalTracks: tracks.length,
    public: playlistInfo.publicPlaylist || playlistInfo.public || false,
    tracks: tracks
  };

  // Copy to clipboard
  copy(JSON.stringify(playlist, null, 2));

  console.log(`\n✅ Extraction complete!`);
  console.log(`📝 Tracks: ${playlist.totalTracks}`);
  console.log(`\n📋 Data copied to clipboard!`);
  console.log(`📄 Save as: ${playlistName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`);

  // Also return it so you can inspect
  console.log('\nPlaylist Data:');
  console.log(playlist);

  return playlist;
}

// Auto-run if data is already captured
if (window.tidalPlaylistData && window.tidalPlaylistData.itemsResponses.length > 0) {
  console.log('\n⚠️  Data already captured! Run exportPlaylistData() to extract it.');
}
```

**That's it!** The data from the actual API (with ISRCs and everything) will be copied to your clipboard.
```

### Step 5: Save and Repeat

1. Paste the JSON into a new file in your `playlist/` directory
2. Save with the suggested filename
3. For the next playlist, just refresh the page and repeat steps 1-4

## What the Script Does

The `tidal-devtool-playlists.js` script:

1. **Intercepts API calls** - Hooks into `XMLHttpRequest` and `fetch` to capture Tidal's internal API responses
2. **Captures playlist metadata** - Gets playlist name, description, ID, etc.
3. **Captures all tracks** - Stores paginated track data as you scroll
4. **Auto-detects navigation** - Resets data when you navigate to a different playlist
5. **Exports clean JSON** - Processes and formats data, copies to clipboard
6. **Auto-clears after export** - Ready for the next playlist immediately

## Output Format

The exported JSON is clean and minimal:

```json
{
  "id": "playlist-uuid",
  "name": "Playlist Name",
  "description": "...",
  "totalTracks": 653,
  "tracks": [
    {
      "position": 1,
      "id": 12345678,
      "title": "Track Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": 257,
      "isrc": "ABCDE1234567",
      "explicit": false,
      "version": "Remix Name",
      "releaseDate": "2020-01-01",
      "bpm": 123
    }
  ]
}
```

Optional fields (version, releaseDate, bpm) are only included when available.

## Troubleshooting

### "No playlist metadata captured"
- Make sure you're on a playlist page (URL should contain `/playlist/`)
- Try refreshing the page after loading the script

### Not all tracks captured
- Scroll all the way to the bottom before exporting
- Wait for the loading spinner to finish
- Check console messages to confirm total tracks captured

### Data from previous playlist
- This shouldn't happen anymore - data auto-resets on navigation
- If it does, manually run: `resetTidalPlaylistData()`

## Technical Details

This method:
- ✅ Captures **actual API responses** with complete data (ISRCs, track IDs, etc.)
- ✅ Handles **pagination automatically** - captures all API calls as you scroll
- ✅ Gets **all tracks** even in 700+ track playlists
- ✅ Bypasses the DOM scraping issues
- ✅ Works exactly like Tidal's web player does internally

## Automated Batch Extraction

If you want to extract ALL your playlists at once, use this script on your playlists page:

### On https://listen.tidal.com/collection/playlists

```javascript
// Extract all playlist links
const playlistLinks = Array.from(document.querySelectorAll('a[href*="/playlist/"]'))
  .map(link => ({
    name: link.querySelector('span[class*="wave-text"]')?.textContent?.trim() || 'Unknown',
    url: link.href,
    uuid: link.href.match(/playlist\/([a-f0-9-]+)/)?.[1]
  }))
  .filter((item, index, self) =>
    self.findIndex(p => p.uuid === item.uuid) === index
  );

console.log(`Found ${playlistLinks.length} playlists\n`);

// Create instructions
const instructions = `
INSTRUCTIONS TO EXTRACT ALL PLAYLISTS:
======================================

1. Copy this list of URLs (already in clipboard)
2. For each URL:
   - Open it in a new tab
   - Wait for all tracks to load (scroll if needed)
   - Open DevTools Console (F12)
   - Paste the extraction script (see EXTRACTION_SCRIPT.md)
   - Save the JSON output to a file

Playlists to extract:
`;

playlistLinks.forEach((pl, i) => {
  console.log(`${i + 1}. ${pl.name}`);
  console.log(`   ${pl.url}\n`);
});

// Copy URLs to clipboard for easy access
const urlList = playlistLinks.map(pl => pl.url).join('\n');
copy(urlList);

console.log('\n✅ All playlist URLs copied to clipboard!');
console.log('📝 Open each URL and run the extraction script\n');
console.log('Total playlists to extract:', playlistLinks.length);
```

## Tips

- **Make sure all tracks are loaded** - Scroll down if the playlist has many tracks
- **Wait for the page to fully load** - Some data might not be immediately available
- **Check the console for errors** - If extraction fails, the script will show what went wrong
- **Save files immediately** - Don't lose the extracted data
- **Name files consistently** - Use the format: `playlistname_uuid.json`

## Troubleshooting

### "No tracks found"
- Scroll down the page to load all tracks
- Wait a few seconds and try again
- Check if you're on the right page (should be a playlist view)

### "Cannot read property"
- The Tidal UI might have changed
- Check the browser console for errors
- You may need to adjust the selectors in the script

### Missing track information
- Some data might not be visible on the page
- Fill in missing fields manually if needed
- Track IDs might not be available through the UI

## Alternative: Network Tab Method

If the console method doesn't work well, you can also:

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Navigate to a playlist
4. Look for API calls to `playlists` or `tracks`
5. Click on the response to see the JSON data
6. Copy the response directly

This might give you more complete data including ISRCs, track IDs, etc.
