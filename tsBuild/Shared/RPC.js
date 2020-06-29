"use strict";
//classes and types used for remote procedure calls.. calls that have to cross some kind of boundary
//whether it be inter process communication, websocket communication, etc
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
//# sourceMappingURL=RPC.js.map