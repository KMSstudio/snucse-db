"use strict";

const express = require("express");
const router = express.Router();
const multer = require("multer")

const ctrl = require("./home.ctrl");
const ensureAuth = require("../middleware/ensureAuth");

// Main
router.get("/", ensureAuth, ctrl.output.main);
// Read folder and render show.ejs
router.get("/read/*", ensureAuth, ctrl.database.read);

// Login
router.get("/login", ctrl.output.login);
router.get("/login/google", ctrl.usersys.request);
router.get("/login/google/callback", ctrl.usersys.callback);
router.get("/logout", (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
})

// Download zip file
router.get("/zip/*", ctrl.zipsys.zip);
router.post("/zip/*", ctrl.zipsys.zip);
// Delete file or folder
router.post("/delete/*", ensureAuth, ctrl.filesys.delete);
// Upload new file
router.get("/upload/*", (req, res) => {
    res.render("popup/upload", { path: req.params[0] }); });
router.post("/upload/*", ctrl.filesys.upload);
// Create new folder
router.get("/create/*", (req, res) => {
    res.render("popup/create", { path: req.params[0] }); })
router.post("/create/*", multer().none(), ctrl.filesys.create);

// File downlaod system
router.get("/download/*", ctrl.filesys.download);

module.exports = router;
