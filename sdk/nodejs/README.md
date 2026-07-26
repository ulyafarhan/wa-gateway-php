# wa-gateway SDK (Node.js)

Simple, lazy integration with [wa-gateway](https://github.com/your-repo/wa-gateway) WhatsApp API.

## Install

```bash
npm install wa-gateway-sdk
# or
yarn add wa-gateway-sdk
# or
pnpm add wa-gateway-sdk
```

## Quick Start

```javascript
import WaGateway from 'wa-gateway-sdk';

const client = new WaGateway({
    apiKey: 'sk_live_xxxxx',  // Your API key
    baseUrl: 'https://wa.gampong.web.id',  // Your wa-gateway URL
});

// Send a text message
await client.sendText('my-session', '6281234567890', 'Hello from wa-gateway!');
```

## Sessions

```javascript
// Create a session
await client.createSession('my-session', {
    webhook_url: 'https://your-app.com/webhook',
});

// Get session status
const status = await client.getSessionStatus('my-session');
console.log(status.status); // 'connected', 'waiting_qr', etc.

// Get QR code for scanning
const qr = await client.getQR('my-session');
console.log(qr.qr); // QR code data URL

// List all sessions
const sessions = await client.getSessions();

// Delete a session
await client.deleteSession('my-session');
```

## Messages

```javascript
// Send text
await client.sendText('my-session', '6281234567890', 'Hello!');

// Send image
await client.sendImage('my-session', '6281234567890', 'https://example.com/image.jpg', 'Caption');

// Send document
await client.sendDocument('my-session', '6281234567890', 'https://example.com/file.pdf', 'document.pdf');

// Get message history
const messages = await client.getMessages('my-session');

// Get incoming messages
const incoming = await client.getIncoming('my-session');
```

## Broadcast

```javascript
// Send broadcast to multiple numbers
const result = await client.sendBroadcast('my-session', [
    '6281234567890',
    '6289876543210',
], 'Hello everyone!', {
    priority: 'normal',
});

console.log(result.broadcast_id);
console.log(result.estimated_duration_seconds);
```

## Behavior Config

```javascript
// Get behavior config
const config = await client.getBehaviorConfig('my-session');

// Update behavior config
await client.setBehaviorConfig('my-session', {
    persona_mode: 'normal',
    ai_enabled: true,
    ai_provider: 'openai',
    ai_model: 'gpt-4o-mini',
    volume_per_minute: 3,
    volume_per_hour: 20,
});
```

## FAQ & Templates

```javascript
// Add FAQ
await client.addFAQ('my-session', {
    question: 'What are your hours?',
    answer: 'We are open 9am-5pm, Monday-Friday.',
    keywords: ['hours', 'open', 'close'],
});

// Get FAQs
const faqs = await client.getFAQs('my-session');

// Add template
await client.addTemplate('my-session', {
    intent: 'greeting',
    templates: ['Hello!', 'Hi there!', 'Hey!'],
});

// Get templates
const templates = await client.getTemplates('my-session');
```

## Analytics

```javascript
// Get analytics summary
const summary = await client.getAnalyticsSummary('my-session');
console.log(summary.messages.total);
console.log(summary.messages.success_rate);

// Get volume by hour
const volume = await client.getAnalyticsVolume('my-session', 7); // last 7 days

// Export CSV
const csv = await client.getAnalyticsExport('my-session');
```

## Contacts / User Profiles

```javascript
// Get all contacts
const users = await client.getUsers('my-session');

// Get user profile
const profile = await client.getUserProfile('my-session', 'user-phone-number');

// Set persona
await client.setUserPersona('my-session', 'user-phone-number', 'normal');
```

## Convenience Methods

```javascript
// Ensure session exists (create if not)
await client.ensureSession('my-session', {
    webhook_url: 'https://your-app.com/webhook',
});

// Send with auto-retry (3 attempts)
await client.sendTextWithRetry('my-session', '6281234567890', 'Important message!', {
    retries: 3,
    delay: 1000,
});
```

## Error Handling

```javascript
try {
    await client.sendText('my-session', '6281234567890', 'Hello!');
} catch (e) {
    console.error(e.message); // Error message
    console.error(e.status);  // HTTP status code
    console.error(e.data);    // Response body
}
```

## TypeScript

Full TypeScript support included. Types are auto-discovered.

```typescript
import WaGateway, { Session, Message, HealthStatus } from 'wa-gateway-sdk';

const client: WaGateway = new WaGateway({
    apiKey: 'sk_live_xxxxx',
    baseUrl: 'https://wa.gampong.web.id',
});

const status: Session = await client.getSessionStatus('my-session');
```

## License

MIT
