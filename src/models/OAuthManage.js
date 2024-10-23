// oauth.js

const { google } = require('googleapis');

class OAuth {
    static oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.BASE_URL}/login/google/callback`
    );

    static getAuthUrl() {
        const scopes = ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'];
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes
        });
    }

    static async getUserInfo(code) {
        try {
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            const oauth2 = google.oauth2({
                auth: this.oauth2Client,
                version: 'v2'
            });

            const userInfo = await oauth2.userinfo.get();
            return userInfo.data;
        } catch (error) {
            console.error('Error retrieving access token', error);
            throw error;
        }
    }
}

module.exports = OAuth;