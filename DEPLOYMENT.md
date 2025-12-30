# Local Deployment with GitHub Pages + ngrok

This version of New Avalon: Skirmish is designed for local deployment where:
- **Static client** is hosted on GitHub Pages (free hosting)
- **Game server** runs locally and is accessed via ngrok tunnel

## Architecture

```
GitHub Pages (Static Client)
     ↓
User opens game in browser
     ↓
Connects to WebSocket via ngrok URL
     ↓
ngrok tunnel → Local server (localhost:8822)
```

## Quick Start

### 1. Set up the Game Server (Local)

```bash
# Install dependencies
npm install

# Start the server (runs on port 8822)
npm run dev
```

### 2. Set up ngrok

```bash
# Install ngrok first: https://ngrok.com/download

# Start ngrok tunnel for port 8822
ngrok http 8822
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`).

### 3. Connect Players

1. Open the game on GitHub Pages
2. Click **Settings** (gear icon)
3. Enter the ngrok URL with `wss://` protocol:
   - `wss://abc123.ngrok-free.app` (note the **wss** prefix)
4. Click **Save & Apply**
5. The game will now connect to your local server

## Deployment

### Deploy Client to GitHub Pages

```bash
# Build for GitHub Pages (adjust BASE_URL if your repo name differs)
npm run build:gh-pages

# The build output will be in the 'dist' directory
# Deploy this to GitHub Pages via:
# 1. GitHub UI: Settings > Pages > Source > Deploy from a branch
# 2. Or using gh-pages CLI: npx gh-pages -d dist
```

**Important:** If your repository name is not `newavalon.xyz`, update the `BASE_URL`:
```bash
BASE_URL=/your-repo-name/ npm run build:client
```

### Alternative: Local Build with Static Server

```bash
# Build for local testing
npm run build:client

# Serve with any static server
npx serve dist
# Or using Python: python -m http.server 8080 -d dist
```

## Environment Variables

Create a `.env` file (see `.env.example`):

```bash
# Base URL for client build (for GitHub Pages)
BASE_URL=/newavalon.xyz/

# Server port (default: 8822)
PORT=8822
```

## Server URL Configuration

Players need to configure the WebSocket URL in Settings:

| Scenario | URL Format |
|----------|------------|
| Local development | `ws://localhost:8822` |
| ngrok (HTTP) | `ws://abc123.ngrok-free.app` |
| ngrok (HTTPS) | `wss://abc123.ngrok-free.app` |
| Custom server | `wss://your-domain.com` |

**Note:** The game auto-converts `http://` → `ws://` and `https://` → `wss://` for convenience.

## ngrok Tips

### Free ngrok Limitations
- URL changes on each restart
- Concurrent connection limits
- Session timeout

### Recommended ngrok Configuration
Create `ngrok.yml` for better experience:
```yaml
version: "3"
authtoken: YOUR_AUTH_TOKEN

tunnels:
  skirmish:
    proto: http
    addr: 8822
    bind_tls: true
    inspect: false
    web_addr: false
```

Then run: `ngrok start skirmish`

### Using ngrok with a Domain (Paid)
With paid ngrok, you can reserve a domain:
```bash
ngrok http 8822 --domain=your-reserved-domain.ngrok.io
```

## Troubleshooting

### Connection Issues

**"Disconnected" status:**
1. Verify server is running (`npm run dev`)
2. Check ngrok is active and shows the correct port
3. Verify URL in Settings uses correct protocol (`ws://` or `wss://`)

**ngrok URL changes:**
- Each ngrok restart generates a new URL
- Players need to update the URL in Settings
- Consider paid ngrok for static domain

### Build Issues

**Assets not loading on GitHub Pages:**
- Ensure `BASE_URL` matches your repo name
- Must end with `/` (e.g., `/newavalon.xyz/`)

## Development Workflow

```bash
# Terminal 1: Run dev server
npm run dev

# Terminal 2: Run ngrok
ngrok http 8822

# Terminal 3: Build for testing (optional)
npm run build:client && npx serve dist
```

## Security Notes

- ngrok exposes your local server publicly
- Anyone with the URL can attempt to connect
- Consider implementing authentication for production use
- GitHub Pages URLs are public

## Future Improvements

- Deploy server to a cloud platform (Railway, Render, Fly.io)
- Use a static domain for stable connections
- Implement lobby/authentication system
- Add SSL certificates for self-hosted server
