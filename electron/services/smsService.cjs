const axios = require('axios');
const FormData = require('form-data');
const { db } = require('../database.cjs');
const log = require('electron-log');

let cachedToken = null;

// Sozlamalarni olish
const getSettings = () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
};

// Token olish (Login)
const loginEskiz = async () => {
    const settings = getSettings();
    const email = settings.eskizEmail;
    const password = settings.eskizPassword;

    if (!email || !password) throw new Error("Eskiz login/parol kiritilmagan");

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    try {
        const response = await axios.post('https://notify.eskiz.uz/api/auth/login', formData, {
            headers: { ...formData.getHeaders() }
        });
        cachedToken = response.data.data.token;
        log.info("Eskiz: Token yangilandi.");
        return cachedToken;
    } catch (error) {
        log.error("Eskiz Login Xatosi:", error.response?.data || error.message);
        throw error;
    }
};

// SMS yuborish
const sendSMS = async (phone, message) => {
    if (!cachedToken) {
        await loginEskiz();
    }

    // Telefon raqamni tozalash (+998...)
    const cleanPhone = phone.replace(/\D/g, '');

    const formData = new FormData();
    formData.append('mobile_phone', cleanPhone);
    formData.append('message', message);
    formData.append('from', '4546'); // Yoki o'z brandingiz IDsi

    try {
        await axios.post('https://notify.eskiz.uz/api/message/sms/send', formData, {
            headers: { 
                ...formData.getHeaders(),
                'Authorization': `Bearer ${cachedToken}`
            }
        });
        
        // Logga yozish
        db.prepare('INSERT INTO sms_logs (phone, message, status, date) VALUES (?, ?, ?, ?)').run(cleanPhone, message, 'sent', new Date().toISOString());
        log.info(`SMS Yuborildi: ${cleanPhone}`);
        return true;

    } catch (error) {
        // Agar token eskirgan bo'lsa (401), qayta login qilib ko'ramiz
        if (error.response?.status === 401) {
            log.warn("Eskiz Token eskirgan, yangilanmoqda...");
            await loginEskiz();
            return sendSMS(phone, message); // Qayta urinish
        }

        db.prepare('INSERT INTO sms_logs (phone, message, status, date) VALUES (?, ?, ?, ?)').run(cleanPhone, message, 'failed', new Date().toISOString());
        log.error("SMS Xatosi:", error.response?.data || error.message);
        throw error;
    }
};

module.exports = { sendSMS, loginEskiz };