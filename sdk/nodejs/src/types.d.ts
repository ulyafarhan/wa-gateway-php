// ponytail: wa-gateway SDK TypeScript definitions

export interface WaGatewayConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}

export interface Session {
    session_id: string;
    status: 'connected' | 'disconnected' | 'connecting' | 'waiting_qr' | 'reconnecting' | 'not_found';
    qr?: string;
    reconnect_count?: number;
    msg_sent?: number;
    msg_failed?: number;
}

export interface Message {
    id: string;
    session_id: string;
    chat_id: string;
    type: 'text' | 'image' | 'audio' | 'document';
    payload?: string;
    status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
    wa_status?: string;
    error?: string;
    created_at: number;
    sent_at?: number;
}

export interface BroadcastResult {
    broadcast_id: string;
    total_targets: number;
    priority: string;
    schedule_at?: string;
    status: 'queued' | 'scheduled';
    estimated_duration_seconds: number;
}

export interface BehaviorConfig {
    session_id: string;
    persona_mode: string;
    ai_enabled: boolean;
    ai_provider: string;
    ai_model: string;
    faq_enabled: boolean;
    template_enabled: boolean;
    volume_per_minute: number;
    volume_per_hour: number;
    volume_per_day: number;
    cooldown_ms: number;
    quiet_hours_start: number;
    quiet_hours_end: number;
    timing_multiplier: number;
}

export interface FAQ {
    id: string;
    session_id: string;
    question?: string;
    answer: string;
    keywords?: string[];
    intent?: string;
    enabled: boolean;
    created_at: number;
    updated_at: number;
}

export interface Template {
    id: string;
    session_id: string;
    intent: string;
    templates: string[];
    created_at: number;
    updated_at: number;
}

export interface UserProfile {
    user_id: string;
    session_id: string;
    persona: string;
    persona_confidence: number;
    avg_response_time: number;
    msg_sent: number;
    msg_received: number;
    last_reply_at?: number;
    first_seen_at?: number;
}

export interface AnalyticsSummary {
    period: { start: string; end: string };
    messages: {
        total: number;
        sent: number;
        failed: number;
        success_rate: string;
    };
    sources: Record<string, number>;
    personas: Record<string, number>;
    avg_response_time_ms: number;
    active_users: number;
}

export interface HealthStatus {
    status: string;
    uptime: number;
    sessions: number;
}

declare class WaGateway {
    constructor(config: WaGatewayConfig);
    
    health(): Promise<HealthStatus>;
    
    getSessions(): Promise<Session[]>;
    createSession(sessionId: string, options?: {
        webhook_url?: string;
        webhook_secret?: string;
        session_type?: string;
        tenant_id?: string;
    }): Promise<{ success: boolean; session_id: string }>;
    getSessionStatus(sessionId: string): Promise<Session>;
    getQR(sessionId: string, format?: 'json' | 'html'): Promise<{ qr?: string; status: string; message?: string }>;
    updateSession(sessionId: string, updates: Partial<{
        tenant_id: string;
        session_type: string;
        webhook_url: string;
        webhook_secret: string;
    }>): Promise<{ success: boolean }>;
    deleteSession(sessionId: string): Promise<{ success: boolean }>;
    
    sendText(sessionId: string, chatId: string, text: string, priority?: 'high' | 'normal' | 'low'): Promise<{ success: boolean; message_id: string }>;
    sendImage(sessionId: string, chatId: string, imageUrl: string, caption?: string): Promise<{ success: boolean; message_id: string }>;
    sendDocument(sessionId: string, chatId: string, documentUrl: string, fileName?: string): Promise<{ success: boolean; message_id: string }>;
    getMessages(sessionId: string): Promise<Message[]>;
    getIncoming(sessionId: string): Promise<{ id: string; payload: any; created_at: number }[]>;
    
    sendBroadcast(sessionId: string, numbers: string[], message: string, options?: {
        priority?: 'high' | 'normal' | 'low';
        schedule_at?: string;
    }): Promise<BroadcastResult>;
    
    getBehaviorConfig(sessionId: string): Promise<BehaviorConfig>;
    setBehaviorConfig(sessionId: string, config: Partial<BehaviorConfig>): Promise<{ success: boolean; applied_preset: string }>;
    
    getFAQs(sessionId: string): Promise<FAQ[]>;
    addFAQ(sessionId: string, faq: { question?: string; answer: string; keywords?: string[]; intent?: string }): Promise<{ success: boolean }>;
    deleteFAQ(sessionId: string, faqId: string): Promise<{ success: boolean }>;
    
    getTemplates(sessionId: string): Promise<Template[]>;
    addTemplate(sessionId: string, template: { intent: string; templates: string[] }): Promise<{ success: boolean }>;
    updateTemplate(sessionId: string, templateId: string, update: { intent?: string; templates?: string[] }): Promise<{ success: boolean }>;
    deleteTemplate(sessionId: string, templateId: string): Promise<{ success: boolean }>;
    
    getAnalyticsSummary(sessionId: string): Promise<AnalyticsSummary>;
    getAnalyticsVolume(sessionId: string, days?: number): Promise<{ hour: string; count: number }[]>;
    getAnalyticsExport(sessionId: string): Promise<string>;
    
    getUsers(sessionId: string): Promise<UserProfile[]>;
    getUserProfile(sessionId: string, userId: string): Promise<UserProfile>;
    setUserPersona(sessionId: string, userId: string, persona: 'quick' | 'normal' | 'relaxed'): Promise<{ success: boolean }>;
    
    on(event: string, handler: (...args: any[]) => void): this;
    ensureSession(sessionId: string, options?: Record<string, any>): Promise<Session | { success: boolean; session_id: string }>;
    sendTextWithRetry(sessionId: string, chatId: string, text: string, options?: { retries?: number; delay?: number }): Promise<{ success: boolean; message_id: string }>;
}

export default WaGateway;
