// AwsFileSys.js

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION,
});

const bucketName = process.env.AWS_BUCKET_NAME;

class AwsFileSys {
    static createFolder(relativePath, folderName) {
        let s3Key = path.join(relativePath, folderName, '/').replace(/\\/g, '/');

        const params = {
            Bucket: bucketName,
            Key: s3Key,
            Body: '',
        };

        return s3.putObject(params).promise();
    }

    static async readFiles(relativePath) {
        const params = {
            Bucket: bucketName,
            Prefix: relativePath === '/' ? '' : relativePath,
            Delimiter: '/',
        };
    
        try {
            const data = await s3.listObjectsV2(params).promise();
            // Classify folder and file
            const folders = data.CommonPrefixes.map(prefix => ({
                name: prefix.Prefix.replace(relativePath, ''),
                type: 'folder',
            }));
            const files = data.Contents.map(file => ({
                name: file.Key.replace(relativePath, ''),
                type: 'file',
            }));
            return [...folders, ...files].filter(item => item.name !== '');
        }
        catch (error) { throw new Error(`Error reading path: ${error.message}`); }
    }
    
    static async uploadFile(relativePath, file) {
        // UTF-8 encoding
        const originalName = Buffer.from(file.originalname, 'utf8').toString();
        const s3Key = `${relativePath}${originalName}`;
        
        const params = {
            Bucket: bucketName,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
        };
    
        try { const data = await s3.upload(params).promise(); return data; }
        catch (error) { throw new Error(`Error uploading file to S3: ${error.message}`); }
    }

    static async uploadFiles(relativePath, files) {
        const uploadPromises = files.map(file => 
            this.uploadFile(relativePath, file)
        );
    
        try { const data = await Promise.all(uploadPromises); return data; }
        catch (error) { throw new Error(`Error uploading files to S3: ${error.message}`); }
    }

    static async downloadFile(s3Key) {
        const params = { Bucket: bucketName, Key: s3Key, };
        return s3.getObject(params).promise();
    }

    static async deleteItem(relativePath, itemName) {
        const s3Key = path.join(relativePath, itemName).replace(/\\/g, '/');

        const params = {
        Bucket: bucketName,
        Key: s3Key,
        };

        const headData = await s3.headObject(params).promise();
        if (headData.ContentLength === 0) {
            const listParams = {
                Bucket: bucketName,
                Prefix: s3Key,
            };
            const listData = await s3.listObjectsV2(listParams).promise();
            const deleteParams = {
                Bucket: bucketName,
                Delete: {
                    Objects: listData.Contents.map((item) => ({ Key: item.Key })),
                },
            };
            return s3.deleteObjects(deleteParams).promise();
        }
        else { return s3.deleteObject(params).promise(); }
    }
}

module.exports = AwsFileSys;