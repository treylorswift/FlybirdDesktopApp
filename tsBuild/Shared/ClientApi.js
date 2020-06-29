"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RPC = require("./RPC");
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
//# sourceMappingURL=ClientApi.js.map