// Initialize or reset playlist data
function resetPlaylistData() {
  window.tidalPlaylistData = {
    tracks: [],
    metadata: null,
    itemsResponses: [],
    currentPlaylistId: null,
    isCapturing: true  // Start capturing immediately
  };
}

(function() {
  // Reset on first load
  resetPlaylistData();

  // Override XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', function() {
      const url = this._url;

      // Capture playlist metadata
      if (url.includes('/playlists/') && !url.includes('/items') && this.responseText) {
        try {
          const data = JSON.parse(this.responseText);
          const playlistInfo = data.data || data;
          const newPlaylistId = playlistInfo.uuid || playlistInfo.id;

          // If navigated to a different playlist, reset data immediately
          if (window.tidalPlaylistData.currentPlaylistId &&
              newPlaylistId !== window.tidalPlaylistData.currentPlaylistId) {
            console.log('🔄 New playlist detected, resetting data...');
            resetPlaylistData();
            window.tidalPlaylistData.isCapturing = true;
          }

          if (window.tidalPlaylistData.isCapturing) {
            window.tidalPlaylistData.currentPlaylistId = newPlaylistId;
            window.tidalPlaylistData.metadata = data;
            console.log('📋 Captured playlist metadata:', playlistInfo.title || playlistInfo.name);
          }
        } catch (e) {}
      }

      // Capture playlist items (tracks) - this is paginated!
      if (url.includes('/playlists/') && url.includes('/items')) {
        try {
          const data = JSON.parse(this.responseText);
          // Get playlist ID from URL to verify we're still on the same playlist
          const urlPlaylistId = url.match(/playlists\/([a-f0-9-]+)/)?.[1];

          // Only capture if we're capturing AND it matches current playlist
          if (window.tidalPlaylistData.isCapturing &&
              (!window.tidalPlaylistData.currentPlaylistId ||
               urlPlaylistId === window.tidalPlaylistData.currentPlaylistId)) {
            window.tidalPlaylistData.itemsResponses.push(data);

            const items = data.data || data.items || [];
            const totalCaptured = window.tidalPlaylistData.itemsResponses.reduce((sum, r) => sum + (r.data?.length || r.items?.length || 0), 0);
            console.log(`🎵 Captured ${items.length} tracks (Total: ${totalCaptured})`);
          }
        } catch (e) {}
      }
    });

    return originalSend.apply(this, arguments);
  };

  // Also override fetch
  const originalFetch = window.fetch;
  window.fetch = function() {
    return originalFetch.apply(this, arguments).then(response => {
      const url = arguments[0];

      if (typeof url === 'string') {
        // Clone response to read it
        const clonedResponse = response.clone();

        // Capture playlist metadata
        if (url.includes('/playlists/') && !url.includes('/items')) {
          clonedResponse.json().then(data => {
            const playlistInfo = data.data || data;
            const newPlaylistId = playlistInfo.uuid || playlistInfo.id;

            // If navigated to a different playlist, reset data immediately
            if (window.tidalPlaylistData.currentPlaylistId &&
                newPlaylistId !== window.tidalPlaylistData.currentPlaylistId) {
              console.log('🔄 New playlist detected, resetting data...');
              resetPlaylistData();
              window.tidalPlaylistData.isCapturing = true;
            }

            if (window.tidalPlaylistData.isCapturing) {
              window.tidalPlaylistData.currentPlaylistId = newPlaylistId;
              window.tidalPlaylistData.metadata = data;
              console.log('📋 Captured playlist metadata:', playlistInfo.title || playlistInfo.name);
            }
          }).catch(() => {});
        }

        // Capture playlist items
        if (url.includes('/playlists/') && url.includes('/items')) {
          clonedResponse.json().then(data => {
            // Get playlist ID from URL to verify we're still on the same playlist
            const urlPlaylistId = url.match(/playlists\/([a-f0-9-]+)/)?.[1];

            // Only capture if we're capturing AND it matches current playlist
            if (window.tidalPlaylistData.isCapturing &&
                (!window.tidalPlaylistData.currentPlaylistId ||
                 urlPlaylistId === window.tidalPlaylistData.currentPlaylistId)) {
              window.tidalPlaylistData.itemsResponses.push(data);

              const items = data.data || data.items || [];
              const totalCaptured = window.tidalPlaylistData.itemsResponses.reduce((sum, r) => sum + (r.data?.length || r.items?.length || 0), 0);
              console.log(`🎵 Captured ${items.length} tracks (Total: ${totalCaptured})`);
            }
          }).catch(() => {});
        }
      }

      return response;
    });
  };

  // Make reset function globally accessible
  window.resetTidalPlaylistData = resetPlaylistData;

  console.log('✅ API interception ready!');
  console.log('');
  console.log('📝 Workflow:');
  console.log('  1. Navigate to a playlist (or click it in sidebar)');
  console.log('  2. Scroll to bottom to load all tracks');
  console.log('  3. Run: exportPlaylistData()');
  console.log('  4. Repeat for next playlist');
  console.log('');
  console.log('💡 Use checkStatus() to see captured data');
  console.log('💡 Filename auto-generated from playlist name');
})();

// Start capturing playlist data (for manual control if needed)
function startCapture() {
  const wasCapturing = window.tidalPlaylistData.isCapturing;
  window.tidalPlaylistData.isCapturing = true;

  if (!wasCapturing) {
    console.log('🎬 Started capturing!');
  } else {
    console.log('ℹ️  Already capturing');
  }

  console.log('📜 Scroll down to load all tracks...');
  console.log('⏹️  When ready, run: exportPlaylistData()');
}

// Check current capture status
function checkStatus() {
  const data = window.tidalPlaylistData;
  const totalCaptured = data.itemsResponses.reduce((sum, r) => sum + (r.data?.length || r.items?.length || 0), 0);

  console.log('');
  console.log('📊 Current Status:');
  console.log(`  Capturing: ${data.isCapturing ? '✅ Active' : '❌ Inactive'}`);
  console.log(`  Playlist: ${data.metadata ? (data.metadata.data?.title || data.metadata.title || 'Captured') : 'Not yet'}`);
  console.log(`  Tracks captured: ${totalCaptured}`);
  console.log(`  API responses: ${data.itemsResponses.length}`);
  console.log('');

  // Debug info
  if (data.itemsResponses.length > 0) {
    console.log('📦 Response details:');
    data.itemsResponses.forEach((resp, idx) => {
      const items = resp.data || resp.items || [];
      console.log(`  Response ${idx + 1}: ${items.length} tracks`);
    });
    console.log('');
  }

  if (!data.isCapturing) {
    console.log('💡 Run startCapture() to begin');
  } else if (totalCaptured === 0) {
    console.log('💡 Scroll down to load tracks');
  } else {
    console.log('💡 Keep scrolling or run exportPlaylistData()');
  }

  return { totalCaptured, responses: data.itemsResponses.length, capturing: data.isCapturing };
}
function exportPlaylistData(fileName) {
  console.log('🔍 Processing captured data...');

  // Get metadata
  const metadata = window.tidalPlaylistData.metadata;
  if (!metadata) {
    console.error('❌ No playlist metadata captured yet!');
    console.log('💡 Solution: Wait 1-2 seconds after page loads, then try again');
    console.log('💡 Or: Click the playlist link again to force reload');
    return;
  }

  // Extract playlist info from metadata
  const playlistInfo = metadata.data || metadata;
  const playlistId = playlistInfo.uuid || playlistInfo.id || window.location.pathname.match(/playlist\/([a-f0-9-]+)/)?.[1];
  const playlistName = playlistInfo.title || playlistInfo.name || 'Unknown Playlist';
  const playlistDescription = playlistInfo.description || '';

  // Warn if metadata looks wrong or track count seems off
  if (playlistName === 'Unknown Playlist' || !playlistName) {
    console.error('❌ Playlist metadata not loaded properly!');
    console.log('💡 Click the playlist link in the sidebar again, wait a moment, then retry');
    return;
  }

  // Auto-generate filename from playlist name if not provided
  if (!fileName) {
    fileName = playlistName.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  // Combine all track data from paginated responses
  let allTracks = [];
  window.tidalPlaylistData.itemsResponses.forEach(response => {
    const items = response.data || response.items || [];
    // Filter to only include items that are actually part of this playlist
    const playlistItems = items.filter(item => {
      // Check if item has itemUuid (only playlist items have this)
      const hasItemUuid = !!(item.itemUuid || (item.item && item.item.itemUuid));
      return hasItemUuid;
    });
    allTracks = allTracks.concat(playlistItems);
  });

  // Remove duplicates based on track ID and itemUuid
  const uniqueTracks = [];
  const seenIds = new Set();

  allTracks.forEach(item => {
    const track = item.item || item.resource || item;
    const trackId = track.id;
    const itemUuid = track.itemUuid || item.itemUuid;
    const uniqueKey = itemUuid || trackId;

    if (uniqueKey && !seenIds.has(uniqueKey)) {
      seenIds.add(uniqueKey);
      uniqueTracks.push(item);
    }
  });

  console.log(`📋 Playlist: ${playlistName}`);
  console.log(`🎵 Total tracks captured: ${allTracks.length}`);
  console.log(`🔍 Unique tracks: ${uniqueTracks.length}`);
  console.log(`🗑️  Duplicates removed: ${allTracks.length - uniqueTracks.length}`);
  console.log(`📍 ID: ${playlistId}`);

  // Sort tracks by index (playlist order)
  uniqueTracks.sort((a, b) => {
    const trackA = a.item || a.resource || a;
    const trackB = b.item || b.resource || b;
    return (trackA.index || 0) - (trackB.index || 0);
  });

  // Process tracks - keep only essential data
  const tracks = uniqueTracks.map((item, index) => {
    // Handle different API response formats
    const track = item.item || item.resource || item;

    // Extract album cover URL from Tidal
    let albumCover = null;
    if (track.album?.cover) {
      // Convert Tidal cover UUID to URL
      // Format: https://resources.tidal.com/images/{uuid-with-slashes}/1280x1280.jpg
      const coverUuid = track.album.cover.replace(/-/g, '/');
      albumCover = `https://resources.tidal.com/images/${coverUuid}/1280x1280.jpg`;
    }

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
      ...(track.bpm && { bpm: track.bpm }),
      ...(albumCover && { albumCover })
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
  console.log(`📋 Data copied to clipboard!`);
  console.log(`📄 Save as: ${fileName}.json`);
  console.log('');

  // Log the playlist data to console for easy inspection
  console.log('Playlist data:');
  console.log(playlist);
  console.log('');

  // Clear data for next playlist BEFORE returning
  console.log(`🔄 Data cleared - ready for next playlist!`);
  console.log(`💡 Navigate to next playlist and run: resetCapture()`);
  window.resetTidalPlaylistData();

  // Return the playlist for inspection if needed
  return playlist;
}
