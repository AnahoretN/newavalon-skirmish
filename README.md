<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# New Avalon: Skirmish

A dynamic tactical duel card game played on a limited grid field. Deploy Units and Commands to capture control over key battle lines.

## Play Online

The game is available at: **[anahoretn.github.io/newavalon.xyz](https://anahoretn.github.io/newavalon.xyz/)**

To play, you'll need to connect to a game server. Click **Settings** and enter the server URL provided by the game host.

## Features

- **Tactical Grid Combat**: Position-based card game on dynamic board sizes (5x5, 6x6, 7x7)
- **Real-time Multiplayer**: WebSocket-based gameplay for 2-4 players
- **Multiple Game Modes**: Free-for-all, 2v2 team battles, and 3v1
- **Card Abilities**: Deploy, Setup, Commit, and Passive abilities
- **Dynamic Status System**: Support, Threat, and tactical positioning
- **Multi-language Support**: English, Russian, Serbian
- **Custom Decks**: Build and customize your own decks
- **Responsive Design**: Works on desktop and mobile

## Quick Start (Host a Game)

### 1. Run the Server Locally

```bash
# Install dependencies
npm install

# Start the game server (port 8822)
npm run dev
```

### 2. Expose Server with ngrok

```bash
# Install ngrok from https://ngrok.com/download
# Start tunnel for port 8822
ngrok http 8822
```

Copy the ngrok URL (e.g., `https://abc123.ngrok-free.app`).

### 3. Share with Players

Tell players to:
1. Open the game at [anahoretn.github.io/newavalon.xyz](https://anahoretn.github.io/newavalon.xyz/)
2. Click **Settings** (gear icon)
3. Enter: `wss://abc123.ngrok-free.app` (use `wss://` for https URLs)
4. Click **Save & Apply**

## Running Locally (Full Setup)

For development or offline play, run both client and server locally:

```bash
# Development mode (server + client with HMR)
npm run dev
```

The game will be available at `http://localhost:8080`

## Build for Deployment

### GitHub Pages (Client Only)

```bash
# Build for GitHub Pages
npm run build:gh-pages

# Deploy the 'dist' folder to GitHub Pages
# Via GitHub UI: Settings > Pages > Source > Deploy from a branch
```

### Production Build

```bash
# Build client and server
npm run build

# Start production server
npm start
```

## Docker Deployment

```bash
# Build the image
docker build -t newavalonskirmish .

# Run the container
docker run -d -p 8822:8080 --name newavalonskirmish newavalonskirmish
```

Access the game at `http://localhost:8822`

## Deployment Guide

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on:
- Setting up GitHub Pages
- Configuring ngrok for remote play
- Server URL configuration
- Troubleshooting connection issues

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and workflow.

### Project Structure

```text
/
├── client/                   # React frontend
│   ├── components/          # UI components
│   ├── hooks/              # Custom React hooks
│   ├── locales/            # Translation files
│   ├── types/              # Client TypeScript types
│   └── utils/              # Client utilities
├── server/                  # Node.js backend
│   ├── handlers/           # WebSocket message handlers
│   ├── services/           # Core services
│   ├── types/              # Server TypeScript types
│   └── utils/              # Server utilities
├── dist/                    # Build output
└── DEPLOYMENT.md            # Deployment guide
```

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main branch.

## Support

For issues and questions, please use the GitHub issue tracker.
