const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Validate environment variables
function validateEnv() {
    const requiredEnvVars = ['DISCORD_TOKEN', 'CLIENT_ID', 'OPENWEATHER_API_KEY'];
    const missing = [];

    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:', missing.join(', '));
        process.exit(1);
    }
}

// Check if all required files exist
function validateFiles() {
    const requiredFiles = ['index.js', 'deploy-commands.js', '.env'];
    const missing = [];

    for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(__dirname, file))) {
            missing.push(file);
        }
    }

    if (missing.length > 0) {
        console.error('❌ Missing required files:', missing.join(', '));
        process.exit(1);
    }
}

async function startBot() {
    try {
        // First deploy commands
        console.log('🔄 Deploying commands...');
        const deploy = spawn('node', ['deploy-commands.js'], {
            stdio: 'inherit'
        });

        await new Promise((resolve, reject) => {
            deploy.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Command deployment failed with code ${code}`));
                }
            });
        });

        console.log('✅ Commands deployed successfully');

        // Start the bot
        console.log('🤖 Starting Discord bot...');
        const bot = spawn('node', ['index.js'], {
            stdio: 'inherit'
        });

        bot.on('error', (err) => {
            console.error('❌ Failed to start bot:', err);
            process.exit(1);
        });

        bot.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Bot process exited with code ${code}`);
                process.exit(code);
            }
        });

    } catch (error) {
        console.error('❌ Error during startup:', error);
        process.exit(1);
    }
}

// Run startup sequence
require('dotenv').config();
validateEnv();
validateFiles();
startBot();
