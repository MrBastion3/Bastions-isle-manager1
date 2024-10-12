const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

const ftpCredentialsPath = path.join(__dirname, '..', 'ftpCredentials.json');

async function connectFTP() {
    let client = new ftp.Client();
    try {
        if (!fs.existsSync(ftpCredentialsPath)) {
            throw new Error("FTP credentials not set.");
        }
        const { host, user, password, secure } = JSON.parse(fs.readFileSync(ftpCredentialsPath, 'utf8'));
        await client.access({ host, user, password, secure });
        return client;
    } catch (error) {
        client.close();
        throw error;
    }
}

async function downloadFile(remotePath, localPath) {
    let client = await connectFTP();
    try {
        await client.downloadTo(localPath, remotePath);
    } finally {
        client.close();
    }
}

async function uploadFile(localPath, remotePath) {
    let client = await connectFTP();
    try {
        await client.uploadFrom(localPath, remotePath);
    } finally {
        client.close();
    }
}

module.exports = { downloadFile, uploadFile };
