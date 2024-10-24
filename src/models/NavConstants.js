// NavConstants.js

const fs = require('fs');
const path = require('path');

const navConstantFilePath = path.join(__dirname, '../../config/navConstant.json');

class NavConstants {
    // Static variable to store cached data
    static cachedData = null;

    /**
     * get: Returns an object using the list of strings as keys.
     * If data is already loaded, it returns the cached data.
     * If no data is cached, it reads from the navConstant.json file.
     * @param {Array} keys - List of strings representing the keys to retrieve.
     * @returns {Object} - Object with key-value pairs from the cached data.
     */
    static get(keys = []) {
        // Check if data is cached
        if (!NavConstants.cachedData) {
            try {
                const data = fs.readFileSync(navConstantFilePath, 'utf8');
                NavConstants.cachedData = JSON.parse(data);
            } catch (err) {
                console.error('Error reading navConstant.json:', err);
                return {};
            }
        }

        // If the input is a single string, return the value for that key
        if (typeof keys === 'string') {
            return NavConstants.cachedData[keys] !== undefined ? NavConstants.cachedData[keys] : null;
        }

        // If the input is an array of keys, return an object with the requested key-value pairs
        const result = {};
        keys.forEach(key => {
            if (NavConstants.cachedData[key] !== undefined) { result[key] = NavConstants.cachedData[key]; } });
        return result;
    }

    /**
     * refresh: Forces reading data from the navConstant.json file
     * and refreshes the cached data, regardless of whether the data
     * is already cached or not.
     */
    static refresh() {
        try {
            const data = fs.readFileSync(navConstantFilePath, 'utf8');
            NavConstants.cachedData = JSON.parse(data);
        } catch (err) {
            console.error('Error reading navConstant.json:', err);
            NavConstants.cachedData = null; // Clear the cache if there's an error
        }
    }
}

module.exports = NavConstants;