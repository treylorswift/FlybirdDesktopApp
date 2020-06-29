"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
//make sure the app auth that came from storage contains the appropriate keys and that they are at least non-empty strings
function TypeCheckAppAuth(app_auth) {
    if (!app_auth.consumer_key || !app_auth.consumer_secret ||
        typeof (app_auth.consumer_key) !== 'string' ||
        typeof (app_auth.consumer_secret) !== 'string') {
        return false;
    }
    return true;
}
//will silently return null if unable to open and successfully type-check app auth key file
function TryLoadAppAuth(fileName) {
    let app_auth;
    try {
        app_auth = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    }
    catch (err) {
        return null;
    }
    if (TypeCheckAppAuth(app_auth))
        return app_auth;
    return null;
}
exports.TryLoadAppAuth = TryLoadAppAuth;
//will loudly report errors if unable to open or successfully type-check app auth key file, AND process.exit(-1)
function LoadAppAuth(fileName) {
    let app_auth;
    try {
        app_auth = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    }
    catch (err) {
        console.log(`Error reading ${fileName}:`);
        console.error(err);
        process.exit(-1);
    }
    if (TypeCheckAppAuth(app_auth))
        return app_auth;
    console.log(`${fileName} has invalid or missing consumer_key and/or consumer_secret: ${JSON.stringify(app_auth)}`);
    process.exit(-1);
}
exports.LoadAppAuth = LoadAppAuth;
//make sure the app auth that came from storage contains the appropriate keys and that they are at least non-empty strings
function TypeCheckUserLogin(user_login) {
    if (!user_login.access_token_key || !user_login.access_token_secret ||
        !user_login.id_str || !user_login.screen_name ||
        typeof (user_login.access_token_key) !== 'string' ||
        typeof (user_login.access_token_secret) !== 'string' ||
        typeof (user_login.id_str) !== 'string' ||
        typeof (user_login.screen_name) !== 'string') {
        return false;
    }
    return true;
}
//will silently return null if unable to open and successfully type-check user auth key file
function TryLoadUserLogin(fileName) {
    let user_auth;
    try {
        user_auth = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    }
    catch (err) {
        return null;
    }
    if (TypeCheckUserLogin(user_auth))
        return user_auth;
    return null;
}
exports.TryLoadUserLogin = TryLoadUserLogin;
//will loudly report errors if unable to open or successfully type-check app auth key file, AND process.exit(-1)
function LoadUserLogin(fileName) {
    let user_login;
    try {
        user_login = JSON.parse(fs.readFileSync(fileName, 'utf-8'));
    }
    catch (err) {
        console.log(`Error reading ${fileName}:`);
        console.error(err);
        process.exit(-1);
    }
    if (TypeCheckUserLogin(user_login))
        return user_login;
    console.log(`${fileName} has invalid or missing access_token_key and/or access_token_secret: ${JSON.stringify(user_login)}`);
    process.exit(-1);
}
exports.LoadUserLogin = LoadUserLogin;
//# sourceMappingURL=TwitterAuth.js.map