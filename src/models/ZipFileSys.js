const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

class ZipFileSys {
    static zipFolder(folderPath, outputPath) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(outputPath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', () => { resolve(); });
            archive.on('error', (err) => { reject(err); });

            archive.pipe(output);
            archive.directory(folderPath, false);
            archive.finalize();
        });
    }

    static async refresh(folderPath) {
        let currentPath = folderPath;
        const baseDataPath = path.join(__dirname, '../../data');
        const zipBasePath = path.join(__dirname, '../../zip');

        while (currentPath !== baseDataPath) {
            const relativeFolder = path.relative(baseDataPath, currentPath);
            const zipFolderPath = path.dirname(relativeFolder);
            const zipFileName = path.basename(currentPath);
            const zipFilePath = path.join(zipBasePath, zipFolderPath, `${zipFileName}.zip`);

            if (!fs.existsSync(path.join(zipBasePath, zipFolderPath))) { 
                fs.mkdirSync(path.join(zipBasePath, zipFolderPath), { recursive: true });
            }

            try { await ZipFileSys.zipFolder(currentPath, zipFilePath); }
            catch (err) { console.error(`Failed to zip ${currentPath}:`, err); }
            console.log(`zip ${currentPath}`);

            currentPath = path.dirname(currentPath);
        }
    }
}

module.exports = ZipFileSys;
