#!/usr/bin/env node

/**
 * Migration script to add Tidal album cover URLs to existing playlists
 * This reads your exported playlists and adds albumCover URLs by looking up tracks on Tidal
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PLAYLIST_DIR = path.join(__dirname, 'playlist');

// Helper to search Tidal API for track info
function searchTidalTrack(artist, title, album) {
  return new Promise((resolve) => {
    const query = encodeURIComponent(`${artist} ${title}`);
    const url = `https://api.tidal.com/v1/search/tracks?query=${query}&limit=5&countryCode=US`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.items && json.items.length > 0) {
            // Find best match by comparing album names
            const match = json.items.find(item =>
              item.album?.title?.toLowerCase().includes(album.toLowerCase()) ||
              album.toLowerCase().includes(item.album?.title?.toLowerCase())
            ) || json.items[0];

            if (match.album?.cover) {
              const coverUuid = match.album.cover.replace(/-/g, '/');
              const coverUrl = `https://resources.tidal.com/images/${coverUuid}/1280x1280.jpg`;
              resolve(coverUrl);
            } else {
              resolve(null);
            }
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

// Process all playlists
const playlistFiles = fs.readdirSync(PLAYLIST_DIR)
  .filter(f => f.endsWith('.json'))
  .sort();

console.log(`Found ${playlistFiles.length} playlists\n`);

let totalUpdated = 0;

for (const file of playlistFiles) {
  console.log(`Processing: ${file}`);

  const filePath = path.join(PLAYLIST_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < data.tracks.length; i++) {
    const track = data.tracks[i];

    // Skip if already has cover
    if (track.albumCover) {
      skipped++;
      continue;
    }

    // Search Tidal for this track
    const coverUrl = await searchTidalTrack(track.artist, track.title, track.album);

    if (coverUrl) {
      data.tracks[i].albumCover = coverUrl;
      updated++;
      process.stdout.write(`  Updated ${updated}/${data.tracks.length - skipped} tracks\r`);
    }

    // Rate limiting to avoid being blocked
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Save updated playlist
  if (updated > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  ✅ Updated ${updated} tracks (${skipped} already had covers)`);
    totalUpdated += updated;
  } else {
    console.log(`  ℹ️  No updates needed`);
  }
}

console.log(`\n✅ Total tracks updated: ${totalUpdated}`);
console.log(`💡 Now run: node generate-viewer.js`);
