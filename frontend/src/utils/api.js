/**
 * GSTNet API Helper Utility
 * 
 * Dynamically resolves the backend base URL to ensure compatibility across:
 * - Desktop browsers (localhost:5000)
 * - Mobile Chrome browsers on local Wi-Fi networks (192.168.x.x:5000)
 * - Production cloud deployments (Render/Heroku/etc. co-located or custom environments)
 */

export const getApiUrl = (path = '') => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 1. Check for explicit production API URL configuration
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${path}`;
  }

  // 2. Fallback to dynamic host detection
  const { protocol, hostname } = window.location;

  // Local development fallback
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `http://localhost:5000${path}`;
  }

  // Local private network detection (matches 192.168.x.x, 10.x.x.x, 172.16-31.x.x, or *.local)
  const isLocalIP = 
    /^192\.168\./.test(hostname) || 
    /^10\./.test(hostname) || 
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname.endsWith('.local');

  if (isLocalIP) {
    // Routes requests to the same local IP on backend port 5000
    return `${protocol}//${hostname}:5000${path}`;
  }

  // Deployed cloud environment: uses the production Render backend deployment
  return `https://gstnet-gallstone-detection.onrender.com${path}`;
};
