# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PackyCode Cost Monitor is a Chrome browser extension built with Plasmo framework that monitors PackyCode API usage and budgets. It features dual token authentication (JWT/API Key), real-time purchase status monitoring, and budget tracking with notifications.

## Development Commands

```bash
# Development
pnpm dev                 # Start development server, loads build/chrome-mv3-dev
pnpm build              # Build for production
pnpm package            # Package extension for distribution

# Code Quality
pnpm lint               # Run ESLint
pnpm lint:fix           # Auto-fix ESLint issues
pnpm format             # Format code with Prettier
pnpm format:check       # Check code formatting
pnpm type-check         # TypeScript type checking
```

## Architecture Overview

### Core Components

- **popup.tsx**: Main UI entry point with budget monitoring interface
- **background.ts**: Service worker handling alarms, token management, and purchase monitoring
- **CombinedStatus.tsx**: Unified authentication and purchase status display

### Authentication System

Dual token system supporting both JWT (from web cookies) and API Keys:

- **JWT Tokens**: Auto-extracted from PackyCode website cookies, expire-aware
- **API Keys**: Long-lived tokens copied from dashboard, detected via webRequest API
- Token switching handled automatically when API keys are detected

### Purchase Status Monitoring

- **API Polling**: Every 30 seconds via Chrome alarms to `/api/config`
- **Status Detection**: Monitors `purchaseDisabled` field changes (true→false)
- **Notifications**: Chrome notifications when purchase becomes available
- **Data Flow**: background.ts → Chrome Storage → UI components

### Storage Architecture

Uses Plasmo Storage API with these key data:

- `packy_token`: Current authentication token
- `packy_token_type`: "jwt" | "api_key"
- `packy_config`: Purchase status from API
- `cached_user_info`: Budget and usage data

## Technical Constraints

### Critical Rules

- **NO DYNAMIC IMPORTS**: Chrome Extension service workers fail with dynamic imports
  - ❌ `const { func } = await import("./module")`
  - ✅ `import { func } from "./module"`
- **Static Imports Only**: All module imports must be at file top level

### Chrome Extension Specifics

- **Manifest V3**: Uses service worker background script
- **Permissions**: alarms, notifications, storage, cookies, webRequest
- **Host Permissions**: https://www.packycode.com/* required for API access
- **External Scripts**: Use fetch + textContent instead of script src for CSP compliance

### API Integration

- **PackyCode API**: https://www.packycode.com/api/config for purchase status
- **User API**: https://packy.te.sb/backend/users/me for budget data
- **CORS**: Background script handles all external API calls

## Component Patterns

### Hooks Architecture

- **usePackyToken**: Token management and validation
- **useUserInfo**: Budget data fetching with automatic refresh
- **usePurchaseStatus**: Purchase status from storage with real-time updates

### State Management

- Chrome Storage for persistence across sessions
- React hooks for component state
- Message passing between popup and background script

### UI Design

- Linear-inspired minimalist design
- Tailwind CSS for styling
- Responsive 400x600px popup dimensions
- Dark/light mode support

## Background Script Logic

### Alarm System

- **refreshUserInfo**: User budget data every 30 seconds
- **checkPurchaseStatus**: Purchase status polling every 30 seconds
- Alarms auto-restart on extension startup/install

### Token Detection

- Monitors PackyCode website for cookie changes
- WebRequest API intercepts API key generation responses
- Automatic token type switching (JWT→API Key priority)

### Notification System

- Purchase availability notifications
- Badge text showing daily budget percentage
- Click handlers for opening purchase pages

## Common Development Tasks

### Adding New API Endpoints

1. Create utility function in `utils/` directory
2. Add TypeScript interfaces for response types
3. Implement error handling and token refresh logic
4. Add Chrome storage caching if needed

### Modifying UI Components

1. Follow existing Linear design patterns
2. Use Tailwind utility classes
3. Maintain 400px width constraint
4. Test both light and dark modes

### Background Script Changes

1. Avoid dynamic imports (use static imports)
2. Add console.log for debugging alarm behavior
3. Test alarm persistence across extension reloads
4. Validate Chrome permissions for new APIs

## Error Handling Patterns

### Service Worker Debugging

- Service workers may silently fail or restart
- Use extensive console.log for alarm and API debugging
- Check Chrome Extension developer tools for service worker logs

### Authentication Errors

- Token expiration handling with automatic refresh
- Graceful fallback between JWT and API key modes
- Clear error messages for authentication failures

### Network Error Handling

- API timeout handling for external requests
- Fallback to cached data when APIs are unavailable
- User feedback for network connectivity issues

## File Structure Significance

```
components/          # Reusable UI components
├── CombinedStatus.tsx    # Auth + purchase status display
├── ProgressBar.tsx       # Budget visualization
└── RefreshButton.tsx     # Manual refresh trigger

hooks/              # Custom React hooks
├── usePackyToken.ts      # Token management
├── useUserInfo.ts        # Budget data
└── usePurchaseStatus.ts  # Purchase monitoring

utils/              # Business logic utilities
├── auth.ts              # Authentication helpers
├── jwt.ts               # JWT token parsing
├── userInfo.ts          # User data fetching
└── purchaseStatus.ts    # Purchase status API

background.ts       # Service worker entry point
popup.tsx          # Main UI entry point
```

This architecture separates concerns cleanly: UI components handle presentation, hooks manage React state, utils contain business logic, and background script handles Chrome APIs.

- 始终扮演 linus 和 dan abramov 的角色,linus 主攻全局架构的设计,而 dan 负责前端专业领域的设计和 ui 设计