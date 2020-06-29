import * as RPC from './RPC';

////////////////////
//Client API
//(methods the server can call on the client
///////////////////////

//////////////////////////
//Notify Message Sent
/////////////////////////

export function NotifyMessageSent(args:NotifyMessageSentCall["args"])
{
    new NotifyMessageSentCall(args).CallNoResponse();
}

export class NotifyMessageSentCall extends RPC.Call
{
    method = "NotifyMessageSent"

    constructor(args:NotifyMessageSentCall["args"])
    {
        super();
        this.args = args;
    }

    args: {
        campaignId: string,

        //the person this event is notifying about
        recipientScreenName: string,
        recipientDate: number, //should be convertible to Date via new Date(date)

        //the total we've sent so far
        totalSent:number,
        //how many more remain to be sent
        totalRemaining:number
    }
}

/////////////////
//Notify Message Campaign Started / Stopped / Waiting
///////////////////

//Started
export function NotifyMessageCampaignStarted()
{
    new NotifyMessageCampaignStartedCall().CallNoResponse();
}

export class NotifyMessageCampaignStartedCall extends RPC.Call
{
    method = "NotifyMessageCampaignStarted"
}

//Stopped
export function NotifyMessageCampaignStopped()
{
    new NotifyMessageCampaignStoppedCall().CallNoResponse();
}

export class NotifyMessageCampaignStoppedCall extends RPC.Call
{
    method = "NotifyMessageCampaignStopped"
}

//Waiting
export function NotifyMessageCampaignWaiting(args:NotifyMessageCampaignWaitingCall["args"])
{
    new NotifyMessageCampaignWaitingCall(args).CallNoResponse();
}

export enum SendDelayReason
{
    NoDelay = "NoDelay",
    Spread = "Spread",
    RateLimit = "RateLimit"
}

export class NotifyMessageCampaignWaitingCall extends RPC.Call
{
    method = "NotifyMessageCampaignWaiting"

    constructor(args:NotifyMessageCampaignWaitingCall["args"])
    {
        super();
        this.args = args;
    }

    args: {
        campaignId: string,

        //the person this event is notifying about
        nextRecipientScreenName: string,
        estimatedSendDate: number, //should be convertible to Date via new Date(date)
        sendDelayReason:SendDelayReason,

        //the total we've sent so far
        totalSent:number,
        //how many more remain to be sent
        totalRemaining:number
    }

}