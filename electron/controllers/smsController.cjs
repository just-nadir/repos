const { db, notify } = require('../database.cjs');
const { sendSMS } = require('../services/smsService.cjs');

module.exports = {
    getTemplates: () => db.prepare('SELECT * FROM sms_templates').all(),
    
    saveTemplate: (data) => {
        db.prepare('UPDATE sms_templates SET title = ?, content = ? WHERE id = ?')
          .run(data.title, data.content, data.id);
        notify('sms_templates', null);
    },

    getLogs: () => db.prepare('SELECT * FROM sms_logs ORDER BY id DESC LIMIT 50').all(),

    sendManualBroadcast: async (message) => {
        // Barcha mijozlarga jo'natish (Demo uchun faqat telefon raqami borlariga)
        const customers = db.prepare("SELECT phone, name FROM customers WHERE phone IS NOT NULL AND phone != ''").all();
        
        let count = 0;
        for (const customer of customers) {
            try {
                // Shablon o'zgaruvchilarini almashtirish
                const text = message.replace('{name}', customer.name);
                await sendSMS(customer.phone, text);
                count++;
            } catch (e) {
                console.error(`Error sending to ${customer.name}`);
            }
        }
        notify('sms_logs', null);
        return { sent: count, total: customers.length };
    }
};