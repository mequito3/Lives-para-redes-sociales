/**
 * Socket.IO Shim Client
 * 
 * Since we are moving to a PHP backend on Hostinger, WebSockets are disabled 
 * to ensure stability. This shim satisfies the imports in App.tsx while 
 * the application continues to function via the already implemented 3-second polling.
 */

// Dummy function to initialize
export function initializeSocket() {
  console.log('🔌 Socket.IO Shim: Polling is being used as the primary data source on Hostinger.');
}

// Event listeners - these do nothing as polling handles the updates
export function onSongsUpdated(_callback: (songs: any[]) => void) {
  // We rely on polling in App.tsx:389
}

export function onStatusUpdated(_callback: (status: any) => void) {
  // We rely on polling in App.tsx:389
}

// Cleanup functions
export function offSongsUpdated() {}
export function offStatusUpdated() {}

// Request functions
export function requestSongs() {}
export function requestStatus() {}
