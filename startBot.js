const { spawn } = require('child_process');
const path = require('path');

let restartAttempts = 0;
const maxRestartAttempts = 5;
const restartWindow = 60000; // 1 minute (in milliseconds)
let lastRestartTime = Date.now();

function startBot() {
    const botProcess = spawn('node', [path.join(__dirname, 'bot.js')], { stdio: 'inherit' });

    botProcess.on('close', (code) => {
        if (code !== 0) {
            const currentTime = Date.now();
            if (currentTime - lastRestartTime > restartWindow) {
                // Reset restart attempts after the window has passed
                restartAttempts = 0;
            }
            
            lastRestartTime = currentTime;
            restartAttempts += 1;

            if (restartAttempts <= maxRestartAttempts) {
                console.log(`Bot process exited with code ${code}. Restarting... (Attempt ${restartAttempts}/${maxRestartAttempts})`);
                startBot(); // Restart the bot
            } else {
                console.error(`Bot reached the maximum restart attempts (${maxRestartAttempts}) in the past minute. Please check the logs.`);
            }
        }
    });

    botProcess.on('error', (err) => {
        console.error('Failed to start bot:', err);
    });
}

startBot();
