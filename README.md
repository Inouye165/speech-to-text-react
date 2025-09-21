# Speech-to-Text Grocery List App

A comprehensive web application that combines speech-to-text functionality with intelligent grocery list management. Built with React, TypeScript, and powered by OpenAI's GPT models for natural language processing.

![Demo GIF Placeholder](https://via.placeholder.com/700x400/242424/FFFFFF?text=App+Demo+GIF+Goes+Here)
*(A GIF of the application in action would be a great addition here!)*

---

## 🎯 Features

### Core Functionality
- ✅ **Real-time speech transcription** with auto-restart capability
- ✅ **Intelligent grocery list management** using natural language
- ✅ **Recipe ingredient extraction** from text and URLs
- ✅ **Persistent storage** - your grocery list survives server restarts
- ✅ **Manual text editing and clearing**
- ✅ **Copy transcribed text to clipboard** (with fallback and status)
- ✅ **Modern, responsive user interface**

### Advanced Features
- 🧠 **AI-powered grocery list processing** - understands natural language like "add milk", "remove bread", "take out the last item"
- 📝 **Recipe parsing** - paste recipe text and automatically extract ingredients
- 🌐 **URL recipe parsing** - paste recipe URLs and extract ingredients automatically
- 🔄 **Smart duplicate prevention** - avoids adding duplicate items to your list
- 💾 **Persistent data storage** - file-based storage that can be easily migrated to a database
- 🎛️ **Auto-restart recording** - configurable option to keep recording continuously

## 🏗️ How It Works

### Frontend
- Uses the browser's built-in **Web Speech API** (`SpeechRecognition`) for real-time speech transcription
- React with TypeScript for type-safe, maintainable code
- Custom React Hook (`useSpeechRecognition`) manages speech recognition state and logic
- All audio processing happens directly in the browser for privacy and speed

### Backend
- Express.js API server with CORS support
- OpenAI GPT-4o-mini integration for natural language understanding
- File-based persistent storage (easily replaceable with database)
- Web scraping capabilities for recipe URL parsing using Cheerio

### AI Integration
- **Grocery List Processing**: Converts natural language into structured grocery list updates
- **Recipe Parsing**: Extracts and normalizes ingredients from recipe text
- **URL Recipe Parsing**: Fetches and parses recipes from web URLs
- **Smart Deduplication**: Prevents duplicate items using fuzzy matching

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite
- **Testing:** Vitest & React Testing Library
- **Styling:** CSS Modules

### Backend
- **Runtime:** Node.js with Express.js
- **AI:** OpenAI GPT-4o-mini via LangChain
- **Storage:** File-based JSON storage (fs-extra)
- **Web Scraping:** Cheerio for HTML parsing
- **Testing:** Supertest for API testing

## 🌐 Browser Compatibility

The Web Speech API is currently a non-standard technology. This application is fully functional in **Chromium-based browsers**:

- ✅ Google Chrome
- ✅ Microsoft Edge
- ❌ Mozilla Firefox (Not Supported)
- ❌ Apple Safari (Not Supported)

A future update will include a cloud-based fallback to support all browsers.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd speech-to-text-react
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=8787
   ```

4. **Start the backend server**
   ```bash
   npm run server
   ```

5. **Start the frontend development server** (in a new terminal)
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in your terminal)

## 📜 Available Scripts

### Development
- `npm run dev` - Starts the frontend development server
- `npm run server` - Starts the backend API server
- `npm run build` - Builds the app for production

### Testing
- `npm run test` - Runs all tests in watch mode
- `npm run test:run` - Runs all tests once
- `npm run test:ui` - Opens the Vitest UI for interactive testing
- `npm run test:coverage` - Runs tests with coverage report

### Code Quality
- `npm run lint` - Runs ESLint
- `npm run format` - Formats code with Prettier

## 🧪 Testing

The application includes comprehensive test coverage:

- **Unit Tests**: Individual component and hook testing
- **Integration Tests**: End-to-end workflow testing
- **API Tests**: Backend endpoint testing with persistent storage
- **Component Tests**: UI interaction and state management testing

Run tests with:
```bash
npm run test:run
```

## 📁 Project Structure

```
speech-to-text-react/
├── src/
│   ├── components/          # React components
│   │   ├── GroceryPane.tsx  # Grocery list management
│   │   └── TranscriptionPad.tsx # Speech-to-text interface
│   ├── hooks/               # Custom React hooks
│   │   └── useSpeechRecognition.ts
│   ├── __tests__/           # Frontend tests
│   └── App.tsx              # Main application component
├── server/
│   ├── index.ts            # Express API server
│   ├── storage.ts          # Persistent storage abstraction
│   └── __tests__/          # Backend tests
├── data/                   # Persistent storage directory
└── public/                 # Static assets
```

## 🔧 Configuration

### Environment Variables
- `OPENAI_API_KEY` - Required for AI-powered features
- `PORT` - Backend server port (default: 8787)

### Storage
The app uses file-based storage by default, stored in `data/grocery-list.json`. This can be easily replaced with a database by implementing the `GroceryListStorage` interface in `server/storage.ts`.

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Setup
Ensure your production environment has:
- Node.js 18+
- OpenAI API key configured
- Port 8787 available (or configure different port)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm run test:run`)
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## 📝 API Endpoints

### Grocery List Management
- `POST /api/grocery` - Process natural language grocery instructions
- `GET /api/grocery` - Retrieve current grocery list
- `DELETE /api/grocery` - Clear the grocery list

### Recipe Processing
- `POST /api/recipe` - Extract ingredients from recipe text
- `POST /api/recipe-url` - Extract ingredients from recipe URL

## 🔒 Privacy & Security

- **Audio Processing**: All speech recognition happens in your browser - audio never leaves your device
- **Data Storage**: Grocery lists are stored locally on your server
- **API Keys**: OpenAI API key is only used for text processing, not audio

## 📋 Known Issues & Future Improvements

| Issue | Severity | Status |
|-------|----------|--------|
| **No browser fallback for non-Chromium browsers** | Medium | Planned |
| **No accessibility (a11y) review** | Medium | Planned |
| **No mobile device testing** | Low | Planned |
| **No error boundary for React** | Low | Planned |
| **No cloud-based fallback for speech recognition** | Medium | Planned |
| **No privacy policy or data handling notice** | Low | Planned |

**Legend:** High = blocks core use; Medium = impacts key features or UX; Low = minor or edge-case issue.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using React, TypeScript, and OpenAI**