import * as RPC from './RPC';
import * as TwitterAuth from './TwitterAuth';

///////////////
//Server Api
//(calls the client can make to the server)
//////////////

//////////////////////
//Get App Auth keys
/////////////////////

//returns whatever Twitter app API keys were last used to log a user in.
//they are saved to disk after the first successful login and persist across app launches

export async function GetAppAuth():Promise<GetAppAuthResponse>
{
    return new GetAppAuthCall().Call() as Promise<GetAppAuthResponse>;
}

export class GetAppAuthCall extends RPC.Call
{
    method = "GetAppAuth"
}

export class GetAppAuthResponse extends RPC.Response
{
    appAuth:TwitterAuth.AppAuth;
}

//////////////////////
//Get User login
/////////////////////

//returns info for the currently logged in user
export async function GetUserLogin():Promise<GetUserLoginResponse>
{
    return new GetUserLoginCall().Call() as Promise<GetUserLoginResponse>;
}

export class GetUserLoginCall extends RPC.Call
{
    method = "GetUserLogin"
}

export class GetUserLoginResponse extends RPC.Response
{
    userLogin:TwitterAuth.UserLogin;
}

//to initiate login from the user-facing UI, that request must include the Twitter app API keys.
//they are either typed in by the user, or (if they were typed and saved previously)
//loaded from disk when the app starts. presumably the UI has called GetAppAuth to obtain those
//stored api keys prior to calling this. Or, the user has typed them in manually
export async function Login(args:LoginCall["args"]):Promise<LoginResponse>
{
    return new LoginCall(args).Call() as Promise<LoginResponse>;
}

export class LoginCall extends RPC.Call
{
    method = "Login"

    constructor(args:LoginCall["args"])
    {
        super();
        this.args = args;
    }

    args: {
        //the Twitter app api keys
        appAuth:TwitterAuth.AppAuth,

        //if true, successful user login will store user api keys on disk and reload them later
        //if false, user login will not persist and login will have to be done again next time
        //the application is started
        //should correspond to a "Remember Me" checkbox next to the login button
        saveUserAuth:boolean 
    }
}

export class LoginResponse extends RPC.Response
{
    userLogin:TwitterAuth.UserLogin;
}

/////////////////////////
///Follower Cache Status
/////////////////////////
export async function GetFollowerCacheStatus():Promise<GetFollowerCacheStatusResponse>
{
    return new GetFollowerCacheStatusCall().Call() as Promise<GetFollowerCacheStatusResponse>;
}

export class GetFollowerCacheStatusCall extends RPC.Call
{
    method = "GetFollowerCacheStatus"
}

export enum FollowerCacheStatusEnum
{
    None="None", //no cache exists, nothing is being processed right now
    Incomplete="Incomplete", //some cache exists but it was not completed, and is not processing right now
    InProgress="InProgress", //a caching operation is in progress now, but not yet completed
    Complete="Complete" //a cache exists and no operation is being performed right now
}

export class GetFollowerCacheStatusResponse extends RPC.Response
{
    status:FollowerCacheStatusEnum

    //if status===None, will be 0
    //if status===Partial, will be somewhere between 0-99
    //if status==Complete, will be 100
    completionPercent:number

    totalStoredFollowers:number
}

/////////////////////////////////////////
//BuildCache
//////////////////////////

export async function BuildFollowerCache(command:BuildFollowerCacheCommands):Promise<RPC.Response>
{
    return new BuildFollowerCacheCall({command:command}).Call();
}

export class BuildFollowerCacheCall extends RPC.Call
{
    method = "BuildFollowerCache"

    constructor(args:BuildFollowerCacheCall["args"])
    {
        super();
        this.args = args;
    }

    args: {
        command:BuildFollowerCacheCommands,
    }
}

export enum BuildFollowerCacheCommands
{
    Rebuild,
    Resume
}

/////////////////////////////////////////
//Query Follower Cache
//////////////////////////
export type FollowerCacheQuery =
{
    campaignId:string
    tags:Array<string>
    sort:MessagingCampaignSortType
    offset:number
    limit:number
    includeContacted:boolean
    useDryRunMessageHistory:boolean
}

export async function QueryFollowerCache(q:FollowerCacheQuery):Promise<QueryFollowerCacheResponse>
{
    return new QueryFollowerCacheCall({query:q}).Call() as Promise<QueryFollowerCacheResponse>;
}

export class QueryFollowerCacheCall extends RPC.Call
{
    method = "QueryFollowerCache"

    constructor(args:QueryFollowerCacheCall["args"])
    {
        super();
        this.args = args;
    }

    args: {
        query:FollowerCacheQuery,
    }
}

export type FollowerCacheQueryResult = 
{
    idStr:string
    screenName:string
    name:string
    description:string
    age:number
    contactDate:number //this is a millisecond value that can be passed to new Date(contactDate) - if null, they have not been contacted
    followersCount:number
    profileImageUrl:string
}

export class QueryFollowerCacheResponse extends RPC.Response
{
    followers:Array<FollowerCacheQueryResult>
}

/////////////////////////////////////////
//Run Messaging Campaign
//////////////////////////

export type MessagingCampaignSortType = "influence" | "recent"
export type MessagingCampaignSchedulingType = "burst" | "spread"

export type MessagingCampaign =
{
    message:string
    campaign_id:string
    sort:MessagingCampaignSortType
    scheduling:MessagingCampaignSchedulingType
    dryRun:boolean
    count?:number
    filter?:
    {
        tags?:Array<string>
    }
}

export async function RunMessagingCampaign(c:MessagingCampaign):Promise<RPC.Response>
{
    return new RunMessagingCampaignCall({campaign:c}).Call() as Promise<RPC.Response>;
}

export class RunMessagingCampaignCall extends RPC.Call
{
    method = "RunMessagingCampaign"

    constructor(args:RunMessagingCampaignCall["args"])
    {
        super();
        this.args = args;
    }

    args: {
        campaign:MessagingCampaign
    }
}

