const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const https = require('https');
const fs = require('fs').promises;
const config = require('./api-config');

let mainWindow;
let agentStatusInterval = null;
let tray = null;

function createWindow() {
    console.log('🚀 [MAIN] สร้าง Real-time Wallboard...');

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        title: 'Agent Wallboard - Real-time Dashboard'
    });

    // ซ่อนหน้าต่างเมื่อ minimize
    mainWindow.on('minimize', (event) => {
        event.preventDefault();
        mainWindow.hide();
    });

    // ซ่อนหน้าต่างแทนปิด
    mainWindow.on('close', (event) => {
        if (!app.isQuiting) {
            event.preventDefault();
            if (tray) mainWindow.hide();
        }
        return false;
    });

    mainWindow.loadFile('index.html');
    mainWindow.webContents.openDevTools();

    console.log('✅ [MAIN] Wallboard พร้อมแล้ว');
}

// ===== HTTP API FUNCTIONS =====

// 🌐 ฟังก์ชันเรียก HTTP API
function callAPI(url) {
    return new Promise((resolve, reject) => {
        console.log('🌐 [MAIN] เรียก API:', url);

        https.get(url, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('✅ [MAIN] API สำเร็จ');
                    resolve(jsonData);
                } catch (error) {
                    console.error('❌ [MAIN] Parse error:', error);
                    reject(error);
                }
            });

        }).on('error', (error) => {
            console.error('❌ [MAIN] API error:', error);
            reject(error);
        });
    });
}

function fetchTimeWithAPIKey(url) {
    return new Promise((resolve, reject) => {
        console.log('🌐 [MAIN] เรียก API:', url);

        // Define the headers, including the X-RapidAPI-Key
        const options = {
            headers: {
                'X-RapidAPI-Key': config.timeKey,  // Replace with your RapidAPI key
                'X-RapidAPI-Host': config.timeHost,  // This is the RapidAPI host for the WorldTimeAPI
            }
        };

        // Use https.get with the options to include the headers
        https.get(url, options, (response) => {
            let data = '';

            response.on('data', (chunk) => {
                data += chunk;
            });

            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('✅ [MAIN] API สำเร็จ');
                    resolve(jsonData);
                } catch (error) {
                    console.error('❌ [MAIN] Parse error:', error);
                    reject(error);
                }
            });

        }).on('error', (error) => {
            console.error('❌ [MAIN] API error:', error);
            reject(error);
        });
    });
}

// ===== IPC HANDLERS =====

// 🕒 ดึงเวลาจาก World Time API
ipcMain.handle('get-world-time', async () => {
    try {
        console.log('🕒 [MAIN] ดึงเวลาจาก API...');
        const timeData = await fetchTimeWithAPIKey(config.timeAPI);

        return {
            success: true,
            datetime: timeData.datetime,
            timezone: timeData.timezone,
            formatted: new Date(timeData.datetime).toLocaleString('th-TH')
        };

    } catch (error) {
        console.error('❌ [MAIN] Time API error:', error);
        return {
            success: false,
            error: error.message,
            fallback: new Date().toLocaleString('th-TH')
        };
    }
});

// 📊 ดึงข้อมูล mock users (จำลอง agents)
ipcMain.handle('get-mock-agents', async () => {
    try {
        console.log('📊 [MAIN] ดึงข้อมูล mock agents...');
        const users = await callAPI(config.usersAPI);

        // แปลง users เป็น agent format
        const agents = users.slice(0, 5).map((user, index) => {
            const statuses = ['Available', 'Busy', 'Break', 'Offline'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

            return {
                id: `AG${String(index + 1).padStart(3, '0')}`,
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: randomStatus,
                extension: `100${index + 1}`,
                company: user.company.name,
                lastUpdate: new Date().toISOString()
            };
        });

        return {
            success: true,
            agents: agents,
            count: agents.length,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('❌ [MAIN] Mock agents error:', error);

        // Fallback ข้อมูล
        const mockData = await fs.readFile('mock-data.json', 'utf8');
        const fallbackData = JSON.parse(mockData);

        return {
            success: true,
            agents: fallbackData.agents,
            fallback: true,
            error: error.message
        };
    }
});

// 🌤️ ดึงข้อมูลสภาพอากาศ (ถ้ามี API key)
ipcMain.handle('get-weather', async () => {
    if (config.weatherKey === 'your api') {
        return {
            success: false,
            error: 'ไม่ได้ตั้งค่า Weather API key',
            fallback: {
                location: 'Bangkok',
                temperature: '32°C',
                description: 'Sunny',
                humidity: '65%'
            }
        };
    }

    try {
        const weatherURL = `${config.weatherAPI}?q=Bangkok&appid=${config.weatherKey}&units=metric`;
        const weatherData = await callAPI(weatherURL);

        return {
            success: true,
            location: weatherData.name,
            temperature: Math.round(weatherData.main.temp) + '°C',
            description: weatherData.weather[0].description,
            humidity: weatherData.main.humidity + '%',
            icon: weatherData.weather[0].icon
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            fallback: {
                location: 'Bangkok',
                temperature: '32°C',
                description: 'Data unavailable',
                humidity: 'N/A'
            }
        };
    }
});

// จำลองการเปลี่ยนสถานะ agent แบบสุ่ม
ipcMain.handle('start-agent-simulator', () => {
    console.log('🎭 [MAIN] เริ่ม Agent Status Simulator...');

    if (agentStatusInterval) {
        clearInterval(agentStatusInterval);
    }

    const statuses = ['Available', 'Busy', 'Break'];
    const agentIds = ['AG001', 'AG002', 'AG003'];

    agentStatusInterval = setInterval(() => {
        const randomAgent = agentIds[Math.floor(Math.random() * agentIds.length)];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];

        console.log(`🎭 [SIMULATOR] ${randomAgent} → ${randomStatus}`);

        // ส่งข้อมูลไปยัง renderer
        mainWindow.webContents.send('agent-status-changed', {
            agentId: randomAgent,
            newStatus: randomStatus,
            timestamp: new Date().toISOString(),
            simulated: true
        });

    }, 10000); // ทุก 10 วินาที

    return { success: true, message: 'Agent Simulator เริ่มทำงานแล้ว' };
});

ipcMain.handle('stop-agent-simulator', () => {
    console.log('⏹️ [MAIN] หยุด Agent Status Simulator');

    if (agentStatusInterval) {
        clearInterval(agentStatusInterval);
        agentStatusInterval = null;
    }

    return { success: true, message: 'Agent Simulator หยุดแล้ว' };
});

app.whenReady().then(() => {
    createWindow();

    const iconPath = path.join(__dirname, 'assets/icon.png'); // ไอคอน tray 
    tray = new Tray(iconPath);

    const contextMenu = Menu.buildFromTemplate([
        { label: 'Open Dashboard', click: () => mainWindow.show() },
        {
            label: 'Exit', click: () => {
                app.isQuiting = true;
                app.quit();
            }
        }
    ]);

    tray.setToolTip('Agent Wallboard');
    tray.setContextMenu(contextMenu);

    // คลิก Tray เพื่อสลับซ่อน/แสดง
    tray.on('click', () => {
        mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
    });
});


app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});