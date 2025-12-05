const { db, notify } = require('../database.cjs');

module.exports = {
  getCustomers: () => db.prepare('SELECT * FROM customers').all(),
  
  addCustomer: (c) => {
      const res = db.prepare('INSERT INTO customers (name, phone, type, value, balance, birthday, debt) VALUES (?, ?, ?, ?, ?, ?, 0)').run(c.name, c.phone, c.type, c.value, 0, c.birthday);
      notify('customers', null);
      return res;
  },
  
  deleteCustomer: (id) => {
      const res = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
      notify('customers', null);
      return res;
  },

  // --- O'ZGARISH SHU YERDA ---
  // Oldin shunchaki customers jadvalidan olardi.
  // Endi customer_debts jadvalidan 'due_date' (to'lash muddati) ni ham qo'shib olib kelayapmiz.
  getDebtors: () => {
      return db.prepare(`
        SELECT c.*, MIN(cd.due_date) as next_due_date 
        FROM customers c 
        LEFT JOIN customer_debts cd ON c.id = cd.customer_id AND cd.is_paid = 0 
        WHERE c.debt > 0 
        GROUP BY c.id
      `).all();
  },
  // ---------------------------

  getDebtHistory: (id) => db.prepare('SELECT * FROM debt_history WHERE customer_id = ? ORDER BY id DESC').all(id),
  
  payDebt: (customerId, amount, comment) => {
    const date = new Date().toISOString();
    const updateDebt = db.transaction(() => {
      db.prepare('UPDATE customers SET debt = debt - ? WHERE id = ?').run(amount, customerId);
      db.prepare('INSERT INTO debt_history (customer_id, amount, type, date, comment) VALUES (?, ?, ?, ?, ?)').run(customerId, amount, 'payment', date, comment);
      
      // Agar qarz to'liq uzilsa, muddatli qarzlarni ham 'to'landi' deb belgilaymiz
      const currentDebt = db.prepare('SELECT debt FROM customers WHERE id = ?').get(customerId).debt;
      if (currentDebt <= 0) {
          db.prepare('UPDATE customer_debts SET is_paid = 1 WHERE customer_id = ?').run(customerId);
      }
    });
    const res = updateDebt();
    notify('customers', null);
    notify('debtors', null);
    return res;
  }
};