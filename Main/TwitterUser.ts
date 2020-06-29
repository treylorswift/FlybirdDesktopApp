import * as TwitterAuth from '../Shared/TwitterAuth'

//there is an issue with typescript not realizing that 'Twitter' here is a class,
//so there are some @ts-ignore lines in here to suppress the incorrect warnings
import * as Twitter from 'twitter-lite';
import {TwitterFollowerCacheBase, TwitterFollowerCacheSQL} from './TwitterFollowerDB'

export type TwitterFollower = 
{
    id_str:string
    screen_name:string
    bio_tags:Array<string>
    followers_count:number
}

export enum PermissionLevel
{
    Read,
    ReadWrite,
    ReadWriteDirectMessages
}

export class TwitterUser
{
    // @ts-ignore
    private twitterApi:Twitter;
    private permissionLevel:PermissionLevel = PermissionLevel.Read;
    private followerCache:TwitterFollowerCacheBase;

    //their twitter handle ('screen_name' in twitter api) gets filled in after a successful
    //call to Init().
    private screen_name:string = null;
    private id_str:string = null;

    constructor()
    {
    }


    async Init(app_auth:TwitterAuth.AppAuth, user_auth:TwitterAuth.UserLogin):Promise<boolean>
    {
        try
        {
            //not sure why theres an issue with the twitter-lite typescript definitions issuing a false warning here
            //@ts-ignore
            this.twitterApi = new Twitter({
              subdomain: "api", // "api" is the default (change for other subdomains)
              version: "1.1", // version "1.1" is the default (change for other subdomains)
              consumer_key: app_auth.consumer_key, // from Twitter.
              consumer_secret: app_auth.consumer_secret, // from Twitter.
              access_token_key: user_auth.access_token_key, // from your User (oauth_token)
              access_token_secret: user_auth.access_token_secret // from your User (oauth_token_secret)
            });

            //verify that the app_auth and user_auth info is useable
            var results = await this.twitterApi.get("account/verify_credentials")

            //examine headers to determine app permissions
            let x_access_level = results._headers.get('x-access-level');
            switch (x_access_level)
            {
                case 'read': this.permissionLevel = PermissionLevel.Read; break;
                case 'read-write': this.permissionLevel = PermissionLevel.ReadWrite; break;
                case 'read-write-directmessages': this.permissionLevel = PermissionLevel.ReadWriteDirectMessages; break;
                default:
                    console.log(`Unrecognized x-access-level: ${x_access_level}, can't continue`);
                    return false;
                    break;
            }

            //store some info that will be helpful as we proceed..
            this.screen_name = results.screen_name;
            this.id_str = results.id_str;

            this.followerCache = new TwitterFollowerCacheSQL();
            let cacheOK = await this.followerCache.Init(this.twitterApi, this.screen_name);
            return cacheOK;
        }
        catch (err)
        {
          console.error(err);
          return false;
        }
    }

    GetPermissionLevel():PermissionLevel { return this.permissionLevel; }

    GetScreenName():string
    {
        if (!this.screen_name)
            console.log("TwitterUser.GetScreenName - this.screen_name not defined, Init() must succeed first");
        
        return this.screen_name;
    }

    GetIdStr():string
    {
        if (!this.id_str)
            console.log("TwitterUser.GetIdStr - this.id_str not defined, Init() must succeed first");
        
        return this.id_str;
    }

    GetFollowerCache():TwitterFollowerCacheBase
    {
        return this.followerCache;
    }

    //@ts-ignore
    GetTwitterApi():Twitter
    {
        return this.twitterApi;
    }

}