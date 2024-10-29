const fs = require('fs');
const path = require('path');

class ElevateManage {
    static userFilePath = path.join(__dirname, '../../filedb/userElevate.json');
    static cachedUsers = null;

    /**
     * Loads user data from the JSON file into the cache.
     * This function reads the `userManage.json` file only if `cachedUsers` is null, 
     * ensuring the file is not repeatedly read during the runtime.
     * If the file doesn't exist or encounters an error, `cachedUsers` is initialized as an empty array.
     */
    static loadUserData() {
        if (!this.cachedUsers) {
            try {
                const data = fs.readFileSync(this.userFilePath, 'utf-8');
                this.cachedUsers = JSON.parse(data);
            } catch (error) { this.cachedUsers = []; }
        }
    }

    /**
     * Adds a new user entry to `userManage.json`.
     * This function accepts an email, phone number, and unique identifier for the user,
     * and appends this information to the `userManage.json` file for temporary storage.
     * The data is also cached within the class to reduce file I/O operations.
     * 
     * @param {string} email - The email address of the user.
     * @param {string} phone - The phone number of the user.
     * @param {string} number - The unique identifier or number associated with the user.
     */
    static submit(email, phone, number) {
        this.loadUserData();
        const newUser = { email, phone, number };
        this.cachedUsers.push(newUser);
        fs.writeFileSync(this.userFilePath, JSON.stringify(this.cachedUsers, null, 2));
    }

    /**
     * Retrieves all user data from `userManage.json`.
     * This function returns an array of user objects loaded from the cache.
     * If the cache is empty, it first loads the data from the JSON file.
     * 
     * @returns {Array<Object>} - A list of all user entries.
     */
    static get() {
        this.loadUserData();
        return this.cachedUsers;
    }

    /**
     * Deletes a user entry based on a specified key-value pair.
     * This function filters out the user from the cached list where the specified key matches the given value.
     * After removal, it updates `userManage.json` to reflect the change.
     * 
     * @param {string} key - The property name to match (e.g., 'email', 'phone').
     * @param {string} val - The value associated with the key to match for deletion.
     */
    static del(key, val) {
        this.loadUserData();
        this.cachedUsers = this.cachedUsers.filter(user => user[key] !== val);
        fs.writeFileSync(this.userFilePath, JSON.stringify(this.cachedUsers, null, 2));
    }
}

module.exports = ElevateManage;