# Farkle Multiplayer Server

Backend server for **Farkle Online Multiplayer**, a real-time multiplayer dice game built with React, Node.js, and WebSockets.

This server manages player connections, game rooms, and authoritative game state synchronization between connected clients.

## Demo

Play the game (deployment coming soon):
https://github.com/devB333/FarkleClient

## Overview

The Farkle server uses an event-driven architecture to allow multiple players to play simultaneously in independent game rooms.

The server acts as the authority for:
- Player connections
- Room management
- Turn order
- Score tracking
- Dice state synchronization
- Game events

Clients send player actions to the server, and the server broadcasts updated game state to all connected players.

## Motivation

I wanted to explore real-time multiplayer networking by building a complete online game. This project required designing a client-server architecture, synchronizing game state, and creating a responsive interface across desktop and mobile devices.

## Features

- Real-time multiplayer communication using WebSockets
- Room-code based matchmaking
- Multiple simultaneous game rooms
- Player connection management
- Server-side game state tracking
- Turn synchronization
- Score synchronization
- Dice roll handling
- Round management
- Client event handling

## Tech Stack

**Backend**
- Node.js
- JavaScript
- Socket.io
- WebSocket communication

**Tools**
- npm
- Git/GitHub
- VS Code

## Architecture

```
          React Client
              |
              |
        Socket.io Connection
              |
              |
       Farkle Multiplayer Server
              |
              |
       Game Room Management
              |
              |
        Player Game State
```

The server maintains the active game state and communicates updates to connected players in real time.

## Server Responsibilities

### Room Management

The server handles:
- Creating game rooms
- Generating room codes
- Adding players to rooms
- Removing disconnected players
- Managing active games

### Game Synchronization

The server synchronizes:
- Dice rolls
- Selected dice
- Player scores
- Current turn
- Round progress
- Game completion

### Event-Based Communication

The server uses Socket.io events to communicate between clients and the server.

Examples:

**Room Events**
- Create room
- Join room
- Player connected
- Player disconnected

**Gameplay Events**
- Roll dice
- Select dice
- Bank score
- End round
- Update score
- Change turn

## Installation

Clone the repository:

```bash
git clone https://github.com/devB333/FarkleServer.git
```

Navigate into the project:

```bash
cd FarkleServer
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

The client application can then connect to the server using the configured Socket.io endpoint.

## Challenges

### Real-Time State Synchronization

Designed a system to keep multiple clients synchronized while handling simultaneous player actions, turn changes, and score updates.

### Multiplayer Room Management

Implemented a room-based architecture allowing multiple independent games to run at the same time.

### Event-Driven Backend Design

Built the server around WebSocket events instead of constant polling, allowing efficient real-time communication between players.

## Related Project

Frontend client:

https://github.com/devB333/FarkleClient

## Future Improvements

- Persistent player accounts
- Database-backed statistics
- Match history
- Authentication
- Leaderboards
