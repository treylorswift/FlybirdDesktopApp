//classes and types used for remote procedure calls.. calls that have to cross some kind of boundary
//whether it be inter process communication, websocket communication, etc
define("Shared/RPC", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Call {
        Call(options) {
            return Transport.g_transport.Call(this, options);
        }
        CallNoResponse(options) {
            return Transport.g_transport.CallNoResponse(this, options);
        }
    }
    exports.Call = Call;
    var Error;
    (function (Error) {
        Error["NotLoggedIn"] = "NotLoggedIn";
        Error["Unauthorized"] = "Unauthorized";
        Error["InvalidMethod"] = "InvalidMethod";
        Error["InvalidParams"] = "InvalidParams";
        Error["InvalidInternalResponse"] = "InvalidInternalResponse";
        Error["Internal"] = "Internal";
        Error["Timeout"] = "Timeout";
        Error["Unknown"] = "Unknown";
    })(Error = exports.Error || (exports.Error = {}));
    function ErrorFromString(s) {
        //if there is no error object, we shouldn't create one.. leave it undefined
        if (s === undefined || s === null)
            return undefined;
        if (typeof (s) !== "string") {
            console.log("ErrorFromString - input was not a string type: " + typeof (s) + " - " + JSON.stringify(s));
            return Error.Unknown;
        }
        var err = Error[s];
        if (err === undefined) {
            console.log("ErrorFromString - unrecognized string code: " + s);
            err = Error.Unknown;
        }
        return err;
    }
    exports.ErrorFromString = ErrorFromString;
    class Response {
        //the idea here is that the constructor takes a raw json
        //fresh off a websocket or http response, and make sure the contents
        //map into the Response object as defined by typescript
        constructor(json) {
            this.success = json.success === true;
            if (this.success === false)
                this.error = ErrorFromString(json.error);
            else
                this.error = undefined;
            //all other property names are to be decoded/validated by subclasses of Response
        }
    }
    exports.Response = Response;
    class Transport {
    }
    Transport.g_transport = null;
    exports.Transport = Transport;
    function SetTransport(t) {
        Transport.g_transport = t;
    }
    exports.SetTransport = SetTransport;
    function SetHandler(className, func) {
        Transport.g_transport.SetHandler(className, func);
    }
    exports.SetHandler = SetHandler;
});
define("Shared/TwitterAuth", ["require", "exports", "fs"], function (require, exports, fs) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
});
define("Shared/ServerApi", ["require", "exports", "Shared/RPC"], function (require, exports, RPC) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ///////////////
    //Server Api
    //(calls the client can make to the server)
    //////////////
    //////////////////////
    //Get App Auth keys
    /////////////////////
    //returns whatever Twitter app API keys were last used to log a user in.
    //they are saved to disk after the first successful login and persist across app launches
    async function GetAppAuth() {
        return new GetAppAuthCall().Call();
    }
    exports.GetAppAuth = GetAppAuth;
    class GetAppAuthCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "GetAppAuth";
        }
    }
    exports.GetAppAuthCall = GetAppAuthCall;
    class GetAppAuthResponse extends RPC.Response {
    }
    exports.GetAppAuthResponse = GetAppAuthResponse;
    //////////////////////
    //Get User login
    /////////////////////
    //returns info for the currently logged in user
    async function GetUserLogin() {
        return new GetUserLoginCall().Call();
    }
    exports.GetUserLogin = GetUserLogin;
    class GetUserLoginCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "GetUserLogin";
        }
    }
    exports.GetUserLoginCall = GetUserLoginCall;
    class GetUserLoginResponse extends RPC.Response {
    }
    exports.GetUserLoginResponse = GetUserLoginResponse;
    //to initiate login from the user-facing UI, that request must include the Twitter app API keys.
    //they are either typed in by the user, or (if they were typed and saved previously)
    //loaded from disk when the app starts. presumably the UI has called GetAppAuth to obtain those
    //stored api keys prior to calling this. Or, the user has typed them in manually
    async function Login(args) {
        return new LoginCall(args).Call();
    }
    exports.Login = Login;
    class LoginCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "Login";
            this.args = args;
        }
    }
    exports.LoginCall = LoginCall;
    class LoginResponse extends RPC.Response {
    }
    exports.LoginResponse = LoginResponse;
    /////////////////////////
    ///Follower Cache Status
    /////////////////////////
    async function GetFollowerCacheStatus() {
        return new GetFollowerCacheStatusCall().Call();
    }
    exports.GetFollowerCacheStatus = GetFollowerCacheStatus;
    class GetFollowerCacheStatusCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "GetFollowerCacheStatus";
        }
    }
    exports.GetFollowerCacheStatusCall = GetFollowerCacheStatusCall;
    var FollowerCacheStatusEnum;
    (function (FollowerCacheStatusEnum) {
        FollowerCacheStatusEnum["None"] = "None";
        FollowerCacheStatusEnum["Incomplete"] = "Incomplete";
        FollowerCacheStatusEnum["InProgress"] = "InProgress";
        FollowerCacheStatusEnum["Complete"] = "Complete"; //a cache exists and no operation is being performed right now
    })(FollowerCacheStatusEnum = exports.FollowerCacheStatusEnum || (exports.FollowerCacheStatusEnum = {}));
    class GetFollowerCacheStatusResponse extends RPC.Response {
    }
    exports.GetFollowerCacheStatusResponse = GetFollowerCacheStatusResponse;
    /////////////////////////////////////////
    //BuildCache
    //////////////////////////
    async function BuildFollowerCache(command) {
        return new BuildFollowerCacheCall({ command: command }).Call();
    }
    exports.BuildFollowerCache = BuildFollowerCache;
    class BuildFollowerCacheCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "BuildFollowerCache";
            this.args = args;
        }
    }
    exports.BuildFollowerCacheCall = BuildFollowerCacheCall;
    var BuildFollowerCacheCommands;
    (function (BuildFollowerCacheCommands) {
        BuildFollowerCacheCommands[BuildFollowerCacheCommands["Rebuild"] = 0] = "Rebuild";
        BuildFollowerCacheCommands[BuildFollowerCacheCommands["Resume"] = 1] = "Resume";
    })(BuildFollowerCacheCommands = exports.BuildFollowerCacheCommands || (exports.BuildFollowerCacheCommands = {}));
    async function QueryFollowerCache(q) {
        return new QueryFollowerCacheCall({ query: q }).Call();
    }
    exports.QueryFollowerCache = QueryFollowerCache;
    class QueryFollowerCacheCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "QueryFollowerCache";
            this.args = args;
        }
    }
    exports.QueryFollowerCacheCall = QueryFollowerCacheCall;
    class QueryFollowerCacheResponse extends RPC.Response {
    }
    exports.QueryFollowerCacheResponse = QueryFollowerCacheResponse;
    async function RunMessagingCampaign(c) {
        return new RunMessagingCampaignCall({ campaign: c }).Call();
    }
    exports.RunMessagingCampaign = RunMessagingCampaign;
    class RunMessagingCampaignCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "RunMessagingCampaign";
            this.args = args;
        }
    }
    exports.RunMessagingCampaignCall = RunMessagingCampaignCall;
});
define("Shared/ElectronIPC", ["require", "exports", "Shared/RPC"], function (require, exports, RPC) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var g_logAll = false;
    if (g_logAll)
        console.log("ElectronIPC logging all calls");
    //ElectronIPC is used to make calls, and receive responses,
    //both from the renderer process to the main process, and the main process to the renderer process
    //they both use this same .ts file.
    //
    //the main process is only able to send to a single 'main' window in the renderer process
    //
    //if multiple windows are opened by the renderer process, this assumption will not be true and
    //further work will be required to sort that situation out
    //
    //the logic here at the top establishes sendFunc and setReceiveFunc
    //sendFunc - what the rest of the code below uses to send calls to the other side
    //setReceiveFunc - the code below says "hey, incoming calls come here..." by providing a function argument to setReceiveFunc
    //
    let sendFunc = null;
    let setReceiveFunc = null;
    //try to wire this up via window.IPC (if the renderer process)
    //(will throw a exception if the global window object doesnt exist)
    try {
        //in the browser, this will attach to the IPC methods
        //established in preload.js
        sendFunc = window.IPC.send;
        setReceiveFunc = window.IPC.receive;
        if (!sendFunc)
            console.log("ElectronIPC in browser - sendFunc not found!");
        if (!setReceiveFunc)
            console.log("ElectronIPC in browser - setReceiveFunc not found!");
    }
    catch (err) {
        //global window object doesnt exist, assume this is the main process
        //wire into electron.ipcMain.on("IPC") and mainWindow.webContents.send
        //the below 'require' statements will actually work in the main process
        //
        //note that the main process only sends messages to the main browser window,
        //which must be exported from Main.ts and established by the time the below
        //code runs
        const main = require("../Main/Main");
        const electron = require("electron");
        sendFunc = (arg) => {
            if (main.g_mainWindow)
                main.g_mainWindow.webContents.send("IPC", arg);
            else
                console.log("sendFunc - g_mainWindow not found!");
        };
        setReceiveFunc = (func) => {
            electron.ipcMain.on("IPC", (event, arg) => func(arg));
        };
    }
    //used for Call() below, and subsequent response handling
    class PromiseFunctions {
        constructor(resolve, reject) {
            this.resolve = resolve;
            this.reject = reject;
            this.finished = false;
        }
        Finished() {
            return this.finished;
        }
        Resolve(json) {
            if (this.finished === true) {
                console.log("PromiseFunctions.Resolve - already finished, can't resolve");
                console.trace();
                return;
            }
            this.resolve(json);
            this.finished = true;
        }
        Reject(json) {
            if (this.finished === true) {
                console.log("PromiseFunctions.Reject - already finished, can't reject");
                console.trace();
                return;
            }
            this.reject(json);
            this.finished = true;
        }
    }
    class ElectronIPC extends RPC.Transport {
        constructor() {
            super();
            this.callHandlers = new Map();
            this.responseHandlers = new Map();
            this.sequence = 0;
            //calls coming into the process come in here
            setReceiveFunc(async (json) => {
                if (json.method !== undefined) {
                    //its a call, handle it
                    let resp = await this.HandleIncomingCall(json);
                    //send a response back only if a sequence was defined on the call
                    if (json.sequence !== undefined) {
                        if (g_logAll)
                            console.log('IncomingCallResponse: ' + JSON.stringify(resp));
                        //fill in the correct sequence if they forgot to
                        if (resp.sequence === undefined)
                            resp.sequence = json.sequence;
                        sendFunc(resp);
                    }
                }
                else if (json.success !== undefined) {
                    //its a response, handle it
                    this.HandleIncomingResponse(json);
                }
            });
        }
        //setup a function to handle a particular incoming json call
        SetHandler(className, func) {
            //have to temporarily instantiate a call to get its method
            //little inefficient but better to do this way for type safety
            let tempInstance = new className();
            this.callHandlers.set(tempInstance.method, func);
        }
        async HandleIncomingCall(json) {
            if (g_logAll)
                console.log('IncomingCall: ' + JSON.stringify(json));
            var handler = this.callHandlers.get(json.method);
            if (!handler) {
                console.log("HandleIncomingCall - no handler for method: " + json.method);
                return { success: false, error: RPC.Error.InvalidMethod, sequence: json.sequence };
            }
            try {
                return handler(json);
            }
            catch (err) {
                console.log("HandleIncomingCall - exception in handler");
                console.error(err);
                return { success: false, error: RPC.Error.Unknown, sequence: json.sequence };
            }
        }
        async HandleIncomingResponse(json) {
            if (g_logAll)
                console.log('IncomingResponse: ' + JSON.stringify(json));
            var handler = this.responseHandlers.get(json.sequence);
            if (!handler) {
                console.log("HandleIncomingResponse - no handler for sequence: " + json.sequence + " - data discarded: " + JSON.stringify(json));
                return;
            }
            if (handler.Finished() !== true) {
                handler.Resolve(json);
            }
            else {
                console.log("HandleIncomingResponse - handler was already finished, data discarded: " + JSON.stringify(json));
            }
            this.responseHandlers.delete(json.sequence);
        }
        CallNoResponse(c, options) {
            //we determine the contents of the 'sequence'
            //main difference is that a sequence is not added to the call json,
            //so the other side will know not to send back a response
            //we will also not create a response handler in anticipation of it..
            delete c.sequence;
            var log = g_logAll;
            if (options && options.log !== undefined)
                log = options.log === true;
            if (log)
                console.log('CallNoResponse: ' + JSON.stringify(c));
            //store these promise functions in our map so that this Call can be resolved later
            //when a matching sequence comes back from the other side
            sendFunc(c);
        }
        Call(c, options) {
            return new Promise((resolve, reject) => {
                //we determine the contents of the 'sequence'
                c.sequence = this.sequence;
                var log = g_logAll;
                if (options && options.log !== undefined)
                    log = options.log === true;
                if (log)
                    console.log('Call: ' + JSON.stringify(c));
                //store these promise functions in our map so that this Call can be resolved later
                //when a matching sequence comes back from the other side
                this.responseHandlers.set(this.sequence, new PromiseFunctions(resolve, reject));
                sendFunc(c);
                this.sequence++;
            });
        }
    }
    exports.ElectronIPC = ElectronIPC;
});
define("Renderer/DOMSite", ["require", "exports", "Renderer/DOMComponent"], function (require, exports, DOMComponent_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class PageMap {
        constructor(parent) {
            this.parent = parent;
            this.pageMap = null;
        }
        InitRoutes(json) {
            //destroy whatever pagemap is already around
            this.pageMap = new Map();
            var keys = Object.keys(json);
            for (var i = 0; i < keys.length; i++) {
                this.pageMap.set(keys[i], json[keys[i]]);
            }
        }
        GetPage(path) {
            if (!this.pageMap)
                return null;
            var ctor = this.pageMap.get(path);
            if (ctor)
                return new ctor(this.parent);
            else
                console.log(`DOMSite.GetPage - unrecognized path: ${path}`);
        }
    }
    ;
    class DOMSite extends DOMComponent_js_1.DOMComponent {
        constructor() {
            super(null);
            this.pageMap = new PageMap(this);
            this.currentPath = null;
            this.currentPage = null;
        }
        InitRoutes(map) {
            this.pageMap.InitRoutes(map);
        }
        GetCurrentRoute() {
            return { page: this.currentPage, path: this.currentPath };
        }
        async RouteTo(path, options) {
            if (!this.pageMap)
                return false;
            try {
                if (this.currentPath === path) {
                    //we're already there, we're done
                    return true;
                }
                var p = this.pageMap.GetPage(path);
                if (p) {
                    if (this.currentPage) {
                        this.currentPage.RenderCleanup();
                    }
                    this.currentPath = path;
                    this.currentPage = p;
                    this.ClearModalComponent();
                    this.ClosePopupComponent();
                    await p.Render(this.GetRouteContentElement());
                    return true;
                }
                else {
                    console.log(`RouteTo - route does not exist: ${path}`);
                }
            }
            catch (err) {
                console.error(err);
            }
            return false;
        }
    }
    exports.DOMSite = DOMSite;
});
define("Renderer/DOMComponent", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class DOMPopupHandle {
        constructor() {
            this.handle = 'popup_' + DOMPopupHandle.count;
            DOMPopupHandle.count++;
        }
    }
    DOMPopupHandle.count = 0;
    exports.DOMPopupHandle = DOMPopupHandle;
    class DOMComponent {
        constructor(parent) {
            this.parent = parent;
            if (parent)
                this.site = parent.GetSite();
            else
                this.site = null;
        }
        GetSite() {
            return this.site;
        }
        //any listeners or watches or other external references that were established during Render
        //should be cleaned up here
        async RenderCleanup() { }
        MapEvent(parentElement, id, eventName, memberFunction) {
            try {
                parentElement.querySelector(`#${id}`).addEventListener(`${eventName}`, memberFunction.bind(this));
            }
            catch (err) {
                console.log(`MapEvent error - name: "${err.name}" message: "${err.message}`);
                console.error(err);
            }
        }
        DisplayPopupComponent(x, y, component) {
            var h = new DOMPopupHandle();
            var parent_handle = h.handle;
            var content_handle = h.handle + '_content';
            var html = `
            <div style="position:absolute; left:${x}px; top:${y}px; box-shadow: 0 1px 1px #0000, 0 0px 2px;">
                <div id=${content_handle}></div>
            </div>`;
            var newDiv = document.createElement('div');
            newDiv.id = parent_handle;
            newDiv.innerHTML = html;
            var renderDiv = newDiv.querySelector(`#${content_handle}`);
            component.Render(renderDiv);
            //we have a root level div wherein all popups are kept
            var popupModal = document.getElementById("popup-modal");
            popupModal.appendChild(newDiv);
            popupModal.style.display = 'block';
            // When the user clicks anywhere outside of the modal, close it
            var checkOutsideClick = function (event) {
                //allow clicks within the popup, clicks outside will close it
                if (event.target == popupModal) {
                    popupModal.removeChild(newDiv);
                    component.RenderCleanup();
                    window.removeEventListener("click", checkOutsideClick);
                    popupModal.style.display = 'none';
                }
            };
            window.addEventListener("click", checkOutsideClick);
            return h;
        }
        ClosePopupComponent(h) {
            var popupModal = document.getElementById("popup-modal");
            if (!popupModal)
                return;
            if (h) {
                var em = popupModal.querySelector(`#${h.handle}`);
                if (em) {
                    popupModal.removeChild(em);
                    popupModal.style.display = 'none';
                }
            }
            else {
                popupModal.innerHTML = ""; //remove all children
                popupModal.style.display = 'none';
            }
        }
        DisplayModalMessage(message) {
            this.DisplayModalComponent(new StringMessageComponent(this, message));
        }
        //same as DisplayModalMessage except shows an 'ok' and 'cancel' button
        //resolves with true if they click ok, false if they click cancel or click outside the content
        async DisplayModalConfirm(message) {
            var modal = document.getElementById('modal');
            var modalContent = document.getElementById('modal-content');
            let confirmComponent = new ConfirmComponent(this, message);
            //await the render so we are sure that it's .promise and .promiseResolve are accessible here
            await confirmComponent.Render(modalContent);
            modal.style.display = "flex";
            // When the user clicks anywhere outside of the modal, close it
            var checkOutsideClick = function (event) {
                //'modal' is effectively a page-covering background behind the modal content
                //which will catch any attemps to click anywhere other than the modal content
                //if they do that, the modal dialog cancels out
                if (event.target == modal) {
                    modalContent.innerHTML = '';
                    confirmComponent.promiseResolve(false); //clicking outside is the same as clicking cancel
                    confirmComponent.RenderCleanup();
                    modal.style.display = "none";
                    window.removeEventListener("click", checkOutsideClick);
                }
            };
            window.addEventListener("click", checkOutsideClick);
            //this promise returned from the confirmcomponent gets resolved
            //when ok is clicked, cancel is clicked, or right above here if they click
            //outside the modal content
            return confirmComponent.promise;
        }
        DisplayModalComponent(component) {
            var modal = document.getElementById('modal');
            var modalContent = document.getElementById('modal-content');
            component.Render(modalContent);
            modal.style.display = "flex";
            // When the user clicks anywhere outside of the modal, close it
            var checkOutsideClick = function (event) {
                //'modal' is effectively a page-covering background behind the modal content
                //which will catch any attemps to click anywhere other than the modal content
                //if they do that, the modal dialog cancels out
                if (event.target == modal) {
                    modalContent.innerHTML = '';
                    component.RenderCleanup();
                    modal.style.display = "none";
                    window.removeEventListener("click", checkOutsideClick);
                }
            };
            window.addEventListener("click", checkOutsideClick);
        }
        ClearModalComponent() {
            var modal = document.getElementById('modal');
            var modalContent = document.getElementById('modal-content');
            if (modalContent)
                modalContent.innerHTML = '';
            if (modal)
                modal.style.display = "none";
        }
    }
    exports.DOMComponent = DOMComponent;
    class StringMessageComponent extends DOMComponent {
        constructor(parent, message) {
            super(parent);
            this.message = message;
        }
        async Render(em) {
            em.innerHTML = this.message;
        }
    }
    class ConfirmComponent extends DOMComponent {
        constructor(parent, message) {
            super(parent);
            this.promise = null;
            this.promiseResolve = null;
            this.message = message;
        }
        async Render(em) {
            this.promise = new Promise((resolve, reject) => {
                //we have to save this resolve function so it can be accessed outside the component
                //by DisplayConfirmComponent, which catches clicks outside the modal content area
                //and resolves(false)
                this.promiseResolve = resolve;
                em.innerHTML =
                    `${this.message}<br/><br/>
                <div style="display:flex; justify-content:flex-end">
                    <button id="ok" style="margin-right: 12px">OK</button><button id="cancel">Cancel</button>
                </div>`;
                em.querySelector('#ok').addEventListener('click', () => {
                    this.ClearModalComponent();
                    resolve(true);
                });
                em.querySelector('#cancel').addEventListener('click', () => {
                    this.ClearModalComponent();
                    resolve(false);
                });
            });
        }
    }
});
define("Renderer/ProgressComponent", ["require", "exports", "Renderer/DOMComponent"], function (require, exports, DOMComponent_js_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //simple progress bar
    class ProgressComponent extends DOMComponent_js_2.DOMComponent {
        //expect a number 0 to 100
        SetProgressPercent(p) {
            this.progressDiv.style.width = `${p}%`;
        }
        async Render(em) {
            em.innerHTML = `<div id="progressInner" style="display:inline-block; width:0%; height:100%; background-color:rgb(88, 178, 255)"></div>`;
            this.progressDiv = em.querySelector('#progressInner');
        }
    }
    exports.ProgressComponent = ProgressComponent;
});
define("Renderer/FollowerCacheComponent", ["require", "exports", "Shared/ServerApi", "Renderer/DOMComponent", "Renderer/ProgressComponent"], function (require, exports, ServerApi, DOMComponent_js_3, ProgressComponent_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //displays status of the follower cache, also displays buttons which can be used to trigger download / resume / re-download of followers
    class FollowerCacheComponent extends DOMComponent_js_3.DOMComponent {
        constructor(parent) {
            super(parent);
            this.progressComponent = null;
            this.destElement = null;
            this.progressInterval = null;
            this.parent = null;
            this.parent = parent;
        }
        MonitorProgress() {
            if (this.progressInterval) {
                //already monitoring
                return;
            }
            //ok build has started.. need to poll for updates
            this.progressInterval = setInterval(async () => {
                try {
                    let statusResult = await ServerApi.GetFollowerCacheStatus();
                    if (statusResult.success) {
                        this.progressComponent.SetProgressPercent(statusResult.completionPercent);
                        if (statusResult.status !== ServerApi.FollowerCacheStatusEnum.InProgress) {
                            //stop the interval
                            clearInterval(this.progressInterval);
                            this.progressInterval = null;
                            //once the downloads have finished, we should update the query results
                            //(they may or may not be visible but either way, the results should be there
                            //for when they are eventually shown)
                            this.parent.queryComponent.RunQuery();
                            //refresh the status displayed
                            this.UpdateStatusUI();
                        }
                    }
                }
                catch (err) {
                    console.log("MonitorProgress error:");
                    console.error(err);
                    clearInterval(this.progressInterval);
                }
            }, 2000);
        }
        async BuildCache(cmd) {
            //before sending a build command we check what the current status is and make sure
            //it makes sense to send a build command.
            //
            //reasons why we wouldn't send a build command:
            //- attempt at getting cache status failed
            //- cache status indicates its in progress on a download already
            //- cache indicates its already complete - prompt user 'are you sure you want to rebuild?'
            //- ??
            //- profit
            let statusResult;
            let errorMessage = 'Sorry, something went wrong. Unable to retreive your followers right now.';
            try {
                statusResult = await ServerApi.GetFollowerCacheStatus();
                if (statusResult.success !== true) {
                    alert(errorMessage);
                    return;
                }
            }
            catch (err) {
                alert(errorMessage);
                console.log("BuildCache - failed to get current cache status");
                console.error(err);
                return;
            }
            if (statusResult.status === ServerApi.FollowerCacheStatusEnum.InProgress) {
                alert("Follower download is in progress.");
                return;
            }
            if (cmd === ServerApi.BuildFollowerCacheCommands.Rebuild) {
                if (statusResult.status === ServerApi.FollowerCacheStatusEnum.Complete) {
                    let confirmOK = await this.DisplayModalConfirm("Are you sure you want to rebuild? It takes about 15 minutes for 75k followers.");
                    if (!confirmOK)
                        return;
                }
            }
            let buildCacheResult = await ServerApi.BuildFollowerCache(cmd);
            if (!buildCacheResult.success) {
                console.log("BuildCache error: " + buildCacheResult.error);
                alert(errorMessage);
                return;
            }
            this.UpdateStatusUI();
            this.MonitorProgress();
        }
        async Render(em) {
            this.destElement = em;
            this.UpdateStatusUI();
        }
        async UpdateStatusUI() {
            let cacheStatusResponse = await ServerApi.GetFollowerCacheStatus();
            let html = '';
            let progressShown = false;
            let buildShown = false;
            let buildCommand = ServerApi.BuildFollowerCacheCommands.Rebuild;
            let buildButtonId = "buildCache";
            if (cacheStatusResponse.status === ServerApi.FollowerCacheStatusEnum.None) {
                html += `Let's get started and retreive your followers from Twitter. <button id="${buildButtonId}">Download Followers</button>`;
                buildShown = true;
            }
            else if (cacheStatusResponse.status === ServerApi.FollowerCacheStatusEnum.Incomplete) {
                html += `Your last follower download didn't finish. <button id="${buildButtonId}">Resume Downloading Followers</button>`;
                buildShown = true;
                buildCommand = ServerApi.BuildFollowerCacheCommands.Resume;
            }
            else if (cacheStatusResponse.status === ServerApi.FollowerCacheStatusEnum.Complete) {
                html += `You have ${cacheStatusResponse.totalStoredFollowers} followers. <button id="${buildButtonId}">Refresh Followers</button>`;
                //make sure query ui gets displayed
                this.parent.queryComponent.SetVisible(true);
                buildShown = true;
            }
            else if (cacheStatusResponse.status === ServerApi.FollowerCacheStatusEnum.InProgress) {
                let progressHtml = `<div id="progress" style="display:inline-block; margin-left: 4px; height:15px; width:100px; border:1px solid #d8d8d8"></div>`;
                html +=
                    `<div style="display:flex; align-items:center">
                Follower Download Progress: ${progressHtml}
                </div>`;
                progressShown = true;
                //make sure we are monitoring progress (might already be but just make sure)
                this.MonitorProgress();
            }
            this.destElement.innerHTML = html;
            this.progressComponent = new ProgressComponent_js_1.ProgressComponent(this);
            if (progressShown) {
                this.progressComponent.Render(this.destElement.querySelector('#progress'));
                this.progressComponent.SetProgressPercent(cacheStatusResponse.completionPercent);
            }
            if (buildShown)
                this.MapEvent(this.destElement, 'buildCache', 'click', () => this.BuildCache(buildCommand));
        }
    }
    exports.FollowerCacheComponent = FollowerCacheComponent;
});
define("Shared/ClientApi", ["require", "exports", "Shared/RPC"], function (require, exports, RPC) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ////////////////////
    //Client API
    //(methods the server can call on the client
    ///////////////////////
    //////////////////////////
    //Notify Message Sent
    /////////////////////////
    function NotifyMessageSent(args) {
        new NotifyMessageSentCall(args).CallNoResponse();
    }
    exports.NotifyMessageSent = NotifyMessageSent;
    class NotifyMessageSentCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "NotifyMessageSent";
            this.args = args;
        }
    }
    exports.NotifyMessageSentCall = NotifyMessageSentCall;
    /////////////////
    //Notify Message Campaign Started / Stopped / Waiting
    ///////////////////
    //Started
    function NotifyMessageCampaignStarted() {
        new NotifyMessageCampaignStartedCall().CallNoResponse();
    }
    exports.NotifyMessageCampaignStarted = NotifyMessageCampaignStarted;
    class NotifyMessageCampaignStartedCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "NotifyMessageCampaignStarted";
        }
    }
    exports.NotifyMessageCampaignStartedCall = NotifyMessageCampaignStartedCall;
    //Stopped
    function NotifyMessageCampaignStopped() {
        new NotifyMessageCampaignStoppedCall().CallNoResponse();
    }
    exports.NotifyMessageCampaignStopped = NotifyMessageCampaignStopped;
    class NotifyMessageCampaignStoppedCall extends RPC.Call {
        constructor() {
            super(...arguments);
            this.method = "NotifyMessageCampaignStopped";
        }
    }
    exports.NotifyMessageCampaignStoppedCall = NotifyMessageCampaignStoppedCall;
    //Waiting
    function NotifyMessageCampaignWaiting(args) {
        new NotifyMessageCampaignWaitingCall(args).CallNoResponse();
    }
    exports.NotifyMessageCampaignWaiting = NotifyMessageCampaignWaiting;
    var SendDelayReason;
    (function (SendDelayReason) {
        SendDelayReason["NoDelay"] = "NoDelay";
        SendDelayReason["Spread"] = "Spread";
        SendDelayReason["RateLimit"] = "RateLimit";
    })(SendDelayReason = exports.SendDelayReason || (exports.SendDelayReason = {}));
    class NotifyMessageCampaignWaitingCall extends RPC.Call {
        constructor(args) {
            super();
            this.method = "NotifyMessageCampaignWaiting";
            this.args = args;
        }
    }
    exports.NotifyMessageCampaignWaitingCall = NotifyMessageCampaignWaitingCall;
});
//when composing a message for their followers, users can define variables in their message
//that will be expanded just prior to sending
//
//the main reason this 'template expansion' exists is so that users can create unique
//newsletter sign up links for each user that is contacted.
//
//instead of just saying "Hey check out my newsletter at https://itk-signup.herokuapp.com/treylorswift"
//
//the message can say "Hey check out my newsletter at https://itk-signup.herokuapp.com/treylorswift?twRef=balajis "
//
//the above would be obtained by composing a message like this:
//"Hey check out my newsletter at https://itk-signup.herokuapp.com/treylorswift?twRef=${followerTwitterHandle}
//
//the point of this is that now balajis can direct other people to my newsletter using that link, and
//he will receive credit when people sign up using that link
//
//variables are encoded javascript style, ${variableName}
//but the expansion is not actually done by evaluating the javascript, its just a simple
//look for $ followed by {, find the next }, and see whether it matches
//any of the variables we are prepared to handle
//
//if an unknown variable is found it will throw an error
//
define("Shared/MessageTemplate", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    function Expand(message, followerTwitterHandle) {
        let str = '';
        //any variables in the message that are matched by the
        //map below will expand as defined by the map
        let expansionMap = {
            'followerTwitterHandle': followerTwitterHandle
        };
        //look for ${
        let vars = message.split('$');
        for (var i = 0; i < vars.length; i++) {
            str += vars[i];
            let varExpanded = false;
            //is the next character a { ?
            if (i < vars.length - 1) {
                if (vars[i + 1].startsWith('{')) {
                    //yes...
                    //was the previous character a \ (was the $ escaped, as in \$) ?
                    if (i > 0 && vars[i].endsWith('\\')) {
                        //yes it was escaped, we wont expand  the variable name, but we will remove the \ escape character
                        str = str.substr(0, str.length - 1);
                    }
                    else {
                        //no it wasnt escaped, attempt to expand by finding whats between the {}
                        //only a simple search for } is performed. if people get crazy and nest ${} within other ${} this will fail
                        let closingBracketIndex = vars[i + 1].indexOf('}');
                        if (closingBracketIndex > 0) {
                            //we found the closing bracket
                            let varName = vars[i + 1].substr(1, closingBracketIndex - 1).trim();
                            let expandedString = expansionMap[varName];
                            if (expandedString !== undefined && expandedString !== null && typeof (expandedString === 'string')) {
                                varExpanded = true;
                                //insert the expanded variable into the output string
                                str += expandedString;
                                //insert the remainder after the closing }
                                let remainder = vars[i + 1].substr(closingBracketIndex + 1);
                                str += remainder;
                                //we just consumed the i+1 index from the iteration process so
                                //make sure we skip it
                                i++;
                            }
                            else {
                                console.log("ExpandMessageTemplate - Invalid variable named in template: " + varName);
                                throw { name: "InvalidVariable", message: `Invalid variable named in template: ${varName}` };
                            }
                        }
                    }
                }
                //if we didnt do any expansion just include the $ as it occurred in the message
                if (varExpanded === false) {
                    str += '$';
                }
            }
        }
        return str;
    }
    exports.Expand = Expand;
});
define("Renderer/QueryComponent", ["require", "exports", "Shared/RPC", "Shared/ServerApi", "Shared/ClientApi", "Shared/MessageTemplate", "Renderer/DOMComponent"], function (require, exports, RPC, ServerApi, ClientApi, MessageTemplate, DOMComponent_js_4) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //only support a single / default messaging campaign from this UI currently
    let g_campaignId = 'default';
    class QueryComponent extends DOMComponent_js_4.DOMComponent {
        constructor(parent) {
            super(parent);
            this.containerElement = null;
            this.resultsDiv = null;
            this.sortElement = null;
            this.tagsElement = null;
            this.messageElement = null;
            this.sendButton = null;
            this.sendLimit = null;
            this.sandboxCheckbox = null;
            this.waitingMessage = null;
            //how many query results we will show on screen
            this.numResultsToDisplay = 50;
            //we intentionally query for more results than we can display on screen so
            //that when sending messages, we have the necessary information needed to
            //fill in at the bottom of the list as entries dissappear from the top
            this.extraRows = null;
            this.nextExtraRowToAppear = 0;
            //1.5secs is the full animation time for a row deletion.
            //(many rows might be disappearing at once though)
            this.rowDeletionAnimationTime = 1500;
            //if they update the query ui before a previous query has finished, we wait
            //for the previous query to finish.
            //we keep a queue of 1 query (representing the most recent query attempt) to run
            //after the completion of the previous query.
            this.queryRunning = false;
            this.deferredQuery = null;
            this.parent = null;
            //by default we show only followers who we haven't contacted
            this.contactedVisible = false;
            this.toggleContactedButton = null;
            this.campaignRunning = false;
            this.RunQuery = async () => {
                var sort = this.sortElement.value;
                let tags = this.tagsElement.value.split(' ');
                //we ask for 1000 more than the # we are going to display. this is because
                //we may, at the click of a button, send 1000 message - and we need at least
                //numResultsToDisplay more than that to be left over to show in the
                //query area as the messages are sent.
                //
                //when message sends complete, the display is requeried anyway, but this
                //ensures that the display will fill in promptly (from the bottom) as
                //entries disappear at the top
                let queryLimit = this.numResultsToDisplay + 1000;
                let query = {
                    campaignId: g_campaignId,
                    tags: tags,
                    sort: sort,
                    offset: 0,
                    limit: queryLimit,
                    includeContacted: this.contactedVisible,
                    useDryRunMessageHistory: this.sandboxCheckbox.checked
                };
                if (this.queryRunning) {
                    this.deferredQuery = query;
                    return;
                }
                this.queryRunning = true;
                //this loop exists to make sure that any queries queued
                //while processing this query get immediately executed when
                //this query finishes.
                while (1) {
                    try {
                        let results = await ServerApi.QueryFollowerCache(query);
                        //display the results
                        this.RenderResults(results);
                        if (this.deferredQuery) {
                            //there was a query queued up while the previous query was processing.
                            //we should loop and run that query now
                            query = this.deferredQuery;
                            this.deferredQuery = null;
                        }
                        else {
                            //there is no deferred query to do, we can 
                            //break out of this loop
                            break;
                        }
                    }
                    catch (err) {
                        console.log("Error while processing query: " + JSON.stringify(query));
                        console.error(err);
                        break;
                    }
                }
                this.queryRunning = false;
            };
            this.RunCampaign = async () => {
                if (this.campaignRunning) {
                    this.DisplayModalMessage("Sending in progress, please wait for it to finish.");
                    return;
                }
                var sort = this.sortElement.value;
                let tags = this.tagsElement.value.split(' ');
                let count = this.GetSendCount();
                //test the expansion template (its gonna be called server side so better to
                //inform the user of errors before sending)
                let expansion = null;
                try {
                    let followerTwitterHandle = 'TestHandle';
                    expansion = MessageTemplate.Expand(this.messageElement.value, followerTwitterHandle);
                }
                catch (err) {
                    this.DisplayModalMessage(`Error interpreting your message template:<br/><br/>${err.message}`);
                    return;
                }
                let campaign = {
                    message: this.messageElement.value,
                    campaign_id: g_campaignId,
                    sort: sort,
                    scheduling: "burst",
                    dryRun: this.sandboxCheckbox.checked,
                    count: count,
                    filter: {
                        tags: tags
                    }
                };
                this.campaignRunning = true;
                this.sendButton.disabled = true;
                let startOK = await ServerApi.RunMessagingCampaign(campaign);
                if (startOK.success !== true) {
                    this.DisplayModalMessage('Unable to start sending messages: ' + startOK.errorMessage);
                    this.campaignRunning = false;
                    return;
                }
            };
            this.SandboxCheckboxChanged = () => {
                if (!this.sandboxCheckbox.checked) {
                    this.DisplayModalMessage('<center>With "Sandbox" unchecked, clicking "Send Messages" will send real direct messages.<br/><br/>Be careful!</center>');
                }
                this.SaveUIStateToLocalStorage();
                this.RunQuery();
            };
            this.UpdateSendButtonText = () => {
                let count = this.GetSendCount();
                if (count !== null) {
                    let msg = `Send To ${count} Follower`;
                    if (count > 1)
                        msg += 's';
                    this.sendButton.innerHTML = msg;
                }
                else
                    this.sendButton.innerHTML = `Send To All Followers`;
            };
            this.SendLimitChanged = () => {
                this.UpdateSendButtonText();
                this.SaveUIStateToLocalStorage();
            };
            this.SortChanged = () => {
                this.SaveUIStateToLocalStorage();
                this.RunQuery();
            };
            this.TagsChanged = () => {
                this.SaveUIStateToLocalStorage();
                this.RunQuery();
            };
            this.MessageChanged = () => {
                this.SaveUIStateToLocalStorage();
            };
            this.ToggleContacted = () => {
                this.contactedVisible = !this.contactedVisible;
                this.UpdateContactedButton(this.contactedVisible);
                this.RunQuery();
                this.SaveUIStateToLocalStorage();
            };
            this.parent = parent;
        }
        RenderResults(results) {
            //we query for more results than we are going to display so that
            //if a message send is initiated, we have extra entries to fill in
            //the bottom as they disappear from the top
            this.extraRows = new Array();
            this.nextExtraRowToAppear = 0;
            //remove all entries currently in the results div..
            this.resultsDiv.innerHTML = '';
            for (var i = 0; i < results.followers.length; i++) {
                let f = results.followers[i];
                let imgUrl = f.profileImageUrl;
                if (!imgUrl)
                    imgUrl = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png";
                let contactedString = 'No';
                if (results.followers[i].contactDate)
                    contactedString = 'Yes';
                let rowHtml = `<div class="followerRow" onclick="window.open('https://twitter.com/${f.screenName}', '_blank')">
                    <div class="followerIcon"><img class="followerIconImg" src="${imgUrl}"></div>
                    <div class="followerName">${f.name}</div>
                    <div class="followerScreenName">${f.screenName}</div>
                    <div class="followerFollowersCount">${f.followersCount}</div>
                    <div id="contacted-${f.screenName}" class="followerContacted">${contactedString}</div>
                </div>`;
                //`<div id="row-${f.screenName}" class="followerRowDeleter">${rowHtml}</div>`;
                let rowDiv = document.createElement('div');
                rowDiv.id = `row-${f.screenName}`;
                rowDiv.className = "followerRowDeleter";
                rowDiv.innerHTML = rowHtml;
                if (i < this.numResultsToDisplay) {
                    this.resultsDiv.appendChild(rowDiv);
                }
                else {
                    //these are the rows we wont display yet.. when they start sending messages,
                    //they'll be added to the bottom of the resultsDiv as the ones on top
                    //disappear
                    //
                    this.extraRows.push(rowDiv);
                }
            }
        }
        //returns null if the send count field is empty/blank
        GetSendCount() {
            if (this.sendLimit.value === '')
                return null;
            let count = 0;
            try {
                let count = parseInt(this.sendLimit.value);
                return count;
            }
            catch (err) {
                return null;
            }
        }
        UpdateContactedButton(showContacted) {
            if (showContacted === false) {
                this.toggleContactedButton.innerHTML = "Show Contacted";
            }
            else {
                this.toggleContactedButton.innerHTML = "Hide Contacted";
            }
        }
        SaveUIStateToLocalStorage() {
            let uiState = {
                message: this.messageElement.value,
                sort: this.sortElement.value,
                sandbox: this.sandboxCheckbox.checked,
                sendLimit: this.sendLimit.value,
                tags: this.tagsElement.value,
                showContacted: this.contactedVisible
            };
            localStorage.setItem('uiState', JSON.stringify(uiState));
        }
        LoadUIStateFromLocalStorage() {
            try {
                let c = JSON.parse(localStorage.getItem('uiState'));
                try {
                    this.messageElement.value = c.message;
                }
                catch (err) { }
                try {
                    this.sortElement.value = c.sort;
                }
                catch (err) { }
                try {
                    this.sandboxCheckbox.checked = c.sandbox;
                }
                catch (err) { }
                try {
                    this.sendLimit.value = c.sendLimit;
                }
                catch (err) { }
                try {
                    this.tagsElement.value = c.tags;
                }
                catch (err) { }
                try {
                    this.contactedVisible = c.showContacted;
                }
                catch (err) { }
                this.UpdateContactedButton(this.contactedVisible);
                this.UpdateSendButtonText();
            }
            catch (err) {
                console.log("LoadUIStateFromLocalStorage error:");
                console.error(err);
                //init ui
                this.messageElement.value = this.GetDefaultMessage();
                this.sortElement.value = 'influence';
                this.sandboxCheckbox.checked = true;
                this.sendLimit.value = '';
                this.tagsElement.value = '';
                this.contactedVisible = false;
                this.UpdateContactedButton(this.contactedVisible);
            }
            this.RunQuery();
        }
        SetVisible(visible) {
            if (visible)
                this.containerElement.style.display = 'block';
            else
                this.containerElement.style.display = 'none';
        }
        GetDefaultMessage() {
            return `Hey there, are you interested in receiving my newsletter?

You can sign up at https://flybirdy.herokuapp.com/${this.parent.userLogin.screen_name}?twRef=\${followerTwitterHandle}`;
        }
        async Render(em) {
            let html = `<div>
                Compose a message to your followers:<br/>
                <div style="display:flex; align-items:center">
                    <textarea id="message" spellcheck="false" class="messageTextArea" type="text">${this.GetDefaultMessage()}</textarea>
                </div>
                <br/>
                <div style="display:flex; justify-content:flex-start; align-items:flex-end">
                    <div>
                        <div>Sort</div>
                        <select id="sortSelect">
                            <option value="influence">Most Followers</option>
                            <option value="recent">Recently Followed</option>
                        </select>
                    </div>
                    <div style="margin-left:16px">
                        <div>Filter</div>
                        <input id="tags" spellcheck="false" style="width:260px" type="text" placeholder="Twitter bio tags eg. health love dad">
                    </div>
                    <div style="margin-left:16px">
                        <div>Send Limit</div>
                        <input id="sendLimit" style="width:40px; margin-right:8px" type="text" placeholder="" value="1">
                    </div>
                    <div style="margin-left: 16px; flex-grow:1"><input style="margin-left:0" id="sandboxCheckbox" type="checkbox" checked>Sandbox<br/><button id="sendButton" style="width:100%">Send To 1 Follower</button></div>
                </div>
                <br/>
                <div id="waitingMessage"></div>
            </div>
            <div class="followerHeaderRow">
                <div class="followerIcon">&nbsp</div>
                <div class="followerName">Name</div>
                <div class="followerScreenName">Twitter Handle</div>
                <div class="followerFollowersCount">Followers</div>
                <div class="followerContacted">Contacted</div>
                <div style="margin-left:auto; padding-right:4px; width:130px; text-align:right"><button id="toggleContactedButton">Show Contacted</button></div>
            </div>
            <div id="results"></div>
        `;
            em.innerHTML = html;
            this.containerElement = em;
            this.sortElement = em.querySelector('#sortSelect');
            this.tagsElement = em.querySelector('#tags');
            this.messageElement = em.querySelector('#message');
            this.sandboxCheckbox = em.querySelector('#sandboxCheckbox');
            this.waitingMessage = em.querySelector('#waitingMessage');
            this.toggleContactedButton = em.querySelector('#toggleContactedButton');
            this.sendButton = em.querySelector('#sendButton');
            this.sendLimit = em.querySelector('#sendLimit');
            this.resultsDiv = em.querySelector('#results');
            this.MapEvent(em, "sortSelect", "change", this.SortChanged);
            this.MapEvent(em, "tags", "input", this.TagsChanged);
            this.MapEvent(em, "sendLimit", "input", this.SendLimitChanged);
            this.MapEvent(em, "message", "change", this.MessageChanged);
            this.MapEvent(em, "sandboxCheckbox", "change", this.SandboxCheckboxChanged);
            this.MapEvent(em, 'toggleContactedButton', 'click', this.ToggleContacted);
            this.MapEvent(em, "sendButton", "click", this.RunCampaign);
            this.LoadUIStateFromLocalStorage();
            /////////////////
            //sign up to handle message campaign stuff
            ////////////////
            RPC.SetHandler(ClientApi.NotifyMessageCampaignStartedCall, async (c) => {
                this.campaignRunning = true;
                return { success: true };
            });
            RPC.SetHandler(ClientApi.NotifyMessageCampaignStoppedCall, async (c) => {
                this.sendButton.disabled = false;
                this.campaignRunning = false;
                setTimeout(() => {
                    //now that the campaign is over we should require to be sure we're displaying things accurately -
                    //and also, we need to refill our 'extraRows' buffer so we have rows to fill in on the bottom
                    //when more messages are sent
                    this.RunQuery();
                    //we delay by the row dletion time so that the query doesnt happen until the
                    //last animation is finished
                }, this.rowDeletionAnimationTime);
                return { success: true };
            });
            RPC.SetHandler(ClientApi.NotifyMessageCampaignWaitingCall, async (c) => {
                this.waitingMessage.innerHTML =
                    `<div>
                    <div style="display:flex; align-items:center">
                        <div style="display:inline-block; margin-right: 4px; width:16px; height:16px; border-radius:20px; background-color:#F00"></div>
                        <span style="position:relative; top:1px">Sending limit reached, attempting next send in <span id="timeLeft"></span></span>
                    </div>
                </div><br/>`;
                //count down the time..
                let timeLeftSpan = this.waitingMessage.querySelector('#timeLeft');
                let updateTimeShown = () => {
                    let millisLeft = c.args.estimatedSendDate - new Date().getTime();
                    let millisPerHour = 1000 * 60 * 60;
                    let millisPerMinute = 1000 * 60;
                    let str = '';
                    let hours = millisLeft / millisPerHour;
                    let minutes = millisLeft / millisPerMinute;
                    let seconds = Math.floor(millisLeft / 1000);
                    if (hours > 1) {
                        str = `${hours.toFixed(1)} hours`;
                    }
                    else if (minutes > 1) {
                        str = `${minutes.toFixed(1)} minutes`;
                    }
                    else {
                        str = `${seconds} seconds`;
                    }
                    timeLeftSpan.innerHTML = str;
                    if (seconds <= 0)
                        return false;
                    else
                        return true;
                };
                if (updateTimeShown()) {
                    let interval = setInterval(() => {
                        if (!updateTimeShown())
                            clearInterval(interval);
                    }, 1000);
                }
                return { success: true };
            });
            RPC.SetHandler(ClientApi.NotifyMessageSentCall, async (c) => {
                //clear any waiting message that was previously displayed
                this.waitingMessage.innerHTML = '';
                //updated the Contacted column for this user to 'Yes'
                let updateContactedElement = em.querySelector(`#contacted-${c.args.recipientScreenName}`);
                if (updateContactedElement)
                    updateContactedElement.innerHTML = 'Yes';
                if (!this.contactedVisible) {
                    //make their row disappear
                    //animate the rows disappearance?
                    let updateContactedRow = em.querySelector(`#row-${c.args.recipientScreenName}`);
                    if (updateContactedRow) {
                        updateContactedRow.style.opacity = '0';
                        updateContactedRow.style.maxHeight = '0px';
                        setTimeout(() => {
                            this.resultsDiv.removeChild(updateContactedRow);
                        }, this.rowDeletionAnimationTime);
                        if (this.nextExtraRowToAppear < this.extraRows.length) {
                            let e = this.extraRows[this.nextExtraRowToAppear];
                            if (e) {
                                //move the next row out of the extra row and to the bottom of the visible resultsDiv
                                this.resultsDiv.appendChild(e);
                                //clear our reference from the extraRows array
                                this.extraRows[this.nextExtraRowToAppear] = null;
                                this.nextExtraRowToAppear++;
                            }
                        }
                    }
                }
                return { success: true };
            });
        }
        async RenderCleanup() {
            //dont need these notifications anymore
            RPC.SetHandler(ClientApi.NotifyMessageCampaignStartedCall, null);
            RPC.SetHandler(ClientApi.NotifyMessageCampaignStoppedCall, null);
            RPC.SetHandler(ClientApi.NotifyMessageCampaignWaitingCall, null);
            RPC.SetHandler(ClientApi.NotifyMessageSentCall, null);
        }
    }
    exports.QueryComponent = QueryComponent;
});
define("Renderer/HomePage", ["require", "exports", "Shared/ServerApi", "Renderer/DOMComponent", "Renderer/FollowerCacheComponent", "Renderer/QueryComponent"], function (require, exports, ServerApi, DOMComponent_js_5, FollowerCacheComponent_js_1, QueryComponent_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class HomePage extends DOMComponent_js_5.DOMComponent {
        constructor() {
            super(...arguments);
            this.FollowerCacheComponent = new FollowerCacheComponent_js_1.FollowerCacheComponent(this);
            this.queryComponent = new QueryComponent_js_1.QueryComponent(this);
            this.userLogin = null;
            this.promoElement = null;
            this.ClosePromo = () => {
                this.promoElement.style.display = 'none';
                window.localStorage.setItem('promoHidden', "1");
            };
        }
        async Render(em) {
            //make sure we have a valid / current login of a current user
            let userLoginResponse = await ServerApi.GetUserLogin();
            //if they're not logged in, redirect to the login page
            if (!userLoginResponse.userLogin) {
                this.GetSite().RouteTo("/login");
                return;
            }
            this.userLogin = userLoginResponse.userLogin;
            let screen_name = userLoginResponse.userLogin.screen_name;
            let link = 'https://flybirdy.herokuapp.com';
            let promoHtml = '';
            let promoHidden = true;
            //if (window.localStorage.getItem('promoHidden')!=="1")
            {
                let onePx = 1.0 / window.devicePixelRatio;
                promoHidden = false;
                promoHtml =
                    `<div id="promo">
                <div style="display:flex; align-items:center;  padding:12px; border:${onePx}px solid #000">
                    <div>Create a sign up page for your newsletter at <a href="${link}" target="_blank">${link}</a></div>
                    <div id="closePromo" style="cursor:pointer; margin-left: auto; display:flex; justify-content:center; align-items: center; border-radius:28px; height:28px; width:28px; background-color: #deedff">X</div>
                </div><br/>
            </div>`;
            }
            //by default, the query UI is hidden until the FollowerCacheComponent determines
            //whether there is a valid / complete cache in the DB. when there is, it will show the
            //query interface
            var html = `
            <div style="display:flex; justify-content:center;align-items:center">
                <div style="width:112px;"><img style="width:100%;height:auto" src="logo.png"></div>
                <div style="color: #2d5074;font-size: 21px; margin-top: 10px; margin-left: -13px;">Flybird</div>
            </div>
            <div style="display:flex; justify-content:center">
            <div style="min-width:700px">
                <br/>
                Hello, @${screen_name}!<br/><br/>
                <div id="cacheStatus"></div><br/>
                ${promoHtml}
                <div style="display:none" id="query"></div>
            </div>`;
            em.innerHTML = html;
            this.FollowerCacheComponent.Render(em.querySelector('#cacheStatus'));
            this.queryComponent.Render(em.querySelector('#query'));
            if (!promoHidden) {
                this.MapEvent(em, "closePromo", "click", this.ClosePromo);
                this.promoElement = em.querySelector("#promo");
            }
        }
        async RenderCleanup() {
            this.FollowerCacheComponent.RenderCleanup();
            this.queryComponent.RenderCleanup();
        }
    }
    exports.HomePage = HomePage;
});
define("Renderer/LoginPage", ["require", "exports", "Shared/ServerApi", "Renderer/DOMComponent"], function (require, exports, ServerApi, DOMComponent_js_6) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class LoginPage extends DOMComponent_js_6.DOMComponent {
        constructor() {
            super(...arguments);
            this.ckey = null;
            this.csec = null;
            this.Login = async () => {
                let args = {
                    appAuth: {
                        consumer_key: this.ckey.value,
                        consumer_secret: this.csec.value
                    },
                    saveUserAuth: true
                };
                let result = await ServerApi.Login(args);
                if (!result.userLogin) {
                    console.error(JSON.stringify(result));
                    if (result.errorMessage)
                        alert(`Sorry, we're having trouble logging you in. ${result.errorMessage}`);
                    return;
                }
                this.GetSite().RouteTo("/"); //ok we're logged in go home
            };
        }
        async Render(em) {
            let link = "https://developer.twitter.com/apps";
            let fw = 512 / window.devicePixelRatio;
            let fh = 420 / window.devicePixelRatio;
            let tw = 40 / window.devicePixelRatio;
            let th = 34 / window.devicePixelRatio;
            var html = `<br/>
            <div style="position:fixed; left:0; top:0; width:100vw; height:100vh; display:flex; background-color: #dce3e9">
            <div style="margin:auto; border-radius: 6px; box-shadow: #bcbcbc 0px 0px 11px; padding: 30px 34px 30px 34px; background-color: #fff">
                <div style="display:flex; justify-content:center; align-items:center">
                    <img style="width:${fw}px; height:${fh}px" src="logo.png">
                    <span class="logoSpan">Flybird</span>
                </div>
                <div style="display:flex; justify-content:center">
                <div style="text-align:center">
                    <br/>
                    Want to boost subscriptions to your newsletter? Let's get started!<br/><br/><br/>
                    To sign in, you will need to provide Twitter App API keys.<br /><br/>You can obtain keys from <a href="${link}" target="_blank">${link}</a>.<br /><Br/><br/>
                    <div style="display:inline-block; width:130px; text-align:right">Consumer Key</div>  <input type="text" style="width:300px" id="consumer_key" ><br /><br/>
                    <div style="display:inline-block; width:130px; text-align:right">Consumer Secret</div> <input type="text" style="width:300px" id="consumer_secret" ><br /><br/>
                    <Br />
                    <div class="divButton" id="login" style="padding: 9px 15px; box-shadow: 0 0 2px #000">
                        <div style="display:flex; align-items:center">
                            <img src="twitter-button.png" style="margin-right: 6px; width:${tw}px; height:${th}px"><span>Sign in with Twitter</span>
                        </div>
                    </div>
                </div>
                </div>
            </div>
            </div>`;
            em.innerHTML = html;
            this.MapEvent(em, "login", "click", this.Login);
            this.ckey = em.querySelector('#consumer_key');
            this.csec = em.querySelector('#consumer_secret');
            //grab the current Twitter app API keys (if they have been saved to disk.. would be there if any
            //previous login worked, or partially worked with good app keys but perhaps a bad user password)
            try {
                let getAppAuthResult = await ServerApi.GetAppAuth();
                if (getAppAuthResult.appAuth) {
                    this.ckey.value = getAppAuthResult.appAuth.consumer_key;
                    this.csec.value = getAppAuthResult.appAuth.consumer_secret;
                }
            }
            catch (err) {
                console.error(err);
            }
        }
    }
    exports.LoginPage = LoginPage;
});
define("Renderer/Site", ["require", "exports", "Shared/RPC", "Shared/ServerApi", "Shared/ElectronIPC", "Renderer/DOMSite", "Renderer/HomePage", "Renderer/LoginPage"], function (require, exports, RPC, ServerApi, ElectronIPC_js_1, DOMSite_js_1, HomePage_js_1, LoginPage_js_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    class Site extends DOMSite_js_1.DOMSite {
        constructor() {
            super();
            if (Site.g_site) {
                console.log("Site.g_site already exists, should never have multiple Site instantiations");
                return;
            }
            Site.g_site = this;
            this.routerContentElement = null;
            var map = {
                "/": HomePage_js_1.HomePage,
                "/login": LoginPage_js_1.LoginPage,
            };
            this.InitRoutes(map);
            window.addEventListener('popstate', (event) => {
                //console.log(inspect(event));
                this.RouteTo(event.state.path, { pushState: false });
            }, false);
        }
        static GetSite() {
            return Site.g_site;
        }
        GetSite() {
            return this;
        }
        GetRouteContentElement() {
            return this.routerContentElement;
        }
        async Render(em) {
            try {
                //apply the title bar and router content div
                em.innerHTML = `
                <div id="routerContentId"></div>`;
                this.routerContentElement = em.querySelector('#routerContentId');
                //first make sure our session cookie is valid and we're logged in
                let userLoginResponse = await ServerApi.GetUserLogin();
                //if they're not logged in, we either tell them that they're not authorized, or show them
                //the login page where they can try to login
                if (!userLoginResponse.userLogin) {
                    //render the login page
                    this.RouteTo("/login");
                    return;
                }
                //default route, go to /home            
                await this.RouteTo("/");
            }
            catch (err) {
                console.log("error");
            }
        }
        async onload() {
            RPC.SetTransport(new ElectronIPC_js_1.ElectronIPC());
            this.Render(document.getElementById("site"));
        }
    }
    Site.g_site = null;
    exports.Site = Site;
});
//# sourceMappingURL=Renderer.js.map