# Enhanced AI Chat with ORION-CORE RAG Integration

This document describes the enhanced chat functionality that integrates DeepSeek/Gemini AI providers with ORION-CORE RAG capabilities.

## Features

### 🤖 Multiple AI Providers
- **DeepSeek**: High-performance chat model with competitive pricing
- **Gemini**: Google's advanced language model with strong reasoning capabilities
- **Provider Switching**: Real-time switching between providers without losing context

### 🧠 ORION-CORE RAG Integration
- **Vector Search**: Automatically searches ORION-CORE knowledge base for relevant context
- **Fabric Patterns**: Enhances queries using ORION-CORE Fabric AI patterns
- **Contextual Responses**: AI responses are enriched with relevant knowledge from your data

### 🔄 Real-time Streaming
- **Server-Sent Events (SSE)**: Real-time streaming responses
- **Status Updates**: Live feedback on search, enhancement, and generation phases
- **Error Handling**: Graceful fallbacks and error reporting

## Setup

### 1. Environment Variables

Add the following to your `.env.local` file:

```bash
# AI Provider API Keys
DEEPSEEK_API_KEY=your_deepseek_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# ORION-CORE Configuration (already configured)
NEXT_PUBLIC_ORION_API_URL=https://fabric.sidekickportal.com
ORION_SHARED_JWT_SECRET=your_jwt_secret
```

### 2. API Key Setup

#### DeepSeek API Key
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an account and generate an API key
3. Add to environment variables

#### Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add to environment variables

## Usage

### Basic Chat
```typescript
import { useEnhancedChatStream } from '@/hooks/useEnhancedChatStream';

const { buffer, isStreaming, start, stop, currentProvider } = useEnhancedChatStream(userEmail);

// Start a chat with RAG enhancement
await start("What are the latest trends in AI?");
```

### Provider Selection
```typescript
const { switchProvider, availableProviders } = useEnhancedChatStream(userEmail);

// Switch to Gemini
switchProvider('gemini');

// Switch to DeepSeek
switchProvider('deepseek');
```

### Custom Options
```typescript
const chatStream = useEnhancedChatStream(userEmail, {
  provider: 'gemini',
  enableRAG: true
});
```

## API Endpoints

### Enhanced Chat Stream
- **Endpoint**: `/api/chat/enhanced-stream`
- **Method**: GET (SSE)
- **Parameters**:
  - `q`: Query string
  - `sub`: User email/identifier
  - `provider`: AI provider ('deepseek' or 'gemini')

### Response Flow
1. **🔍 Knowledge Search**: Searches ORION-CORE vector database
2. **📚 Context Building**: Builds relevant context from search results
3. **🤖 Query Enhancement**: Uses Fabric patterns to enhance the query
4. **💬 AI Generation**: Streams response from selected AI provider

## Integration Details

### ORION-CORE RAG Pipeline
1. **Vector Search**: Uses `/search` endpoint with user query
2. **Context Extraction**: Extracts relevant content from top results
3. **Fabric Enhancement**: Uses `analyze` pattern to enhance query with context
4. **Response Generation**: Provides enhanced context to AI provider

### Error Handling
- **Provider Fallback**: Falls back to basic response if provider fails
- **RAG Graceful Degradation**: Works without RAG if ORION-CORE unavailable
- **Stream Recovery**: Handles connection issues gracefully

## Security

### JWT Authentication
- Uses ORION-CORE JWT for secure access to vector search
- Short-lived tokens (5 minutes) for enhanced security
- User-scoped access control

### API Key Protection
- Server-side only API key usage
- No client-side exposure of provider credentials
- Environment variable based configuration

## Performance

### Streaming Optimization
- Chunked response delivery for real-time experience
- Efficient vector search with configurable thresholds
- Minimal latency between search and generation

### Caching Strategy
- ORION-CORE handles vector search caching
- Provider responses are not cached for privacy
- JWT tokens cached for session duration

## Troubleshooting

### Common Issues

1. **No Provider Configured**
   - Ensure API keys are set in environment variables
   - Check provider availability in logs

2. **ORION-CORE Connection Failed**
   - Verify ORION-CORE services are running
   - Check JWT configuration and secrets

3. **Streaming Interrupted**
   - Check network connectivity
   - Verify SSE support in client environment

### Debug Mode
Enable debug logging by setting:
```bash
DEBUG=enhanced-chat:*
```

## Future Enhancements

- [ ] Conversation history and context persistence
- [ ] Custom Fabric pattern selection
- [ ] Multi-modal input support (images, documents)
- [ ] Response quality scoring and feedback
- [ ] Custom RAG source filtering
- [ ] Batch query processing

## Contributing

When adding new AI providers:
1. Implement streaming interface in the route handler
2. Add provider type to `ChatProvider` enum
3. Update UI provider selection
4. Add environment variable documentation
5. Test with ORION-CORE RAG integration
