#!/usr/bin/env node

/**
 * Generate HTML viewer for exported playlists
 * Fetches album art from iTunes API and creates a browsable interface
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYLIST_DIR = path.join(__dirname, 'playlist');
const COVERS_DIR = path.join(__dirname, 'covers');
const OUTPUT_HTML = path.join(__dirname, 'playlists.html');

// Create covers directory if it doesn't exist
if (!fs.existsSync(COVERS_DIR)) {
  fs.mkdirSync(COVERS_DIR);
}

// Helper to download image
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

// Search iTunes API for album art (fallback)
async function getAlbumArtFromItunes(artist, album) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(`${artist} ${album}`);
    const url = `https://itunes.apple.com/search?term=${query}&entity=album&limit=1`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            // Get high-res version (600x600)
            const artworkUrl = json.results[0].artworkUrl100.replace('100x100', '600x600');
            resolve(artworkUrl);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Get album art URL - prefer Tidal, fallback to iTunes
async function getAlbumArt(track) {
  // First, check if we have Tidal album cover URL
  if (track.albumCover) {
    return track.albumCover;
  }

  // Fallback to iTunes API
  return await getAlbumArtFromItunes(track.artist, track.album);
}

// Read all playlists
const playlistFiles = fs.readdirSync(PLAYLIST_DIR)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`Found ${playlistFiles.length} playlists\n`);

const playlists = [];
const albumArtCache = new Map();

// Process each playlist
for (const file of playlistFiles) {
  console.log(`Processing: ${file}`);

  const data = JSON.parse(fs.readFileSync(path.join(PLAYLIST_DIR, file), 'utf-8'));
  playlists.push({
    filename: file,
    ...data
  });

  // Get unique albums for cover art
  const albums = new Map();
  for (const track of data.tracks) {
    const key = `${track.artist}|||${track.album}`;
    if (!albums.has(key) && !albumArtCache.has(key)) {
      albums.set(key, track);
    }
  }

  // Fetch album art for this playlist
  let fetched = 0;
  for (const [key, track] of albums) {
    const coverFile = `${track.artist.replace(/[^a-z0-9]/gi, '_')}_${track.album.replace(/[^a-z0-9]/gi, '_')}.jpg`;
    const coverPath = path.join(COVERS_DIR, coverFile);

    if (fs.existsSync(coverPath)) {
      albumArtCache.set(key, coverFile);
      continue;
    }

    const artUrl = await getAlbumArt(track);
    if (artUrl) {
      try {
        await downloadImage(artUrl, coverPath);
        albumArtCache.set(key, coverFile);
        fetched++;
        process.stdout.write(`  Downloaded ${fetched} covers\r`);
      } catch (e) {
        // Skip if download fails
      }
    }

    // Rate limiting (only needed for iTunes API)
    if (!track.albumCover) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  if (fetched > 0) {
    console.log(`  Downloaded ${fetched} covers`);
  }
}

console.log(`\nTotal covers downloaded: ${albumArtCache.size}`);

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Tidal Playlists</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .stats {
      color: #888;
      margin-bottom: 30px;
      font-size: 1.1rem;
    }

    .playlists {
      display: grid;
      gap: 20px;
    }

    .playlist {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #333;
    }

    .playlist-header {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      cursor: pointer;
      align-items: center;
    }

    .playlist-cover {
      width: 120px;
      height: 120px;
      border-radius: 8px;
      object-fit: cover;
      background: #333;
      flex-shrink: 0;
    }

    .playlist-info {
      flex: 1;
    }

    .playlist-name {
      font-size: 1.8rem;
      font-weight: bold;
      margin-bottom: 8px;
    }

    .playlist-meta {
      color: #888;
      margin-bottom: 8px;
    }

    .playlist-description {
      color: #aaa;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .tracks {
      display: none;
      border-top: 1px solid #333;
      padding-top: 20px;
    }

    .tracks.show {
      display: block;
    }

    .track {
      display: grid;
      grid-template-columns: 40px 50px 1fr 2fr 2fr 80px;
      gap: 15px;
      padding: 10px;
      align-items: center;
      border-radius: 6px;
      transition: background 0.2s;
    }

    .track:hover {
      background: #252525;
    }

    .track-pos {
      color: #666;
      text-align: right;
    }

    .track-cover {
      width: 40px;
      height: 40px;
      border-radius: 4px;
      object-fit: cover;
      background: #333;
    }

    .track-title {
      font-weight: 500;
    }

    .track-artist {
      color: #aaa;
    }

    .track-album {
      color: #888;
      font-size: 0.9rem;
    }

    .track-duration {
      color: #666;
      text-align: right;
    }

    .explicit {
      background: #666;
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 0.7rem;
      font-weight: bold;
      display: inline-block;
      margin-left: 6px;
    }

    @media (max-width: 768px) {
      .track {
        grid-template-columns: 30px 40px 1fr 60px;
        gap: 10px;
      }

      .track-artist,
      .track-album {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>My Tidal Playlists</h1>
    <div class="stats">
      ${playlists.length} playlists • ${playlists.reduce((sum, p) => sum + p.totalTracks, 0)} tracks
    </div>

    <div class="playlists">
      ${playlists.map((playlist, idx) => {
        const firstTrack = playlist.tracks[0];
        const coverKey = firstTrack ? `${firstTrack.artist}|||${firstTrack.album}` : null;
        const coverFile = coverKey && albumArtCache.has(coverKey) ? albumArtCache.get(coverKey) : null;

        return `
          <div class="playlist">
            <div class="playlist-header" onclick="togglePlaylist(${idx})">
              ${coverFile ?
                `<img src="covers/${coverFile}" alt="${playlist.name}" class="playlist-cover">` :
                `<div class="playlist-cover"></div>`
              }
              <div class="playlist-info">
                <div class="playlist-name">${playlist.name}</div>
                <div class="playlist-meta">
                  ${playlist.totalTracks} tracks • ${Math.floor(playlist.tracks.reduce((sum, t) => sum + t.duration, 0) / 60)} minutes
                </div>
                ${playlist.description ? `<div class="playlist-description">${playlist.description}</div>` : ''}
              </div>
            </div>
            <div class="tracks" id="tracks-${idx}">
              ${playlist.tracks.map(track => {
                const trackKey = `${track.artist}|||${track.album}`;
                const trackCover = albumArtCache.has(trackKey) ? albumArtCache.get(trackKey) : null;
                const duration = `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}`;

                return `
                  <div class="track">
                    <div class="track-pos">${track.position}</div>
                    ${trackCover ?
                      `<img src="covers/${trackCover}" alt="${track.album}" class="track-cover">` :
                      `<div class="track-cover"></div>`
                    }
                    <div class="track-title">
                      ${track.title}${track.explicit ? '<span class="explicit">E</span>' : ''}
                    </div>
                    <div class="track-artist">${track.artist}</div>
                    <div class="track-album">${track.album}</div>
                    <div class="track-duration">${duration}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  </div>

  <script>
    function togglePlaylist(idx) {
      const tracks = document.getElementById('tracks-' + idx);
      tracks.classList.toggle('show');
    }
  </script>
</body>
</html>`;

fs.writeFileSync(OUTPUT_HTML, html);

console.log(`\n✅ Generated: ${OUTPUT_HTML}`);
console.log(`📁 Album covers: ${COVERS_DIR}/`);
console.log(`\n🌐 Open playlists.html in your browser to view!`);
