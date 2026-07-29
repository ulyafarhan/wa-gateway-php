module.exports = {
    name: 'WaAceh Send',
    displayName: 'WaAceh Send Message',
    group: ['transform'],
    description: 'Send WhatsApp message via WaAceh',
    defaults: { name: 'WaAceh Send' },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
        { displayName: 'API Key', name: 'apiKey', type: 'string', typeOptions: { password: true }, required: true, default: '' },
        { displayName: 'Session ID', name: 'sessionId', type: 'string', required: true, default: '' },
        { displayName: 'Chat ID', name: 'chatId', type: 'string', required: true, default: '' },
        { displayName: 'Message Type', name: 'messageType', type: 'options', options: [
            { name: 'Text', value: 'text' }, { name: 'Image', value: 'image' },
            { name: 'Buttons', value: 'buttons' }, { name: 'List', value: 'list' },
        ], default: 'text' },
        { displayName: 'Text', name: 'text', type: 'string', typeOptions: { rows: 3 }, default: '', displayOptions: { show: { messageType: ['text', 'buttons', 'list'] } } },
        { displayName: 'Image URL', name: 'imageUrl', type: 'string', default: '', displayOptions: { show: { messageType: ['image'] } } },
        { displayName: 'Caption', name: 'caption', type: 'string', default: '', displayOptions: { show: { messageType: ['image'] } } },
    ],
    async execute() {
        const axios = require('axios');
        const items = this.getInputData();
        const apiKey = this.getNodeParameter('apiKey');
        const sessionId = this.getNodeParameter('sessionId');
        const chatId = this.getNodeParameter('chatId');
        const messageType = this.getNodeParameter('messageType');
        const text = this.getNodeParameter('text');
        
        let endpoint = 'send-text';
        let body = { chatId, text };
        
        if (messageType === 'image') {
            endpoint = 'send-image';
            body = { chatId, imageUrl: this.getNodeParameter('imageUrl'), caption: this.getNodeParameter('caption') };
        } else if (messageType === 'buttons') {
            endpoint = 'send-buttons';
            body = { chatId, text, buttons: [{ id: '1', text: 'Option 1' }, { id: '2', text: 'Option 2' }] };
        } else if (messageType === 'list') {
            endpoint = 'send-list';
            body = { chatId, text, sections: [{ title: 'Menu', rows: [{ id: '1', title: 'Item 1' }] }] };
        }
        
        const res = await axios.post(`https://waaceh.biz.id/api/sessions/${sessionId}/messages/${endpoint}`, body, {
            headers: { 'x-api-key': apiKey }
        });
        return [{ json: res.data }];
    }
};