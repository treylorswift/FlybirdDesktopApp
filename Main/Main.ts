import * as fs from 'fs';
import * as Twitter from 'twitter-lite'
import {TwitterUser} from './TwitterUser'
import {MessagingCampaignManager,MessagingCampaign} from './MessagingCampaign'
import * as ClientApi from '../Shared/ClientApi'
import {ElectronIPC} from '../Shared/ElectronIPC';
import * as ServerApi from '../Shared/ServerApi'
import * as TwitterAuth from '../Shared/TwitterAuth'
import * as RPC from '../Shared/RPC';

//once we obtain app auth and user auth keys, we won't require login
let g_appAuth:TwitterAuth.AppAuth = null;
let g_userLogin:TwitterAuth.UserLogin = null;
let g_twitterUser:TwitterUser = null;

let g_appAuthFileName = './app_auth.json';
let g_userLoginFileName = './user_auth.json';

async function ValidateAppAndUserAuth():Promise<boolean>
{
    let app_auth = TwitterAuth.TryLoadAppAuth(g_appAuthFileName);
    if (!app_auth)
        return false;

    try
    {
        //@ts-ignore
        let testClient = new Twitter({
            consumer_key: app_auth.consumer_key, // from Twitter.
            consumer_secret: app_auth.consumer_secret, // from Twitter.
        });

        const bearerOK = await testClient.getBearerToken();

        //no error means the keys were valid, store them to the global
        //and proceed to check user auth keys
        g_appAuth = app_auth;
    }
    catch (err)
    {
        console.log("Error validating stored app auth keys:");
        console.error(err);
        return false;
    }

    let user_login = TwitterAuth.TryLoadUserLogin(g_userLoginFileName);
    if (!user_login)
        return false;
    
    //ok see if we can create a TwitterUser using the app and user keys
    let user = new TwitterUser();
    let initOK = await user.Init(app_auth,user_login);
    if (initOK)
    {
        g_userLogin = user_login;
        g_twitterUser = user;
        return true;
    }

    return false;
}





//////////////////
//Electron stuff
/////////////
// Modules to control application life and create native browser window
import {app as electronApp} from 'electron';
import {BrowserWindow, Menu} from 'electron';

const path = require('path')

electronApp.commandLine.appendSwitch('auto-detect', 'false');
electronApp.commandLine.appendSwitch('no-proxy-server')

export let g_mainWindow:BrowserWindow = null;

//route all RPC.Call/SetHandlers through ElectronIPC
RPC.SetTransport(new ElectronIPC());

/////////////////
//GetAppAuth - returns Twitter App API keys
////////////////
RPC.SetHandler(ServerApi.GetAppAuthCall, async (json:ServerApi.GetAppAuthCall):Promise<ServerApi.GetAppAuthResponse> =>
{
    return {success:true, appAuth:g_appAuth};
});

////////////////
//GetUserLogin - returns Twitter user API keys, twitter id_str and screen_name (obtained via oauth and verify_credentials api call)
//////////////
RPC.SetHandler(ServerApi.GetUserLoginCall, async (json:ServerApi.GetUserLoginCall):Promise<ServerApi.GetUserLoginResponse> =>
{
    return {success:true, userLogin:g_userLogin};
});

/////////////////////////
//GetFollowerCacheStatus
////////////////
RPC.SetHandler(ServerApi.GetFollowerCacheStatusCall, async (json:ServerApi.GetFollowerCacheStatusCall):Promise<ServerApi.GetFollowerCacheStatusResponse> =>
{
    if (!g_twitterUser)
    {
        console.log("Cant call GetFollowerCacheStatus when g_twitterUser is invalid");
        return {success:false, status:ServerApi.FollowerCacheStatusEnum.None, completionPercent:0, totalStoredFollowers:0, error:RPC.Error.Internal};
    }

    let status = g_twitterUser.GetFollowerCache().GetStatus();
    
    return {success:true, status:status.status, completionPercent:status.completionPercent, totalStoredFollowers:status.totalStoredFollowers}
});

/////////////
//BuildFollowerCache
///////////////
RPC.SetHandler(ServerApi.BuildFollowerCacheCall, async (c:ServerApi.BuildFollowerCacheCall):Promise<RPC.Response> =>
{
    if (!g_twitterUser)
    {
        console.log("Cant call BuildFollowerCache when g_twitterUser is invalid");
        return {success:false,error:RPC.Error.Internal};
    }

    g_twitterUser.GetFollowerCache().Build().then( (value:boolean) =>
    {
        console.log("build cache complete");
    });

    return {success:true};
});


/////////////
//QueryFollowerCache
///////////////
RPC.SetHandler(ServerApi.QueryFollowerCacheCall, async (c:ServerApi.QueryFollowerCacheCall):Promise<ServerApi.QueryFollowerCacheResponse> =>
{
    if (!g_twitterUser)
    {
        console.log("Cant call QueryFollowerCache when g_twitterUser is invalid");
        return {success:false, followers:null, error:RPC.Error.Internal};
    }

    let followers = await g_twitterUser.GetFollowerCache().Query(c.args.query);
    return {success:true, followers:followers};
});

/////////////////////
//Run Messaging Campaign
//////////////////////////
//only 1 campaign runs at a time
let g_activeCampaign:MessagingCampaignManager = null;

RPC.SetHandler(ServerApi.RunMessagingCampaignCall, async (c:ServerApi.RunMessagingCampaignCall):Promise<RPC.Response> =>
{
    if (!g_twitterUser)
    {
        console.log("Cant call RunMessagingCampaign when g_twitterUser is invalid");
        return {success:false, error:RPC.Error.Internal};
    }
    if (g_activeCampaign)
    {
        console.log("Cant call RunMessagingCampaign when another campaign is already running");
        return {success:false, error:RPC.Error.Internal};
    }

    //validate all the campaign fields that came across
    let campaign = MessagingCampaign.fromJSON(c.args.campaign);
    if (!campaign)
    {
        console.log("RunMessagingCampaign failed to validate campaign, rejecting");
        return {success:false, error:RPC.Error.Internal};
    }

    g_activeCampaign = new MessagingCampaignManager(g_twitterUser, campaign);
    try
    {
        g_activeCampaign.Run().then(()=>
        {
            console.log(`Campaign "${campaign.campaign_id}" finished`);
            g_activeCampaign = null;
            ClientApi.NotifyMessageCampaignStopped();
        });
    }
    catch (err)
    {
        console.log(`Campaign "${campaign.campaign_id}" stopped unexpectedly with error:`);
        console.error(err);
        ClientApi.NotifyMessageCampaignStopped();
    }

    return {success:true};
});

//////////////////////
//Login handler
//////////////////////
//when the renderer attempts a login, it includes the Twitter app api keys
RPC.SetHandler(ServerApi.LoginCall, async (c:ServerApi.LoginCall):Promise<ServerApi.LoginResponse> =>
{
    //verify that the app keys are valid before attempting to log the user in via oauth
    try
    {
        //@ts-ignore
        let testClient = new Twitter({
            consumer_key: c.args.appAuth.consumer_key,
            consumer_secret: c.args.appAuth.consumer_secret
        });

        const response = await testClient.getBearerToken();
        //if there's no error by now, the keys were good.. continue below..
    }
    catch (err)
    {
        let msg = "Unable to authenticate Twitter app API keys";
        console.log(msg);
        console.error(err);
        return {success:false, userLogin:null, error:RPC.Error.InvalidParams,errorMessage:msg};
    }

    //no error means the keys were valid
    //store them on disk for later use
    try
    {
        fs.writeFileSync(g_appAuthFileName,JSON.stringify(c.args.appAuth,null,2));
        g_appAuth = c.args.appAuth;
    }
    catch (err)
    {
        let msg="Error saving Twitter api API keys to disk";
        console.log(msg);
        console.error(err);
        return {success:false, userLogin:null, error:RPC.Error.Internal, errorMessage:msg};
    }

    //now attempt oauth login in separate window
    let oauthWindow:BrowserWindow = null;
    let oauthResult:any = null;
    try
    {
        let info = {
            key: c.args.appAuth.consumer_key,
            secret: c.args.appAuth.consumer_secret
        };

        const oauth = require(`oauth-electron-twitter`)

        oauthWindow = new BrowserWindow({webPreferences: {nodeIntegration: false}});

        oauthResult = await oauth.login(info, oauthWindow);
    }
    catch (err)
    {
        console.log("Error running oauth-electron-twitter");
        console.log(err)
    }

    if (oauthWindow)
        oauthWindow.close();

    if (!oauthResult)
    {
        return {success:false, userLogin:null, error:RPC.Error.Internal,errorMessage:"Twitter Login Failed"};
    }

    //now verify we can use these keys
    let user = new TwitterUser();
    let tryUserLogin:TwitterAuth.UserLogin = {
        access_token_key:oauthResult.token,
        access_token_secret:oauthResult.tokenSecret,
        id_str:'', //not known yet
        screen_name:'' //not known yet
    };

    let initOK = await user.Init(g_appAuth,tryUserLogin);
    if (!initOK)
    {
        return {success:false, userLogin:null, error:RPC.Error.Internal, errorMessage:"Unable to verify Twitter user credentials"};
    }

    try
    {
        let userLogin:TwitterAuth.UserLogin = {
            access_token_key:oauthResult.token,
            access_token_secret:oauthResult.tokenSecret,
            id_str:user.GetIdStr(),
            screen_name:user.GetScreenName()
        };

        //if they requested to store the keys, store them
        if (c.args.saveUserAuth)
            fs.writeFileSync(g_userLoginFileName,JSON.stringify(userLogin, null, 2));

        g_userLogin = userLogin;
        g_twitterUser = user;

        return {success:true,userLogin:userLogin};
    }
    catch (err)
    {
        let msg="Error saving Twitter user login to disk";
        console.log(msg);
        console.error(err);
        return {success:false, userLogin:null, error:RPC.Error.Internal, errorMessage:msg};
    }
});

function createWindow()
{
    // Create the browser window.
    let mainWindow = new BrowserWindow({
        width: 800,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    g_mainWindow = mainWindow;

    Menu.setApplicationMenu(null);
    
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
    
    //navigating seems to alter the window title.. can we please just keep it the way it should be? kthx
    mainWindow.webContents.on('page-title-updated',() => {
        mainWindow.setTitle(electronApp.getName());
    });

    //this is used to route <a href="<link>" target="_blank"> so that they open in
    //the users default browser (rather than inside electron itself)
    mainWindow.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        require('electron').shell.openExternal(url);
    });

    // open dev tools
    // mainWindow.webContents.openDevTools()
}


// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
electronApp.on('window-all-closed', function () {
  if (process.platform !== 'darwin') electronApp.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


async function main()
{
    //to blow away local storage...
    //doesnt seem to work actually, gets EPERM exception
    //const getAppPath = path.join(electronApp.getPath('appData'), "Electron");
    //fs.unlinkSync(getAppPath);
    
    //before we start, check to see if we have valid app auth and user auth keys already.
    //if so, we won't need to ask the user for them

    await ValidateAppAndUserAuth();
   
    electronApp.whenReady().then(() => {
        createWindow()
  
        electronApp.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    });
}

main();