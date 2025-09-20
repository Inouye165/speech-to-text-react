# Testing Guide

This document describes the comprehensive test suite for the Speech-to-Text React application.

## Test Coverage

The test suite covers:

- ✅ **Frontend Components**: React components with user interactions
- ✅ **Custom Hooks**: Speech recognition functionality
- ✅ **Backend API**: All REST endpoints with various scenarios
- ✅ **Integration Tests**: End-to-end workflows
- ✅ **Error Handling**: Edge cases and error states

## Running Tests

### All Tests
```bash
npm run test:run
```

### Watch Mode (Development)
```bash
npm test
```

### Test UI (Interactive)
```bash
npm run test:ui
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Structure

### Frontend Tests

#### `src/hooks/__tests__/useSpeechRecognition.simple.test.ts`
Tests the core speech recognition hook functionality:
- Initialization with correct default values
- Auto-restart toggle functionality
- Transcript clearing
- Speech recognition end handling

#### `src/components/__tests__/GroceryPane.test.tsx`
Tests the grocery list component:
- Rendering with empty list
- Update button states
- API integration for grocery list updates
- Recipe input functionality
- Error handling
- Loading states

#### `src/components/TranscriptionPad.test.tsx`
Tests the speech transcription component:
- Component rendering
- Button interactions
- Copy functionality
- Auto-restart controls

#### `src/__tests__/integration.test.tsx`
End-to-end integration tests:
- Complete speech-to-grocery workflow
- Recipe parsing workflow
- Error state handling
- Clear list functionality
- State persistence across operations

### Backend Tests

#### `server/__tests__/api.test.ts`
Comprehensive API endpoint testing:

**POST /api/grocery**
- ✅ Process grocery instructions successfully
- ✅ Handle missing API key
- ✅ Handle empty transcript

**POST /api/recipe**
- ✅ Parse recipe and extract ingredients
- ✅ Avoid duplicate ingredients
- ✅ Handle missing API key

**GET /api/grocery**
- ✅ Return current grocery list
- ✅ Return empty list when no items

**DELETE /api/grocery**
- ✅ Clear the grocery list

**Integration Tests**
- ✅ Maintain state across multiple operations

## Test Features

### Mocking
- **Web Speech API**: Mocked for consistent testing
- **Fetch API**: Mocked for API calls
- **OpenAI Dependencies**: Mocked to avoid external API calls

### Error Scenarios
- Network failures
- Missing API keys
- Invalid responses
- Permission errors

### State Management
- Component state changes
- API state persistence
- Cross-component communication

## Continuous Integration

The project includes a GitHub Actions workflow (`.github/workflows/test.yml`) that:
- Runs tests on Node.js 18.x and 20.x
- Executes linting
- Generates coverage reports
- Supports multiple Node versions

## Test Data

Tests use realistic mock data:
- Sample grocery lists
- Recipe text with ingredients
- Speech recognition events
- API responses

## Best Practices

1. **Isolation**: Each test is independent
2. **Mocking**: External dependencies are mocked
3. **Realistic Data**: Tests use realistic scenarios
4. **Error Coverage**: Both success and failure paths are tested
5. **Integration**: End-to-end workflows are verified

## Adding New Tests

When adding new features:

1. **Unit Tests**: Test individual functions/components
2. **Integration Tests**: Test feature workflows
3. **API Tests**: Test new endpoints
4. **Error Cases**: Test failure scenarios
5. **Update Documentation**: Update this file

## Test Commands Reference

```bash
# Run all tests once
npm run test:run

# Run tests in watch mode
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/components/__tests__/GroceryPane.test.tsx

# Run tests matching pattern
npx vitest run --grep "grocery"
```

## Coverage Goals

- **Statements**: > 80%
- **Branches**: > 80%
- **Functions**: > 80%
- **Lines**: > 80%

Current test suite provides comprehensive coverage of all major functionality and edge cases.
