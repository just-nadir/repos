import React, { useState, useEffect } from 'react';
import { Send, Settings, History, Edit, Save, CheckCircle, Shield, AlertTriangle } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const SmsPage = () => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [logs, setLogs] = useState([]);
  const [settings, setSettings] = useState({ eskizEmail: '', eskizPassword: '' });
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [sending, setSending] = useState(false);

  // UI Statelari
  const [notification, setNotification] = useState(null); // { type: 'success'|'error', msg: '' }
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });

  useEffect(() => {
    loadData();
  }, []);

  // Xabarni 3 soniyadan keyin o'chirish
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotify = (type, msg) => setNotification({ type, msg });

  const loadData = async () => {
    try {
      // Brauzerda xatolik bermasligi uchun tekshiruv
      if (!window.require) return;
      
      const { ipcRenderer } = window.require('electron');
      const tpls = await ipcRenderer.invoke('get-sms-templates');
      const lgs = await ipcRenderer.invoke('get-sms-logs');
      const sets = await ipcRenderer.invoke('get-settings');
      
      setTemplates(tpls || []);
      setLogs(lgs || []);
      setSettings(prev => ({ ...prev, ...sets }));
    } catch (err) { 
        console.error(err);
        showNotify('error', "Ma'lumotlarni yuklashda xatolik!");
    }
  };

  const handleSaveTemplate = async (tpl) => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('save-sms-template', tpl);
      loadData();
      showNotify('success', "Shablon saqlandi!");
    } catch (err) { 
        showNotify('error', "Saqlashda xatolik!");
    }
  };

  const handleSaveSettings = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      await ipcRenderer.invoke('save-settings', settings);
      showNotify('success', "Eskiz sozlamalari saqlandi!");
    } catch (err) { 
        showNotify('error', "Sozlamalarni saqlashda xato!");
    }
  };

  // Modalni ochish funksiyasi
  const openBroadcastConfirm = () => {
    if (!broadcastMsg.trim()) {
        showNotify('error', "Xabar matni bo'sh bo'lmasligi kerak!");
        return;
    }
    setConfirmModal({
        isOpen: true,
        message: "Diqqat! Bu xabar barcha mijozlarga yuboriladi. Tasdiqlaysizmi?",
        onConfirm: performBroadcast // Tasdiqlansa shu funksiya ishlaydi
    });
  };

  // Asl yuborish jarayoni (Modal tasdiqlagandan keyin)
  const performBroadcast = async () => {
    setSending(true);
    try {
      const { ipcRenderer } = window.require('electron');
      const res = await ipcRenderer.invoke('send-manual-sms', broadcastMsg);
      
      showNotify('success', `${res.sent} ta xabar muvaffaqiyatli yuborildi!`);
      setBroadcastMsg('');
      loadData(); // Tarixni yangilash
    } catch (err) { 
        showNotify('error', "Xabar yuborishda xatolik yuz berdi. Loglarni tekshiring.");
    } finally {
        setSending(false);
    }
  };

  const loadNewMenuTemplate = () => {
      const tpl = templates.find(t => t.type === 'new_menu');
      if (tpl) {
          setBroadcastMsg(tpl.content);
          showNotify('success', "Shablon yuklandi");
      } else {
          showNotify('error', "Shablon topilmadi");
      }
  };

  return (
    <div className="flex w-full h-full bg-gray-100 relative">
      {/* NOTIFICATION TOAST (O'ng tepada) */}
      {notification && (
        <div className={`absolute top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-white font-bold animate-in slide-in-from-top duration-300 ${notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
           {notification.type === 'success' ? <CheckCircle size={20}/> : <Shield size={20}/>}
           {notification.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col shadow-sm z-10">
        <h2 className="text-xl font-bold text-gray-800 mb-6 px-2">SMS Marketing</h2>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('templates')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${activeTab === 'templates' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Edit size={18}/> Shablonlar</button>
          <button onClick={() => setActiveTab('broadcast')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${activeTab === 'broadcast' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Send size={18}/> Xabar Yuborish</button>
          <button onClick={() => setActiveTab('logs')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${activeTab === 'logs' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><History size={18}/> Tarix</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-4 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={18}/> Sozlamalar</button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-8 overflow-y-auto">
        
        {/* 1. SHABLONLAR */}
        {activeTab === 'templates' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Shablonlarni Tahrirlash</h2>
            <div className="grid grid-cols-2 gap-6">
                {templates.map(tpl => (
                    <div key={tpl.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg text-gray-700">{tpl.title}</h3>
                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-mono">{tpl.type}</span>
                        </div>
                        <textarea 
                            rows="4"
                            className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl mb-4 text-sm outline-none focus:border-blue-500 resize-none flex-1"
                            value={tpl.content}
                            onChange={(e) => {
                                const newTpls = templates.map(t => t.id === tpl.id ? {...t, content: e.target.value} : t);
                                setTemplates(newTpls);
                            }}
                        ></textarea>
                        <button onClick={() => handleSaveTemplate(tpl)} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm">
                            <Save size={18}/> Saqlash
                        </button>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* 2. OMMAVIY XABAR */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
             <h2 className="text-2xl font-bold text-gray-800 mb-2">Ommaviy Xabar (Rassilka)</h2>
             <p className="text-gray-500 text-sm mb-6">Diqqat! Bu yerdan yuborilgan xabar bazadagi barcha telefon raqami bor mijozlarga yuboriladi.</p>
             
             <div className="flex justify-end mb-2">
                 <button onClick={loadNewMenuTemplate} className="text-blue-600 text-sm font-bold hover:underline bg-blue-50 px-3 py-1 rounded-lg">
                    "Yangi Menyu" shablonini yuklash
                 </button>
             </div>

             <textarea 
                rows="6"
                className="w-full p-4 border border-gray-200 bg-gray-50 rounded-xl mb-4 text-lg font-medium outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                placeholder="Xabar matnini kiriting..."
                value={broadcastMsg}
                onChange={(e) => setBroadcastMsg(e.target.value)}
             ></textarea>
             
             <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                 <span className="text-gray-500 text-sm font-mono">O'zgaruvchilar: <span className="font-bold">{`{name}`}</span> - Mijoz ismi</span>
                 <button 
                    onClick={openBroadcastConfirm} 
                    disabled={sending || !broadcastMsg}
                    className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 disabled:opacity-50 disabled:shadow-none flex items-center gap-2 transition-all active:scale-95"
                 >
                    {sending ? 'Yuborilmoqda...' : <><Send size={20}/> Yuborish</>}
                 </button>
             </div>
          </div>
        )}

        {/* 3. TARIX (LOGLAR) */}
        {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-sm uppercase">
                        <tr>
                            <th className="p-4 font-bold">Sana</th>
                            <th className="p-4 font-bold">Telefon</th>
                            <th className="p-4 font-bold">Xabar</th>
                            <th className="p-4 font-bold text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-blue-50 transition-colors">
                                <td className="p-4 text-sm text-gray-500 font-mono">{new Date(log.date).toLocaleString()}</td>
                                <td className="p-4 font-bold text-gray-700 font-mono">{log.phone}</td>
                                <td className="p-4 text-sm text-gray-600 max-w-md truncate" title={log.message}>{log.message}</td>
                                <td className="p-4 text-center">
                                    {log.status === 'sent' 
                                        ? <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold uppercase"><CheckCircle size={14}/> Sent</span> 
                                        : <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold uppercase"><AlertTriangle size={14}/> Fail</span>}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr><td colSpan="4" className="p-8 text-center text-gray-400">Tarix bo'sh</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}

        {/* 4. SOZLAMALAR */}
        {activeTab === 'settings' && (
            <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Eskiz.uz Sozlamalari</h2>
                        <p className="text-xs text-gray-500">API ma'lumotlarini kiriting</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Email (Login)</label>
                        <input 
                            type="text" 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-700"
                            value={settings.eskizEmail || ''}
                            onChange={(e) => setSettings({...settings, eskizEmail: e.target.value})}
                            placeholder="example@eskiz.uz"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Parol</label>
                        <input 
                            type="password" 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all" 
                            value={settings.eskizPassword || ''}
                            onChange={(e) => setSettings({...settings, eskizPassword: e.target.value})}
                            placeholder="••••••••"
                        />
                    </div>
                    <button onClick={handleSaveSettings} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all mt-2">
                        Saqlash
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* CONFIRM MODAL */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen} 
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} 
        onConfirm={confirmModal.onConfirm} 
        message={confirmModal.message}
        title="Tasdiqlash"
        confirmText="Ha, yuborish"
      />
    </div>
  );
};

export default SmsPage;