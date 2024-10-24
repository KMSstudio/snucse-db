"use strict";

const path = require("path");
const fs = require("fs");
const multer = require("multer");

const OAuth = require("../models/OAuthManage");
const UserManage = require("../models/UserManage");
const JwtManage = require("../models/JwtManage");

const AwsFileSys = require('../models/AwsFileSys');
const ZipFileSys = require("../models/ZipFileSys");
const NavConstants = require("../models/NavConstants");

const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, true);
    }
}).array('files', 10);

/**
 * @description Renders the main page with navigation and links provided by NavConstants.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const output = {
    main: (req, res) => {
        res.render("index", NavConstants.get(['navs', 'buttons', 'links']));
    },
    login: (req, res) => {
        res.render("login", {navs: NavConstants.get('navs')});
    }
}

/**
 * @description Reads the contents of a directory and renders a file listing page.
 * If the directory does not exist or cannot be accessed, an error page is shown.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
const database = {
    read: async (req, res) => {
        if (!req.user) { 
            res.cookie('afterLogin', req.url);
            return res.render("login", {navs: NavConstants.get('navs')});
        }

        const relativePath = req.params[0] || "";
        let backto = "";

        if (relativePath === "") { 
            backto = "/read/"; 
        } else {
            const splitPath = relativePath.split('/'); 
            splitPath.pop();
            backto = "/read/" + splitPath.join('/');
        }

        try {
            const fileList = await AwsFileSys.readFiles(relativePath);
            const files = fileList.map(file => {
                const isDirectory = file.type === 'folder';
                const ext = isDirectory ? '' : path.extname(file.name);

                return {
                    name: file.name,
                    ext: (ext.length > 1) ? ext.substr(1) : '',
                    type: file.type,
                    goto: isDirectory ? `/read/${file.name}` : `/download/${file.name}`
                };
            });

            res.render("show", {
                files: files,
                path: relativePath,
                backto: backto,
                is_admin: 1,
                navs: NavConstants.get('navs'),
            });
        } catch (error) {
            console.log(error);
            res.render("show_err", { error: "Unable to read the directory contents from S3." });
        }
    },
};

const usersys = {
    request: (req, res) => {
        const authUrl = OAuth.getAuthUrl();
        res.redirect(authUrl);
    },

    callback: async (req, res) => {
        const code = req.query.code;
        if (!code) { res.redirect('/'); return; }
        try {
            const userInfo = await OAuth.getUserInfo(code);
            const user = UserManage.create(userInfo.email);
            if (!user.success) { res.redirect('/'); return; } ////////////////////////////////////////
            const token = JwtManage.create(user);

            res.cookie('token', token, { httpOnly: true, secure: true });
            const afterLogin = req.cookies?.afterLogin;
            if (afterLogin) { 
                res.clearCookie('afterLogin');
                res.redirect(req.cookies.afterLogin);
            }
            else { res.redirect('/'); }
        } catch (error) {
            console.error('Error retrieving access token', error);
            res.redirect('/'); ///////////////////////////////////////////////////
        }
    }
}

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
    download: async (req, res) => {
        const relativePath = req.params[0] || "";
        try {
            const data = await AwsFileSys.downloadFile(relativePath);
            res.setHeader('Content-Disposition', `attachment; filename="${relativePath.split('/').pop()}"`);
            res.send(data.Body);
        } catch (err) {
            res.status(404).send("File not found.");
        }
    },

    upload: (req, res) => {
        // Upload file to multer.storage temporary
        upload(req, res, async (err) => {
            if (err) { return res.status(500).send("Error uploading the file."); }
            const relativePath = req.params[0] || "";
            try {
                await FileSys.uploadFiles(relativePath, req.files);
                res.redirect(`/read/${relativePath}`);
            } catch (error) {
                res.status(500).send("Error uploading the files to S3.");
            }
        });
    },

    create: async (req, res) => {
        const relativePath = req.params[0] || "";
        const folderName = req.body.name.trim();
        if (!folderName) { return res.status(400).send("Invalid folder name."); }
        try {
            await AwsFileSys.createFolder(relativePath, folderName);
            res.redirect(`/read/${relativePath}`);
        } catch (error) {
            console.log(error);
            res.status(500).send("Error creating folder.");
        }
    },

    delete: async (req, res) => {
        const relativePath = req.params[0] || "";
        const itemName = req.body.name;
        try {
            await AwsFileSys.deleteItem(relativePath, itemName);
            res.redirect(`/read/${relativePath}`);
        } catch (error) {
            res.status(500).send("Error deleting item.");
        }
    }
};

module.exports = {
    output,
    database,
    usersys,
    zipsys,
    filesys
};