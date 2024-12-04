"use strict";

require("dotenv").config()
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cookieParser = require('cookie-parser');

const ensureAuth = require('./src/middleware/ensureAuth');
const getUserIp = require('./src/middleware/getUserIp');

dotenv.config();

const app = express();
const home = require("./src/routes");

app.set("views", "./src/views");
app.set("view engine", "ejs");
app.set('trust proxy', true); // trust proxy. for middleware/getUserIp.js

app.use(express.static(`${__dirname}/src/public`));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(ensureAuth);
app.use(getUserIp);
app.use("/", home);

module.exports = app;
