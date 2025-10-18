const { contextBridge, ipcRenderer } = require('electron');

console.log('🌉 [PRELOAD] ตั้งค่า Real-time APIs...');

contextBridge.exposeInMainWorld('realtimeAPI', {
  // 🕒 Time API
  getWorldTime: () => {
    console.log('🕒 [PRELOAD] ร้องขอเวลา...');
    return ipcRenderer.invoke('get-world-time');
  },
  
  // 📊 Mock Agents API
  getMockAgents: () => {
    console.log('📊 [PRELOAD] ร้องขอข้อมูล agents...');
    return ipcRenderer.invoke('get-mock-agents');
  },
  
  // 🌤️ Weather API
  getWeather: () => {
    console.log('🌤️ [PRELOAD] ร้องขอสภาพอากาศ...');
    return ipcRenderer.invoke('get-weather');
  },
  // 🎭 Agent Simulator
  startSimulator: () => {
    console.log('🎭 [PRELOAD] เริ่ม simulator...');
    return ipcRenderer.invoke('start-agent-simulator');
  },
  
  stopSimulator: () => {
    console.log('⏹️ [PRELOAD] หยุด simulator...');
    return ipcRenderer.invoke('stop-agent-simulator');
  },
  
  // 📡 รับ events จาก main process
  onAgentStatusChanged: (callback) => {
    console.log('📡 [PRELOAD] ลงทะเบียน status listener...');
    ipcRenderer.on('agent-status-changed', (event, data) => callback(data));
  }
});

console.log('✅ [PRELOAD] Real-time APIs พร้อมใช้งาน');