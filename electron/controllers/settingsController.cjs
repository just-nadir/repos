const { db, notify } = require('../database.cjs');

module.exports = {
  getSettings: () => {
    const rows = db.prepare('SELECT * FROM settings').all();
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
  },

  saveSettings: (settingsObj) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const saveTransaction = db.transaction((settings) => {
      for (const [key, value] of Object.entries(settings)) stmt.run(key, String(value));
    });
    const res = saveTransaction(settingsObj);
    notify('settings', null);
    return res;
  },

  getKitchens: () => db.prepare('SELECT * FROM kitchens').all(),
  
  saveKitchen: (data) => {
    if (data.id) {
        db.prepare('UPDATE kitchens SET name = ?, printer_ip = ?, printer_port = ? WHERE id = ?')
          .run(data.name, data.printer_ip, data.printer_port || 9100, data.id);
    } else {
        db.prepare('INSERT INTO kitchens (name, printer_ip, printer_port) VALUES (?, ?, ?)')
          .run(data.name, data.printer_ip, data.printer_port || 9100);
    }
    notify('kitchens', null);
  },
  
  deleteKitchen: (id) => {
      db.prepare("UPDATE products SET destination = NULL WHERE destination = ?").run(String(id));
      const res = db.prepare('DELETE FROM kitchens WHERE id = ?').run(id);
      notify('kitchens', null);
      return res;
  }
};