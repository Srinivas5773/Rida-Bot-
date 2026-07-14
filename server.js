const express = require('express');
const qrcode = require('qrcode');
const { startWhatsAppBot, resetWhatsAppBot, getCurrentQR, getIsConnected } = require('./bot.js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    const isConnected = getIsConnected();
    const statusColor = isConnected ? 'green' : 'orange';
    const statusText = isConnected ? '✅ Bot is Connected and Running!' : '⏳ Waiting for QR Scan...';
    const statusMessage = isConnected ? 'Your AI assistant is ready to respond to messages!' : 'Scan the QR code to connect your WhatsApp bot.';
    
    const html = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="refresh" content="10">
            <title>WhatsApp AI Assistant</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    margin: 0;
                    padding: 20px;
                }
                .container {
                    background: white;
                    border-radius: 20px;
                    padding: 40px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    text-align: center;
                    max-width: 500px;
                    width: 100%;
                }
                h1 {
                    color: #333;
                    margin-bottom: 30px;
                    font-size: 2.5em;
                }
                .status {
                    color: ${statusColor};
                    font-size: 1.3em;
                    font-weight: bold;
                    margin-bottom: 20px;
                    padding: 15px;
                    background: ${statusColor}20;
                    border-radius: 10px;
                }
                .status-message {
                    color: #666;
                    margin-bottom: 30px;
                    font-size: 1.1em;
                }
                .links {
                    display: flex;
                    gap: 15px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .btn {
                    background: #25D366;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                    transition: all 0.3s ease;
                    display: inline-block;
                }
                .btn:hover {
                    background: #128C7E;
                    transform: translateY(-2px);
                }
                .btn-secondary {
                    background: #007bff;
                }
                .btn-secondary:hover {
                    background: #0056b3;
                }
                .refresh-info {
                    margin-top: 20px;
                    color: #999;
                    font-size: 0.9em;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🤖 WhatsApp AI Assistant</h1>
                <div class="status">${statusText}</div>
                <div class="status-message">${statusMessage}</div>
                <div class="links">
                    <a href="/qr" class="btn">📱 Scan QR Code</a>
                    <a href="/status" class="btn btn-secondary">📊 View Status</a>
                </div>
                <div class="refresh-info">Page auto-refreshes every 10 seconds</div>
            </div>
        </body>
        </html>
    `;
    
    res.send(html);
});

app.get('/qr', async (req, res) => {
    const qrString = getCurrentQR();
    const isConnected = getIsConnected();
    
    if (!qrString) {
        if (isConnected) {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>WhatsApp AI Assistant - Connected</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                            min-height: 100vh;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0;
                            padding: 20px;
                        }
                        .container {
                            background: white;
                            border-radius: 20px;
                            padding: 40px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            text-align: center;
                            max-width: 500px;
                            width: 100%;
                        }
                        .success-icon {
                            font-size: 4em;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #25D366;
                            margin-bottom: 20px;
                        }
                        .message {
                            color: #666;
                            font-size: 1.2em;
                            margin-bottom: 30px;
                            line-height: 1.6;
                        }
                        .btn {
                            background: #007bff;
                            color: white;
                            padding: 12px 25px;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: bold;
                            transition: all 0.3s ease;
                            display: inline-block;
                        }
                        .btn:hover {
                            background: #0056b3;
                            transform: translateY(-2px);
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">✅</div>
                        <h1>Already Connected!</h1>
                        <div class="message">
                            Your WhatsApp bot is running successfully.<br>
                            The AI assistant is ready to respond to messages.
                        </div>
                        <a href="/" class="btn">🏠 Back to Home</a>
                    </div>
                </body>
                </html>
            `;
            res.send(html);
        } else {
            const html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="refresh" content="5">
                    <title>WhatsApp AI Assistant - QR Loading</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            margin: 0;
                            padding: 20px;
                        }
                        .container {
                            background: white;
                            border-radius: 20px;
                            padding: 40px;
                            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                            text-align: center;
                            max-width: 500px;
                            width: 100%;
                        }
                        .loading-icon {
                            font-size: 3em;
                            margin-bottom: 20px;
                            animation: spin 2s linear infinite;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        h1 {
                            color: #ff9800;
                            margin-bottom: 20px;
                        }
                        .message {
                            color: #666;
                            font-size: 1.2em;
                            margin-bottom: 30px;
                            line-height: 1.6;
                        }
                        .refresh-info {
                            color: #999;
                            font-size: 0.9em;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="loading-icon">⏳</div>
                        <h1>QR Not Ready Yet</h1>
                        <div class="message">
                            The QR code is being generated.<br>
                            If this persists, your WhatsApp session may have expired — restart the server or wait a few seconds.<br>
                            Please wait and this page will refresh automatically.
                        </div>
                        <div class="refresh-info">Auto-refreshing in 5 seconds...</div>
                        <a href="/reset" class="btn" style="display:inline-block;margin-top:20px;background:#dc3545;">🔄 Force New QR</a>
                    </div>
                </body>
                </html>
            `;
            res.send(html);
        }
        return;
    }
    
    try {
        const qrDataUrl = await qrcode.toDataURL(qrString, { 
            width: 300, 
            margin: 2 
        });
        
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="refresh" content="30">
                <title>Scan This QR Code</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #25D366 0%, #128C7E 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                        text-align: center;
                        max-width: 600px;
                        width: 100%;
                    }
                    h1 {
                        color: #25D366;
                        margin-bottom: 30px;
                        font-size: 2em;
                    }
                    .qr-container {
                        background: white;
                        padding: 20px;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                        margin-bottom: 30px;
                        display: inline-block;
                    }
                    .qr-image {
                        border: 3px solid #25D366;
                        border-radius: 10px;
                    }
                    .instructions {
                        text-align: left;
                        background: #f8f9fa;
                        padding: 25px;
                        border-radius: 10px;
                        margin-bottom: 20px;
                    }
                    .instructions h3 {
                        color: #333;
                        margin-bottom: 15px;
                        text-align: center;
                    }
                    .instructions ol {
                        color: #666;
                        line-height: 1.8;
                        padding-left: 20px;
                    }
                    .instructions li {
                        margin-bottom: 10px;
                    }
                    .refresh-info {
                        color: #999;
                        font-size: 0.9em;
                        margin-top: 20px;
                    }
                    .btn {
                        background: #007bff;
                        color: white;
                        padding: 12px 25px;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        transition: all 0.3s ease;
                        display: inline-block;
                        margin-top: 10px;
                    }
                    .btn:hover {
                        background: #0056b3;
                        transform: translateY(-2px);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>📱 Scan This QR Code</h1>
                    
                    <div class="qr-container">
                        <img src="${qrDataUrl}" alt="QR Code" class="qr-image">
                    </div>
                    
                    <div class="instructions">
                        <h3>🔗 How to Connect:</h3>
                        <ol>
                            <li>Open WhatsApp on your phone</li>
                            <li>Tap 3 dots (menu) → Linked Devices</li>
                            <li>Tap "Link a Device"</li>
                            <li>Scan this QR code with your phone</li>
                            <li>Wait for confirmation message</li>
                        </ol>
                    </div>
                    
                    <a href="/" class="btn">🏠 Back to Home</a>
                    
                    <div class="refresh-info">
                        QR code expires in 30 seconds - page will refresh automatically
                    </div>
                </div>
            </body>
            </html>
        `;
        
        res.send(html);
        
    } catch (error) {
        res.status(500).send('Error generating QR code');
    }
});

app.get('/reset', async (req, res) => {
    try {
        await resetWhatsAppBot();
        res.redirect('/qr');
    } catch (error) {
        res.status(500).send('Failed to reset session. Restart the server and try again.');
    }
});

app.get('/status', (req, res) => {
    const connected = getIsConnected();
    const qr_available = getCurrentQR() !== null;
    
    res.json({
        connected: connected,
        qr_available: qr_available,
        message: connected ? "Bot is running" : "Waiting for QR scan",
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log('\n════════════════════════════');
    console.log('🚀 Server started!');
    console.log(`🌐 Open: http://localhost:${PORT}`);
    console.log(`📱 QR Page: http://localhost:${PORT}/qr`);
    console.log(`📊 Status: http://localhost:${PORT}/status`);
    console.log('════════════════════════════\n');
    
    startWhatsAppBot();
});
