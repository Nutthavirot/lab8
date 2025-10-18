const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

function createWindow() {
  console.log('🖥️ [MAIN] กำลังสร้าง window...');
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,      // ✅ ปิดเพื่อความปลอดภัย
      contextIsolation: true,      // ✅ เปิดเพื่อความปลอดภัย  
      preload: path.join(__dirname, 'preload.js')  // ✅ ใช้ preload
    }
  });

  mainWindow.loadFile('index.html');
  
  // เปิด DevTools เพื่อดู console
  mainWindow.webContents.openDevTools();
  
  console.log('✅ [MAIN] สร้าง window สำเร็จ');
}

// เพิ่มส่วนนี้ใน main.js หลังจาก createWindow()

// ===== IPC HANDLERS =====

// 📨 Handler สำหรับรับข้อความ
ipcMain.handle('send-message', (event, message) => {
  console.log('📨 [MAIN] ได้รับข้อความ:', message);
  
  // ประมวลผลข้อความ
  const response = {
    original: message,
    reply: `Server ได้รับ: "${message}"`,
    timestamp: new Date().toISOString(),
    status: 'success'
  };
  
  console.log('📤 [MAIN] ส่งกลับ:', response);
  return response;
});

// 👋 Handler สำหรับคำทักทาย
ipcMain.handle('say-hello', (event, name) => {
  console.log('👋 [MAIN] ทักทายกับ:', name);
  
  const greetings = [
    `สวัสดี ${name}! ยินดีต้อนรับสู่ Agent Wallboard`,
    `หวัดดี ${name}! วันนี้พร้อมทำงานแล้วหรือยัง?`,
    `Hello ${name}! มีความสุขในการทำงานนะ`,
  ];
  
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  return {
    greeting: randomGreeting,
    name: name,
    time: new Date().toLocaleString('th-TH'),
    agentCount: 3  // จำลองจำนวน agents ที่ online
  };
});

console.log('🔧 [MAIN] IPC Handlers ตั้งค่าเสร็จแล้ว');

// เพิ่มส่วนนี้ใน main.js

// 📊 Handler สำหรับโหลดข้อมูล agents
ipcMain.handle('get-agents', async () => {
  console.log('📊 [MAIN] กำลังโหลดข้อมูล agents...');
  
  try {
    // อ่านไฟล์ข้อมูล agents
    const data = await fs.readFile('agent-data.json', 'utf8');
    const agentData = JSON.parse(data);
    
    console.log('✅ [MAIN] โหลดข้อมูล agents สำเร็จ');
    return {
      success: true,
      data: agentData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('❌ [MAIN] Error โหลดข้อมูล:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

// 🔄 Handler สำหรับเปลี่ยนสถานะ agent
ipcMain.handle('change-agent-status', async (event, { agentId, newStatus }) => {
  console.log(`🔄 [MAIN] เปลี่ยนสถานะ agent ${agentId} เป็น ${newStatus}`);
  
  try {
    // อ่านข้อมูลปัจจุบัน
    const data = await fs.readFile('agent-data.json', 'utf8');
    const agentData = JSON.parse(data);
    
    // หา agent และเปลี่ยนสถานะ
    const agent = agentData.agents.find(a => a.id === agentId);
    if (agent) {
      agent.status = newStatus;
      agent.lastStatusChange = new Date().toISOString();
      
      // บันทึกกลับไปยังไฟล์
      await fs.writeFile('agent-data.json', JSON.stringify(agentData, null, 2));
      
      console.log(`✅ [MAIN] เปลี่ยนสถานะ ${agentId} สำเร็จ`);
      return {
        success: true,
        agent: agent,
        message: `เปลี่ยนสถานะเป็น ${newStatus} แล้ว`
      };
    } else {
      throw new Error(`ไม่พบ agent ID: ${agentId}`);
    }
    
  } catch (error) {
    console.error('❌ [MAIN] Error เปลี่ยนสถานะ:', error);
    return {
      success: false,
      error: error.message
    };
  }
});

app.whenReady().then(() => {
  console.log('⚡ [MAIN] Electron พร้อมทำงาน');
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});