# 🃏 JoSky - Retro Multiplayer Card Game

JoSky is a turn-based multiplayer card game inspired by Skyjo, built with a vibrant 90s retro aesthetic. It features real-time gameplay, a mobile-optimized "Focus" layout, and smart opponent interactions.

## 🚀 Tech Stack

*   **Frontend**: React, Vite, TailwindCSS (with a custom 90s Memphis design system)
*   **Backend**: Node.js, Express, Socket.io
*   **Communication**: Real-time WebSockets

## 🛠️ How to Run Locally

### Prerequisites
*   Node.js installed (v16+)

### 1. Backend (Server)
The backend manages the game state, rooms, and socket connections.

```bash
cd backend
npm install
node index.js
```
The server will start on port `3000` (default).

### 2. Frontend (Client)
The frontend is the game interface.

```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

## 📦 Deployment Guide

### Backend (Render, Railway, etc.)
1.  **Build Command**: `npm install`
2.  **Start Command**: `node index.js` (or `npm start`)
3.  **Environment Variables**:
    *   `PORT`: (Optional) Usually set automatically by the host.

### Frontend (Vercel, Netlify)
1.  **Build Command**: `npm run build`
2.  **Output Directory**: `dist`
3.  **Environment Variables**:
    *   `VITE_SOCKET_URL`: The URL of your deployed backend (e.g., `https://josky-api.onrender.com`). **Crucial for connecting the two!**

## 🎨 Key Features
*   **Real-time**: Instant updates for all players.
*   **Responsive "Focus" UI**: Designed for mobile, with collapsible opponent views and optimized grid visibility.
*   **Smart Indicators**: Highlights the "Next Player" to help with strategic discards.
*   **Lobby System**: Create or join rooms with a simple code.
