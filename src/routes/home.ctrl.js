"use strict";

const path = require("path");
const fs = require("fs");
const multer = require("multer");

const ZipFileSys = require("../models/ZipFileSys");
const NavConstants = require("../models/NavConstants");

const util = {
    getUniqueFilename : (filename, dir) => {
        let ext = path.extname(filename);
        let name = path.basename(filename, ext);
        let counter = 1;
        let newFilename = filename;

        while (fs.existsSync(path.join(dir, newFilename))) {
            newFilename = `${name} (${counter})${ext}`; counter++; }
        return newFilename;
    },

    getUniqueFolderName : (folderName, dir) => {
        let counter = 1;
        let newFolderName = folderName;

        while (fs.existsSync(path.join(dir, newFolderName))) {
            newFolderName = `${folderName}(${counter})`;
            counter++;
        }

        return newFolderName;
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const relativePath = req.params[0] || "";
        const fullPath = path.join(__dirname, "../../data", relativePath);
        cb(null, fullPath);
    },
    filename: (req, file, cb) => {
        let originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const relativePath = req.params[0] || "";
        const fileName = util.getUniqueFilename(originalName, path.join(__dirname, "../../data", relativePath));
        cb(null, fileName);
    }
});
const upload = multer({ storage: storage }).single("file");

/**
 * @description Renders the main page with navigation and links provided by NavConstants.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const output = {
    main: (req, res) => {
        res.render("index", NavConstants.get(['navs', 'buttons', 'links']));
    }
}

/**
 * @description Reads the contents of a directory and renders a file listing page.
 * If the directory does not exist or cannot be accessed, an error page is shown.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const database = {
    read: (req, res) => {
        const relativePath = req.params[0] || "";
        const fullPath = path.join(__dirname, "../../data", relativePath);

        let backto = "";
        if (relativePath === "") { backto = "/read/"; }
        else {
            const splitPath = relativePath.split('/'); splitPath.pop();
            backto = "/read/" + splitPath.join('/');
        }

        fs.stat(fullPath, (err, stats) => {
            if (err || !stats.isDirectory()) {
                return res.render("show_err", { error: "The directory does not exist or cannot be accessed." });
            }

            fs.readdir(fullPath, (err, files) => {
                if (err) {
                    return res.render("show_err", { error: "Unable to read the directory contents." });
                }

                const fileList = files
                .filter(file => !file.startsWith('.'))
                .map(file => {
                    const filePath = path.join(fullPath, file);
                    const urlPath = relativePath === '' ? `${file}` : `${relativePath}/${file}`;
                    const isDirectory = fs.statSync(filePath).isDirectory();
                    const ext = isDirectory ? '' : path.extname(file);

                    return {
                        name: file,
                        ext:  (ext.length > 1) ? ext.substr(1) : '',
                        type: isDirectory ? 'folder' : 'file',
                        goto: isDirectory ? `/read/${urlPath}` : `/download/${urlPath}`
                    };
                });

                res.render("show", {
                    files: fileList,
                    path: relativePath,
                    backto: backto,
                    is_admin: 1,
                    navs: NavConstants.get('navs'),
                });
            });
        });
    },
};

/**
 * @description Handles zip file downloads and refreshes the ZipFileSys.
 * The `zip` method serves a zip file to the client, while `refresh` updates the file system.
 */
const zipsys = {
    // Download zip file of params[0].zip
    zip: (req, res) => {
        const relativePath = req.params[0] || "";
        const zipFilePath = path.join(__dirname, '../../zip', `${relativePath}.zip`);

        fs.stat(zipFilePath, (err, stats) => {
            if (err || !stats.isFile()) { return res.status(404).send("Zip file not found."); }
            res.download(zipFilePath, (err) => {
                if (err) { return res.status(500).send("Error downloading the zip file."); }
            });
        });
    },
    // Refresh zip file system
    refresh: (folderPath) => {
        setImmediate(() => { ZipFileSys.refresh(folderPath) });
    }
}

/**
 * @description Manages file system operations, including downloading, uploading, creating, and deleting files or folders.
 * - `download`: Serves a file to the client for download.
 * - `upload`: Uploads a new file to a specific folder and refreshes the zip system.
 * - `create`: Creates a new folder within a specified directory.
 * - `delete`: Deletes a specified file or folder.
 */
const filesys = {
    // Download params[0]
    download: (req, res) => {
        const relativePath = req.params[0] || "";
        const fullPath = path.join(__dirname, "../../data", relativePath);

        fs.stat(fullPath, (err, stats) => {
            if (err || !stats.isFile()) { return res.status(404).send("File not found."); }
            res.download(fullPath, err => {
                if (err) { return res.status(500).send("Error downloading the file."); }
            });
        });
    },
    // Upload file to params[0]
    upload: (req, res) => {
        upload(req, res, (err) => {
            if (err) { return res.status(500).send("Error uploading the file."); }
            zipsys.refresh(path.join(__dirname, "../../data", req.params[0] || ""))
            res.redirect(`/read/${req.params[0] || ""}`);
        });
    },
    // Create new folder at params[0]/body.name (POST)
    create: (req, res) => {
        const relativePath = req.params[0] || "";
        let folderName = req.body.name.trim();
        if (!folderName) { return res.status(400).send("Invalid folder name."); }
        folderName = util.getUniqueFolderName(folderName, path.join(__dirname, "../../data", relativePath));

        const fullPath = path.join(__dirname, "../../data", relativePath, folderName);
        fs.mkdir(fullPath, { recursive: true }, err => {
            if (err) { return res.status(500).send("Error creating folder."); }
            zipsys.refresh(fullPath);
            res.redirect(`/read/${relativePath}`);
        });
    },
    // Delete file or folder at params[0]/body.name (POST)
    delete: (req, res) => {
        const relativePath = req.params[0] || "";
        const itemName = req.body.name;
        const fullPath = path.join(__dirname, "../../data", relativePath, itemName);

        fs.stat(fullPath, (err, stats) => {
            if (err) { return res.status(404).send("File or folder not found."); }
            if (stats.isDirectory()) { 
                fs.rmdir(fullPath, { recursive: true }, (err) => {
                    if (err) { return res.status(500).send("Error deleting folder."); }
                    zipsys.refresh(path.join(__dirname, "../../data", relativePath))
                    res.send("Folder deleted successfully.");
                });
            }
            else {
                fs.unlink(fullPath, (err) => {
                    if (err) { return res.status(500).send("Error deleting file."); }
                    zipsys.refresh(path.join(__dirname, "../../data", relativePath));
                    res.send("File deleted successfully.");
                });
            }
        });
    }
};

module.exports = {
    output,
    database,
    zipsys,
    filesys
};