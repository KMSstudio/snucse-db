"use strict";

const path = require("path");
const fs = require("fs");
const multer = require("multer");

const OAuth = require("../models/OAuthManage");
const UserManage = require("../models/UserManage");     // admin.elevate
const UserElevate = require("../models/UserElevate");   // usersys.elevateSubmit admin.elevate
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
        res.render("index", {
            user: (req.user == null) ? null : req.user.email,
            is_admin: (req.user == null) ? 0 : req.user.class <= 2,
            ...NavConstants.get(['navs', 'buttons', 'links'])
        });
    },
    login: (req, res) => {
        res.render("login", {
            user: null,
            navs: NavConstants.get('navs')
        });
    },

    elevate: (req, res) => {
        res.render("elevate", {
            user: req.user?.email,
            navs: NavConstants.get('navs')
        })
    },
    elevateSubmit: (req, res)=> {
        if (!req.user) { 
            res.cookie('afterLogin', req.url);
            res.redirect('/login');
        }
        res.render("elevate-submit", {
            user: req.user?.email,
            navs: NavConstants.get('navs')
        });
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
            return res.render("login", {
                user: null,
                navs: NavConstants.get('navs')
            });
        }

        const relativePath = req.params[0] || "";
        let backto = "";
        if (relativePath !== "") {
            const splitPath = relativePath.split('/').filter(Boolean);
            splitPath.pop();
            backto = splitPath.join('/');
            if (backto) { backto += '/'; }
        }

        try {
            const fileList = await AwsFileSys.readFiles(relativePath);
            const files = AwsFileSys.refineFiles(fileList, relativePath);
            const is_admin = req.user.class <= 2;
            const is_member = req.user.class <= 4;

            res.render("show", {
                files: files,
                path: relativePath,
                backto: `/read/${backto}`,
                is_admin: is_admin,
                is_member: is_member,
                user: req.user.email,
                navs: NavConstants.get('navs')
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
    },

    elevateSubmit: async (req, res) => {
        const user = req.user;
        if (user.class <= 4) { return res.redirect('/'); }
        const { phone, number } = req.body;
        try {
            await UserElevate.submit(user.email, phone, number);
            return res.redirect('/');
        } catch (error) {
            console.error('Submit failed:', error);
            return res.redirect('/'); ///////////////////////////////////////////////////
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
            const fileName = relativePath.split('/').pop(); // 파일 이름 추출
            const encodedFileName = encodeURIComponent(fileName); // 파일 이름을 인코딩

            res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"`); // 인코딩된 파일 이름 사용
            res.send(data.Body);
        } catch (err) {
            console.log(res);
            res.status(404).send("File not found.");
        }
    },

    upload: (req, res) => {
        // Upload file to multer.storage temporary
        upload(req, res, async (err) => {
            if (err) { return res.status(500).send("Error uploading the file."); }
            const relativePath = req.params[0] || "";
            try {
                await AwsFileSys.uploadFiles(relativePath, req.files);
                res.redirect(`/read/${relativePath}`);
            } catch (error) {
                console.log(error);
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
        if (req.user.class > 3) { 
            return res.status(500).send("You don't have previlige to delete file");
        }

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

const admin = {
    main: (req, res) => {
        if (!req.user) { 
            res.cookie('afterLogin', req.url);
            return res.redirect('/login'); }
        if (req.user.class > 2) { return res.redirect('/'); }
        try {
            const userList = JSON.parse(fs.readFileSync(path.join(__dirname, '../../filedb/userList.json'), 'utf-8'));
            const userElevate = JSON.parse(fs.readFileSync(path.join(__dirname, '../../filedb/userElevate.json'), 'utf-8'));
            res.render('admin', { userList, userElevate, navs: NavConstants.get('navs'), user: req.user?.email });
        } catch (error) {
            console.error("Error reading JSON files:", error);
            res.status(500).send("Error loading admin data");
        }
    },

    download: (req, res) => {
        const fileMap = {
            'userList': path.join(__dirname, '../../filedb/userList.json'),
            'userElevate': path.join(__dirname, '../../filedb/userElevate.json'),
            'navConstant': path.join(__dirname, '../../filedb/navConstant.json')
        };
        const fileKey = req.params.file;
        const filePath = fileMap[fileKey];
        if (filePath) {
            res.download(filePath, err => {
                if (err) { 
                    console.error("File download error:", err); 
                    res.status(500).send("File download failed"); }
            });
        }
        else { res.status(404).send("File not found"); }
    },

    elevate: (req, res) => {
        const email = req.query.email;
        const elevateUser = UserElevate.get().find(user => user.email === email);
        if (!elevateUser) { return res.status(404).send("User not found in userElecate.json"); }
        const { phone, number } = elevateUser;
        const success = UserManage.elevate(email, phone, number, 4);
        if (success) { UserElevate.del('email', email); res.send("Elevate success"); }
        else { res.status(500).send("Failed to elevate user class."); }
    }
}

module.exports = {
    output,
    database,
    usersys,
    zipsys,
    filesys,
    admin,
};