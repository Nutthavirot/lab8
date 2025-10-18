const { contextBridge, ipcRenderer } = require('electron');

console.log('🌉 [PRELOAD] กำลังตั้งค่า security bridge...');

// ✅ เปิดเผย APIs ที่ปลอดภัยให้ Renderer ใช้
contextBridge.exposeInMainWorld('electronAPI', {
  // 📤 ส่งข้อความไป Main Process
  sendMessage: (message) => {
    console.log('📤 [PRELOAD] ส่งข้อความ:', message);
    return ipcRenderer.invoke('send-message', message);
  },
  
  // 👋 Hello function ทดสอบ
  sayHello: (name) => {
    console.log('👋 [PRELOAD] ส่งคำทักทาย:', name);
    return ipcRenderer.invoke('say-hello', name);
  }
});

// เพิ่มส่วนนี้ใน preload.js

contextBridge.exposeInMainWorld('electronAPI', {
  // ฟังก์ชันเดิม
  sendMessage: (message) => {
    console.log('📤 [PRELOAD] ส่งข้อความ:', message);
    return ipcRenderer.invoke('send-message', message);
  },
  
  sayHello: (name) => {
    console.log('👋 [PRELOAD] ส่งคำทักทาย:', name);
    return ipcRenderer.invoke('say-hello', name);
  },
  
  // ฟังก์ชันใหม่สำหรับ agent wallboard
  getAgents: () => {
    console.log('📊 [PRELOAD] ร้องขอข้อมูล agents');
    return ipcRenderer.invoke('get-agents');
  },
  
  changeAgentStatus: (agentId, newStatus) => {
    console.log(`🔄 [PRELOAD] เปลี่ยนสถานะ ${agentId} เป็น ${newStatus}`);
    return ipcRenderer.invoke('change-agent-status', { agentId, newStatus });
  }
});

console.log('✅ [PRELOAD] Security bridge พร้อมแล้ว');