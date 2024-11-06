// UserManage.js

const fs = require('fs');
const path = require('path');

const userFilePath = path.join(__dirname, '../../filedb/userList.json');

const msg_doesnot_regist    = '가입하지 않은 이메일입니다'
const msg_invalid_email     = '@snu.ac.kr 이메일이 아닙니다.'
const msg_already_regist    = '이미 가입된 이메일입니다.'

class UserManage {
    // Load user data from user.json
    static loadUserData() {
        try {
            const data = fs.readFileSync(userFilePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            console.error('Error reading user.json:', err);
            return [];
        }
    }

    // Save updated user data to user.json
    static saveUserData(users) {
        try {
            fs.writeFileSync(userFilePath, JSON.stringify(users, null, 2), 'utf8');
        } catch (err) {
            console.error('Error writing to user.json:', err);
        }
    }

    /**
     * login: Logs in the user using Google OAuth.
     * If the email exists in user.json, the login is approved.
     * @param {string} email - The email of the user trying to log in.
     * @returns {Object} - Contains login result and user information.
     */
    static login(email) {
        const users = UserManage.loadUserData();
        const user = users.find(user => user.email === email);
        if (user) { return { success: true, class: user.class, email: user.email }; }
        else { return { success: false, message: msg_doesnot_regist }; }
    }

    /**
     * register: Registers a new user using Google OAuth.
     * The email must end with "snu.ac.kr" to proceed.
     * Only the email is registered, class is set to 5 by default.
     * @param {string} email - The email of the user trying to register.
     * @returns {Object} - Contains registration result and user information.
     */
    static register(email) {
        if (!email.endsWith('@snu.ac.kr')) { return { success: false, message: msg_invalid_email }; }
        const users = UserManage.loadUserData();
        if (users.find(user => user.email === email)) { return { success: false, message: msg_already_regist }; }

        // Register new user
        const newUser = { email: email, phone: '', number: '', class: 5 };
        users.push(newUser);
        UserManage.saveUserData(users);

        return { success: true, class: newUser.class, email: newUser.email };
    }

    /**
     * elevate: Elevates a user's class from 5 to 4.
     * Adds the phone and number fields to the user.
     * @param {string} email - The email of the user to elevate.
     * @param {string} phone - The phone number of the user.
     * @param {string} number - The number of the user (e.g., student ID).
     * @returns {boolean} - True if elevation is successful, otherwise false.
     */
    static elevate(email, phone, number, auth=4) {
        const users = UserManage.loadUserData();
        const user = users.find(user => user.email === email);
        if (!user) { return false; }

        // Elevate user
        user.class = auth;
        user.phone = phone;
        user.number = number;
        UserManage.saveUserData(users);
        return true;
    }

    /**
     * create: Tries to login if the user exists, otherwise registers the user.
     * @param {string} email - The email of the user to create or log in.
     * @returns {Object} - Contains result of login or registration.
     */
    static create(email) {
        const users = UserManage.loadUserData();
        const user = users.find(user => user.email === email);

        if (user) { return { success: true, class: user.class, email: user.email }; }
        else { return UserManage.register(email); }
    }
}

module.exports = UserManage;