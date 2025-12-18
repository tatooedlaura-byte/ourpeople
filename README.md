# Our People

A private, offline-first family tree and relationship tracker.

## Features

- **Private**: All data stays on your device - no accounts, no cloud required
- **Offline-First**: Works without internet connection
- **Portable**: Export and import your data anytime as JSON
- **Installable**: Progressive Web App (PWA) that can be installed on any device

## Architecture

The app is built with a clean separation between the relationship engine and the UI:

- **Relationship Engine** (`src/engine/`): Platform-agnostic TypeScript module that handles all relationship logic, including computing relationship paths and generating plain-language descriptions
- **Storage Layer** (`src/storage/`): IndexedDB adapter for persistent local storage
- **React UI** (`src/components/`): Clean, responsive interface built with React

This architecture allows the core logic to be reused in other frameworks or wrapped for native apps if desired.

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- React 19 with TypeScript
- Vite with PWA plugin
- IndexedDB for local storage (via idb)
