// api-config.js - การตั้งค่า APIs ที่ใช้

module.exports = {
  // 🕒 World Time API (ฟรี)
  timeAPI: 'https://world-time-api3.p.rapidapi.com/timezone/Asia/Bangkok',
  timeHost: 'world-time-api3.p.rapidapi.com',
  timeKey: 'd267c5e997msh131e02001bc8341p17d250jsndf67952f6e09', // แทนที่ด้วย API key จริง


  // 📊 JSONPlaceholder (ฟรี - สำหรับทดสอบ HTTP requests)
  usersAPI: 'https://jsonplaceholder.typicode.com/users',
  postsAPI: 'https://jsonplaceholder.typicode.com/posts',
  
  // ⚡ WebSocket Echo Test (ฟรี)
  websocketURL: 'wss://echo.websocket.org/',
  
  // 🌤️ OpenWeatherMap (ฟรี - ต้องสมัคร API key)
  // ไปสมัครที่: https://openweathermap.org/api
  weatherAPI: 'https://api.openweathermap.org/data/2.5/weather',
  weatherKey: '25b336faa8a5a2be147de427cc4c2e4e', // แทนที่ด้วย API key จริง
  
  // 📱 จำลอง Agent API endpoints
  mockAgentAPI: {
    status: 'http://localhost:3001/api/agents/status',
    update: 'http://localhost:3001/api/agents/update'
  }
};