const { app, BrowserWindow, ipcMain, dialog, Notification, Menu, Tray, nativeImage} = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let tray = null;

// ฟังก์ชันสร้าง System Tray
function createTray() {
  console.log('🖱️ [MAIN] สร้าง system tray...');
  
  try {
    // สร้าง icon (ใช้ built-in icon ถ้าไม่มีไฟล์)
    let trayIcon;
    try {
      trayIcon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'));
      if (trayIcon.isEmpty()) throw new Error('Icon file not found');
    } catch {
      // ใช้ built-in icon ถ้าไม่มีไฟล์
      trayIcon = nativeImage.createEmpty();
    }
    
    tray = new Tray(trayIcon);
    
    // สร้าง context menu
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '📊 แสดง Wallboard',
        click: () => {
          console.log('📊 [TRAY] แสดง wallboard');
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: '🔄 เปลี่ยนสถานะ',
        submenu: [
          {
            label: '🟢 Available',
            click: () => changeAgentStatusFromTray('Available')
          },
          {
            label: '🔴 Busy', 
            click: () => changeAgentStatusFromTray('Busy')
          },
          {
            label: '🟡 Break',
            click: () => changeAgentStatusFromTray('Break')
          }
        ]
      },
      { type: 'separator' },
      {
        label: '⚙️ ตั้งค่า',
        click: () => {
          console.log('⚙️ [TRAY] เปิดตั้งค่า');
          // เปิดหน้าตั้งค่า (ในอนาคต)
        }
      },
      {
        label: '❌ ออกจากโปรแกรม',
        click: () => {
          console.log('❌ [TRAY] ออกจากโปรแกรม');
          app.quit();
        }
      }
    ]);
    
    // ตั้งค่า tray
    tray.setContextMenu(contextMenu);
    tray.setToolTip('Agent Wallboard - Desktop App');
    
    // เมื่อคลิก tray icon
    tray.on('click', () => {
      console.log('🖱️ [TRAY] คลิก tray icon');
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    
    console.log('✅ [MAIN] System tray พร้อมแล้ว');
    
  } catch (error) {
    console.error('❌ [MAIN] Error สร้าง tray:', error);
  }
}

// ฟังก์ชันเปลี่ยนสถานะจาก tray
function changeAgentStatusFromTray(status) {
  console.log('🔄 [TRAY] เปลี่ยนสถานะเป็น:', status);
  
  // ส่งข้อความไปยัง renderer
  mainWindow.webContents.send('status-changed-from-tray', {
    newStatus: status,
    timestamp: new Date().toISOString()
  });
  
  // แสดง notification
  new Notification({
    title: 'สถานะเปลี่ยนแล้ว',
    body: `เปลี่ยนสถานะเป็น ${status} แล้ว`,
    icon: path.join(__dirname, 'assets', 'notification.png')
  }).show();
}

function createWindow() {
  console.log('🚀 [MAIN] สร้าง window...');
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
// เพิ่มการสร้าง tray
  createTray();
  
  // ซ่อน window แทนการปิดเมื่อกด X
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
      
      // แสดง notification แจ้งว่า app ยังทำงานอยู่
      new Notification({
        title: 'Agent Wallboard',
        body: 'แอปยังทำงานอยู่ใน system tray\nคลิกขวาที่ icon เพื่อเปิดเมนู'
      }).show();
    }
});
  mainWindow.loadFile('index.html');
  mainWindow.webContents.openDevTools();
  
  console.log('✅ [MAIN] Window พร้อมแล้ว');
}

// ===== FILE SYSTEM APIS =====

// 📂 เปิดไฟล์
ipcMain.handle('open-file', async () => {
  console.log('📂 [MAIN] เปิด file dialog...');
  
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt', 'json', 'csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!result.canceled && result.filePaths[0]) {
      const filePath = result.filePaths[0];
      const content = await fs.readFile(filePath, 'utf8');
      
      console.log('✅ [MAIN] อ่านไฟล์สำเร็จ:', path.basename(filePath));
      
      return {
        success: true,
        fileName: path.basename(filePath),
        filePath: filePath,
        content: content,
        size: content.length
      };
    }
    
    return { success: false, cancelled: true };
    
  } catch (error) {
    console.error('❌ [MAIN] Error:', error);
    return { success: false, error: error.message };
  }
});

// 💾 บันทึกไฟล์
ipcMain.handle('save-file', async (event, { content, fileName = 'export.txt' }) => {
  console.log('💾 [MAIN] บันทึกไฟล์...');
  
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'JSON Files', extensions: ['json'] }
      ]
    });

    if (!result.canceled && result.filePath) {
      await fs.writeFile(result.filePath, content, 'utf8');
      
      console.log('✅ [MAIN] บันทึกสำเร็จ:', path.basename(result.filePath));
      
      return {
        success: true,
        fileName: path.basename(result.filePath),
        filePath: result.filePath
      };
    }
    
    return { success: false, cancelled: true };
    
  } catch (error) {
    console.error('❌ [MAIN] Error:', error);
    return { success: false, error: error.message };
  }
});

// 🔔 สร้าง notification
ipcMain.handle('show-notification', (event, { title, body, urgent = false }) => {
  console.log('🔔 [MAIN] แสดง notification:', title);
  
  try {
    const notification = new Notification({
      title: title,
      body: body,
      icon: path.join(__dirname, 'assets', 'notification.png'), // ถ้ามี
      urgency: urgent ? 'critical' : 'normal',
      timeoutType: urgent ? 'never' : 'default'
    });
    
    notification.show();
    
    // เมื่อคลิก notification
    notification.on('click', () => {
      console.log('🔔 [MAIN] คลิก notification');
      mainWindow.show();
      mainWindow.focus();
    });
    
    console.log('✅ [MAIN] แสดง notification สำเร็จ');
    return { success: true };
    
  } catch (error) {
    console.error('❌ [MAIN] Error notification:', error);
    return { success: false, error: error.message };
  }
});

// 📢 Notification สำหรับ Agent Events
ipcMain.handle('notify-agent-event', (event, { agentName, eventType, details }) => {
  console.log('📢 [MAIN] Agent event notification:', agentName, eventType);
  
  const eventMessages = {
    'login': `🟢 ${agentName} เข้าสู่ระบบแล้ว`,
    'logout': `🔴 ${agentName} ออกจากระบบแล้ว`,
    'status_change': `🔄 ${agentName} เปลี่ยนสถานะเป็น ${details.newStatus}`,
    'call_received': `📞 ${agentName} รับสายใหม่`,
    'call_ended': `📞 ${agentName} จบการโทร (${details.duration} วินาที)`
  };
  
  const notification = new Notification({
    title: 'Agent Wallboard Update',
    body: eventMessages[eventType] || `📊 ${agentName}: ${eventType}`,
    icon: path.join(__dirname, 'assets', 'notification.png')
  });
  
  notification.show();
  
  notification.on('click', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  
  return { success: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ป้องกันการปิด app เมื่อปิด window สุดท้าย
app.on('window-all-closed', () => {
  // ไม่ quit เพื่อให้ app ทำงานใน tray ต่อไป
  // app จะปิดเมื่อเลือก "ออกจากโปรแกรม" จาก tray menu
});

// เมื่อจะปิด app จริงๆ
app.on('before-quit', () => {
  app.isQuiting = true;
});