"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//there is an issue with typescript not realizing that 'Twitter' here is a class,
//so there are some @ts-ignore lines in here to suppress the incorrect warnings
const Twitter = require("twitter-lite");
const TwitterFollowerDB_1 = require("./TwitterFollowerDB");
var PermissionLevel;
(function (PermissionLevel) {
    PermissionLevel[PermissionLevel["Read"] = 0] = "Read";
    PermissionLevel[PermissionLevel["ReadWrite"] = 1] = "ReadWrite";
    PermissionLevel[PermissionLevel["ReadWriteDirectMessages"] = 2] = "ReadWriteDirectMessages";
})(PermissionLevel = exports.PermissionLevel || (exports.PermissionLevel = {}));
class TwitterUser {
    constructor() {
        this.permissionLevel = PermissionLevel.Read;
        //their twitter handle ('screen_name' in twitter api) gets filled in after a successful
        //call to Init().
        this.screen_name = null;
        this.id_str = null;
    }
    async Init(app_auth, user_auth) {
        try {
            //not sure why theres an issue with the twitter-lite typescript definitions issuing a false warning here
            //@ts-ignore
            this.twitterApi = new Twitter({
                subdomain: "api",
                version: "1.1",
                consumer_key: app_auth.consumer_key,
                consumer_secret: app_auth.consumer_secret,
                access_token_key: user_auth.access_token_key,
                access_token_secret: user_auth.access_token_secret // from your User (oauth_token_secret)
            });
            //verify that the app_auth and user_auth info is useable
            var results = await this.twitterApi.get("account/verify_credentials");
            //examine headers to determine app permissions
            let x_access_level = results._headers.get('x-access-level');
            switch (x_access_level) {
                case 'read':
                    this.permissionLevel = PermissionLevel.Read;
                    break;
                case 'read-write':
                    this.permissionLevel = PermissionLevel.ReadWrite;
                    break;
                case 'read-write-directmessages':
                    this.permissionLevel = PermissionLevel.ReadWriteDirectMessages;
                    break;
                default:
                    console.log(`Unrecognized x-access-level: ${x_access_level}, can't continue`);
                    return false;
                    break;
            }
            //store some info that will be helpful as we proceed..
            this.screen_name = results.screen_name;
            this.id_str = results.id_str;
            this.followerCache = new TwitterFollowerDB_1.TwitterFollowerCacheSQL();
            let cacheOK = await this.followerCache.Init(this.twitterApi, this.screen_name);
            return cacheOK;
        }
        catch (err) {
            console.error(err);
            return false;
        }
    }
    GetPermissionLevel() { return this.permissionLevel; }
    GetScreenName() {
        if (!this.screen_name)
            console.log("TwitterUser.GetScreenName - this.screen_name not defined, Init() must succeed first");
        return this.screen_name;
    }
    GetIdStr() {
        if (!this.id_str)
            console.log("TwitterUser.GetIdStr - this.id_str not defined, Init() must succeed first");
        return this.id_str;
    }
    GetFollowerCache() {
        return this.followerCache;
    }
    //@ts-ignore
    GetTwitterApi() {
        return this.twitterApi;
    }
}
exports.TwitterUser = TwitterUser;
//# sourceMappingURL=TwitterUser.js.map