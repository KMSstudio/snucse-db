const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

class LogSys {
    static logDir = '../../log';
    static histDir = path.join(LogSys.logDir, 'hist');
    static logFile = path.join(LogSys.logDir, 'current.log');

    static init() {
        if (!fs.existsSync(this.logDir)) fs.mkdirSync(this.logDir, { recursive: true });
        if (!fs.existsSync(this.histDir)) fs.mkdirSync(this.histDir, { recursive: true });
    }

    static log(msg, user, ip) { this.writeLog('INFO', msg, user, ip); }
    static err(msg, user, ip) { this.writeLog('ERROR', msg, user, ip); }
    static warn(msg, user, ip) { this.writeLog('WARN', msg, user, ip); }

    static writeLog(level, msg, user, ip) {
        const timestamp = new Date().toISOString();
        let email = user || 'unknown';
        const adr = ip || 'unknown';
        if (email.endsWith('@snu.ac.kr')) { email = email.slice(0, -'@snu.ac.kr'.length); }

        const fullMsg = `[${timestamp}] [${level}] [${usr}] [${adr}] ${msg}\n`;
        fs.appendFileSync(this.logFile, fullMsg);
    }

    static archiveLogs() {
        const date = new Date();
        const yest = new Date(date.setDate(date.getDate() - 1));
        const dateStr = yest.toISOString().slice(0, 10).replace(/-/g, '');
        const zipPath = path.join(this.histDir, `${dateStr}.zip`);
        
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => { console.log(`Archived logs: ${archive.pointer()} total bytes`); });
        archive.on('error', (err) => { console.error(`Error archiving logs: ${err.message}`); });

        archive.pipe(output);
        archive.append(fs.createReadStream(this.logFile), { name: 'current.log' });
        archive.finalize();

        fs.unlinkSync(this.logFile);
    }

    static scheduleArchiving() {
        const now = new Date();
        const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const delay = midnight - now;

        setTimeout(() => {
            this.archiveLogs();
            this.scheduleArchiving();
        }, delay);
    }
}

LogSys.init();
LogSys.scheduleArchiving();

module.exports = LogSys;