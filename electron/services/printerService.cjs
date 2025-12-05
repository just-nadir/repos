const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');
const { db } = require('../database.cjs');

// Printerga ulanish va chop etish funksiyasi
async function printReceipt(printerIp, printerPort, data) {
  if (!printerIp) {
    console.log("⚠️ Printer IP kiritilmagan, chop etilmadi.");
    return;
  }

  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON, // Ko'pchilik POS printerlar Epson protokolida ishlaydi
    interface: `tcp://${printerIp}:${printerPort}`, // LAN orqali ulanish
    characterSet: CharacterSet.PC852_LATIN2, // Kirill/Lotin harflari uchun
    removeSpecialCharacters: false,
    options: {
      timeout: 5000 // 5 sekund kutish
    }
  });

  try {
    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.error("❌ Printerga ulanib bo'lmadi:", printerIp);
      return;
    }

    // --- CHEK DIZAYNI ---
    
    // Header
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(data.restaurantName || "RESTORAN");
    printer.bold(false);
    printer.setTextSize(0, 0);
    if (data.address) printer.println(data.address);
    if (data.phone) printer.println(data.phone);
    printer.newLine();

    // Info
    printer.alignLeft();
    printer.println(`Sana: ${new Date().toLocaleString()}`);
    printer.println(`Stol: ${data.tableName}`);
    if (data.waiterName) printer.println(`Xodim: ${data.waiterName}`);
    printer.drawLine();

    // Items
    printer.tableCustom([
      { text: "Nomi", align: "LEFT", width: 0.5 },
      { text: "Soni", align: "CENTER", width: 0.2 },
      { text: "Summa", align: "RIGHT", width: 0.3 }
    ]);

    data.items.forEach(item => {
      printer.tableCustom([
        { text: item.product_name, align: "LEFT", width: 0.5 },
        { text: item.quantity.toString(), align: "CENTER", width: 0.2 },
        { text: (item.price * item.quantity).toLocaleString(), align: "RIGHT", width: 0.3 }
      ]);
    });
    
    printer.drawLine();

    // Footer Totals
    printer.alignRight();
    if (data.service > 0) printer.println(`Xizmat haqi: ${data.service.toLocaleString()}`);
    if (data.discount > 0) printer.println(`Chegirma: -${data.discount.toLocaleString()}`);
    
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`JAMI: ${data.total.toLocaleString()}`);
    printer.setTextSize(0, 0);
    printer.bold(false);
    
    printer.newLine();
    printer.alignCenter();
    if (data.footer) printer.println(data.footer);
    printer.println("Xaridingiz uchun rahmat!");
    
    printer.cut(); // Qog'ozni kesish
    
    await printer.execute();
    console.log("✅ Chek chiqarildi!");

  } catch (error) {
    console.error("🖨 Printer xatoligi:", error);
  }
}

// Sozlamalarni bazadan olish yordamchisi
function getSettings() {
    const rows = db.prepare('SELECT * FROM settings').all();
    return rows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});
}

module.exports = {
  printOrderReceipt: async (orderData) => {
    // Kassa cheki (Checkout)
    const settings = getSettings();
    const printData = {
        restaurantName: settings.restaurantName,
        address: settings.address,
        phone: settings.phone,
        footer: settings.receiptFooter,
        ...orderData
    };
    
    // Asosiy kassa printeriga yuborish
    await printReceipt(settings.printerReceiptIP, settings.printerReceiptPort || 9100, printData);
  },

  printKitchenTicket: async (items, tableName) => {
    // Oshxona cheki (Buyurtma tushganda)
    // Bu yerda itemsni "destination" bo'yicha guruhlab, har bir oshxona printeriga alohida yuborish kerak
    // Hozircha soddalashtirilgan versiya: Barcha ovqatlarni bitta oshxona printeriga yuborish (agar sozlamada bo'lsa)
    
    // Real loyihada bu yerda "kitchens" jadvalidan IP larni olib, loop qilib yuboriladi.
    console.log("Oshxona printeri logikasi keyingi bosqichda to'liq qo'shiladi.");
  }
};