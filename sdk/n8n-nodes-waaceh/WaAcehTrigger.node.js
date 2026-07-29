module.exports = {
    name: 'WaAceh Trigger',
    displayName: 'WaAceh Trigger',
    group: ['trigger'],
    description: 'Listen for incoming WhatsApp messages',
    defaults: { name: 'WaAceh Trigger' },
    inputs: [],
    outputs: ['main'],
    properties: [
        { displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, required: true, default: '' },
        { displayName: 'Session ID', name: 'sessionId', type: 'string', required: true, default: '' },
        { displayName: 'Events', name: 'events', type: 'multiOptions', options: [
            { name: 'Message Received', value: 'message.incoming' },
            { name: 'Message Sent', value: 'message.sent' },
            { name: 'Session Status', value: 'session.*' },
        ], default: ['message.incoming'] },
    ],
    async execute() {
        // Ponytail: trigger via polling — n8n calls this periodically
        const axios = require('axios');
        const items = this.getInputData();
        const apiKey = this.getNodeParameter('apiKey');
        const sessionId = this.getNodeParameter('sessionId');
        const events = this.getNodeParameter('events');
        
        try {
            const res = await axios.get(`https://waaceh.biz.id/api/sessions/${sessionId}/incoming`, {
                headers: { 'x-api-key': apiKey }
            });
            const messages = res.data.filter(m => events.includes('message.incoming'));
            return messages.map(m => ({ json: m }));
        } catch (e) {
            if (e.response?.status === 401) throw new Error('Invalid API Key');
            throw e;
        }
    }
};