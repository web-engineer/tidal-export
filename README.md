# Tidal Playlist Export

Export your Tidal playlists (including private ones) to JSON format with complete metadata.

Tired of feeling held to ransome and continuing a subscription just to preserve
a playlist? This should help you make a backup of the tracks you had in your
lists so you have a record of them.

## Features

- ✅ Complete track metadata (ISRCs, track IDs, durations, BPM, etc.)
- ✅ Handles large playlists (700+ tracks)
- ✅ Clean, minimal JSON output
- ✅ Simple HTML viewer with album artwork
- ✅ Works via browser console (no API keys needed)

Note - this isn't perfect, you might need to try a couple of times. If
sometimes it captures many more tracks than expected when you export.
If that happens I found clicking the playlist again and trying again
usually gets a fresh export.

I did try using the API's to export the playlists but they were buggy and
only partially working.

## Quick Start

### 1. Extract Playlists from Tidal

See [EXTRACT_FROM_BROWSER.md](EXTRACT_FROM_BROWSER.md) for detailed instructions.

**Quick version:**
1. Open https://listen.tidal.com in your browser
2. Open DevTools Console (F12)
3. Paste the contents of `tidal-devtool-playlists.js`
4. Navigate to a playlist and scroll to load all tracks
5. Run `exportPlaylistData()` - data is copied to clipboard
6. Save to `playlist/playlistname.json`
7. Repeat for each playlist

### 2. Generate HTML Viewer

Once you've extracted all your playlists:

```bash
node generate-viewer.js
```

This will:
- Read all JSON files from `playlist/` folder
- Download album artwork from iTunes API
- Generate `playlists.html` - a beautiful, browsable interface

Then open `playlists.html` in your browser!

## Project Structure

```
playlist-export/
├── playlist/              # Your exported playlists (JSON)
├── covers/                # Album artwork (auto-generated)
├── tidal-devtool-playlists.js  # Browser console script
├── generate-viewer.js     # Generate HTML viewer
├── playlists.html         # Generated viewer (open in browser)
├── EXTRACT_FROM_BROWSER.md     # Detailed extraction guide
└── README.md
```

## Exported Playlist Format

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
      "explicit": false
    }
  ]
}
```

## Why Browser Console?

Tidal's API doesn't allow third-party applications to access user playlists (requires deprecated OAuth scopes). The browser console method:
- Captures actual API responses as you browse
- Works with private playlists
- Gets complete metadata (ISRCs, etc.)
- No API keys or authentication setup needed

## Future Plans

- [ ] Spotify export support
- [ ] Beatport export support
- [ ] Cross-platform playlist conversion
- [ ] Automated backup scheduling

## License

MIT
