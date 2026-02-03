const fs = require('fs');
const path = require('path');
const os = require('os');
const { debug } = require('../services/debugService'); // Assuming debugService is available here, otherwise we can remove it or use console.log

class BrowserHelper {
    constructor() {
        this.cache = null;
    }

    /**
     * Tenta encontrar o executável do Google Chrome no sistema
     * @returns {string|null} Caminho do executável ou null se não encontrado
     */
    getChromeExecutablePath() {
        if (this.cache) {
            return this.cache;
        }

        const platform = os.platform();
        let possiblePaths = [];

        if (platform === 'win32') {
            possiblePaths = [
                process.env.CHROME_PATH, // Allow override via env var
                path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Google\\Chrome\\Application\\chrome.exe'),
                path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Google\\Chrome\\Application\\chrome.exe'),
                path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
                // Edge as fallback? Maybe later. For now stick to Chrome as requested.
            ].filter(Boolean);
        } else if (platform === 'darwin') {
            possiblePaths = [
                process.env.CHROME_PATH,
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                path.join(os.homedir(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
            ].filter(Boolean);
        } else if (platform === 'linux') {
            possiblePaths = [
                process.env.CHROME_PATH,
                '/usr/bin/google-chrome',
                '/usr/bin/google-chrome-stable',
                '/usr/bin/chromium-browser',
                '/usr/bin/chromium',
                '/snap/bin/chromium'
            ].filter(Boolean);
        }

        for (const exePath of possiblePaths) {
            try {
                if (fs.existsSync(exePath)) {
                    // double check it's a file
                    const stat = fs.statSync(exePath);
                    if (stat.isFile()) {
                        console.log(`BrowserHelper: Chrome encontrado em ${exePath}`);
                        this.cache = exePath;
                        return exePath;
                    }
                }
            } catch (error) {
                // Ignore permission errors etc, just try next
            }
        }

        console.warn('BrowserHelper: Nenhum executável do Chrome encontrado nos locais padrão.');
        return null;
    }
}

module.exports = new BrowserHelper();
