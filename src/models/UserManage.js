const fs = require('fs');
const path = require('path');

const userFilePath = path.join(__dirname, '../../data/.secret/user.json');

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
     * @returns {boolean} - True if login is approved, otherwise false.
     */
    static login(email) {
        const users = UserManage.loadUserData();
        const user = users.find(user => user.email === email);
        return !!user;
    }

    /**
     * register: Registers a new user using Google OAuth.
     * The email must end with "snu.ac.kr" to proceed.
     * Only the email is registered, class is set to 5 by default.
     * @param {string} email - The email of the user trying to register.
     * @returns {boolean} - True if registration is successful, otherwise false.
     */
    static register(email) {
        if (!email.endsWith('@snu.ac.kr')) { return false; }
        const users = UserManage.loadUserData();
        if (users.find(user => user.email === email)) { return false; }

        // Register new user
        const newUser = { email: email, phone: '', number: '', class: 5 };
        users.push(newUser);
        UserManage.saveUserData(users);
        return true;
    }

    /**
     * elevate: Elevates a user's class from 5 to 4.
     * Adds the phone and number fields to the user.
     * @param {string} email - The email of the user to elevate.
     * @param {string} phone - The phone number of the user.
     * @param {string} number - The number of the user (e.g., student ID).
     * @returns {boolean} - True if elevation is successful, otherwise false.
     */
    static elevate(email, phone, number) {
        const users = Auth.loadUserData();
        const user = users.find(user => user.email === email);
        if (!user) { return false; }

        // Elevate user
        user.class = 4;
        user.phone = phone;
        user.number = number;
        UserManage.saveUserData(users);

        return true; // Elevation successful
    }
}

module.exports = UserManage;