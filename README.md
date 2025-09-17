# Speech-to-Text Web Application

A responsive web application that converts speech from a microphone into editable text in real-time. Built with React, TypeScript, and Vite.

![Demo GIF Placeholder](https://via.placeholder.com/700x400/242424/FFFFFF?text=App+Demo+GIF+Goes+Here)
*(A GIF of the application in action would be a great addition here!)*

---

## Features
- ✅ Real-time speech transcription
- ✅ Manual text editing and clearing
- ⏳ Copy transcribed text to clipboard (coming soon)
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