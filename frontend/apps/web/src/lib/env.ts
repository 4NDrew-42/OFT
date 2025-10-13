export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3004';
// Fabric Bridge base (https://fabric.sidekickportal.com in prod)
export const FABRIC_BASE_URL = process.env.NEXT_PUBLIC_ORION_API_URL || 'https://fabric.sidekickportal.com';
// Back-compat alias (some hooks import ORION_VECTOR_URL)
export const ORION_VECTOR_URL = FABRIC_BASE_URL;
export const CHAT_STREAM_URL = process.env.NEXT_PUBLIC_CHAT_STREAM_URL || 'https://orion-chat.sidekickportal.com/api/chat-enhanced';
export const STATUS_URL = process.env.NEXT_PUBLIC_STATUS_URL || 'https://fabric.sidekickportal.com/api/system-status';
export const OCR_URL = process.env.NEXT_PUBLIC_OCR_URL || `${FABRIC_BASE_URL}/api/ocr/receipt`;
export const VERCEL_ENV = process.env.NEXT_PUBLIC_VERCEL_ENV || 'development';
export const ORION_ANALYTICS_ENABLED = process.env.NEXT_PUBLIC_ORION_ANALYTICS_ENABLED !== 'false';
