# Speech-to-Text Web Application

## Known Issues & Risks (as of September 2025)

| Issue | Severity |
|-------|----------|
| ~~Copy to Clipboard button is non-functional~~<br>Implemented: 'Copy Text' now uses Clipboard API with fallback and shows status. | Resolved |
| **No browser fallback for non-Chromium browsers**<br>App only works in Chrome/Edge; no fallback for Firefox/Safari. | Medium |
| **No user feedback for unsupported browsers**<br>Warning is shown in status, but no modal or clear alert for users on unsupported browsers. | Low |
| **No accessibility (a11y) review**<br>App may not be fully accessible to screen readers or keyboard users. | Medium |
| **No persistent transcript storage**<br>Transcribed text is lost on refresh; no local storage or export. | Low |
| **No language selection**<br>Speech recognition is hardcoded to 'en-US'. | Low |
| **No mobile device testing**<br>Responsiveness is claimed, but no explicit mobile UX validation. | Low |
| **No error boundary for React**<br>App may crash on unexpected errors. | Low |
| **No cloud-based fallback for speech recognition**<br>Planned, but not implemented. | Medium |
| **No privacy policy or data handling notice**<br>App processes audio in-browser, but this is not clearly communicated to users. | Low |

**Legend:** High = blocks core use; Medium = impacts key features or UX; Low = minor or edge-case issue.

A responsive web application that converts speech from a microphone into editable text in real-time. Built with React, TypeScript, and Vite.

![Demo GIF Placeholder](https://via.placeholder.com/700x400/242424/FFFFFF?text=App+Demo+GIF+Goes+Here)
*(A GIF of the application in action would be a great addition here!)*

---

## Features
- ✅ Real-time speech transcription
- ✅ Manual text editing and clearing
- ✅ Copy transcribed text to clipboard (with fallback and status)
- 🖥️ Modern, responsive user interface

## How It Works

This application uses the browser's built-in **Web Speech API** (`SpeechRecognition`) for its core functionality. All audio processing is handled directly in the browser, making it fast and private.

The application state and API logic are managed by a custom React Hook (`useSpeechRecognition`), which keeps the UI components clean and focused on presentation.

## Tech Stack
- **Framework:** React with TypeScript
- **Build Tool:** Vite
- **Testing:** Vitest & React Testing Library
- **Styling:** CSS Modules

## Browser Compatibility
The Web Speech API is currently a non-standard technology. As such, this application is only fully functional in **Chromium-based browsers**:
- ✅ Google Chrome
- ✅ Microsoft Edge
- ❌ Mozilla Firefox (Not Supported)
- ❌ Apple Safari (Not Supported)

A future update will include a cloud-based fallback to support all browsers.

## Getting Started

1.  Clone the repository.
2.  Install dependencies: `npm install`
3.  Run the development server: `npm run dev`

## Available Scripts
- `npm run dev`: Starts the development server.
- `npm test`: Runs the unit tests.