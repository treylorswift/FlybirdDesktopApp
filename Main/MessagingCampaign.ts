import * as crypto from 'crypto'
import * as DB from 'better-sqlite3';
import * as MessageTemplate from '../Shared/MessageTemplate'

import {FollowerCacheQuery, FollowerCacheQueryResult} from '../shared/ServerApi'
import * as ClientApi from '../Shared/ClientApi';
import {SendDelayReason} from '../Shared/ClientApi';

import {TwitterUser, PermissionLevel} from './TwitterUser'
import {TwitterDB} from './TwitterFollowerDB'

import {DelaySeconds} from './Delay'
import {DelayMilliseconds} from './Delay'

//for some UI tests it can be useful to have a realistic delay imposed on sandbox sends
//let g_sandboxSendDelayMillis = 500;
let g_sandboxSendDelayMillis = 0;

export class MessagingCampaign
{
    message:string
    campaign_id:string
    sort:"influence" | "recent"
    scheduling:"burst" | "spread"
    dryRun:boolean
    count?:number
    filter?:
    {
        tags?:Array<string>
    }

    static fromJSON(json:any):MessagingCampaign
    {
        var campaign = new MessagingCampaign();

        //must have valid message content
        if (!json.message)
        {
            console.log("MessagingCampaign - No message specified, can't continue");
            return null;
        }
        else
        if (typeof(json.message)!=='string')
        {
            console.log("MessagingCampaign - Invalid message specified: " + JSON.stringify(json.message));
            return null;
        }
        campaign.message = json.message;

        //if no campaign_id specified, generate it from the hash of the
        //message content
        campaign.campaign_id = json.campaign_id;
        if (!campaign.campaign_id)
            campaign.campaign_id = crypto.createHash("sha256").update(campaign.message).digest("hex");
        else
        if (typeof(campaign.campaign_id)==='number')
            campaign.campaign_id = (campaign.campaign_id as number).toString();
        else
        if (typeof(campaign.campaign_id)!=='string')
        {
            //any other kind of campaign id in the json is invalid
            console.log("MessagingCampaign - Invalid campaign_id specified: " + JSON.stringify(campaign.campaign_id));
            return null;
        }

        //make sure count, if specified, is a number, and if it is a number, make sure it is >0
        campaign.count = json.count;
        if (campaign.count===undefined) //force to null
            campaign.count = null;

        if (campaign.count!==null)
        {
            if (typeof(campaign.count)!=='number')
            {
                console.log("MessagingCampaign - Invalid count specified: " + JSON.stringify(campaign.count));
                return null;
            }
            if (campaign.count<=0)
            {
                console.log("MessagingCampaign - campaign.count is 0, rejecting campaign");
                return null;
            }
        }

        //make sure dryRun, if specified, is a boolean
        if (json.dryRun && typeof(json.dryRun)!=='boolean')
        {
            console.log("MessagingCampaign - Invalid dryRun specified: " + JSON.stringify(json.dryRun));
            return null;
        }
        campaign.dryRun = (json.dryRun===true);

        //make sure 'sort', if specified, is a string and is either 'influence' or 'recent'
        campaign.sort = json.sort;
        if (!campaign.sort)
            campaign.sort = "influence";
        else
        if (typeof(campaign.sort)!=='string' ||
            (campaign.sort!=='influence' && campaign.sort!=='recent'))
        {
            console.log("MessagingCampaign - Invalid sort specified: " + JSON.stringify(campaign.sort));
            return null;
        }

        //make sure 'scheduling', if specified, is a string and is either 'burst' or 'spread'
        campaign.scheduling = json.scheduling;
        if (!campaign.scheduling)
            campaign.scheduling = "burst";
        else
        if (typeof(campaign.scheduling)!=='string' ||
            (campaign.scheduling!=='burst' && campaign.scheduling!=='spread'))
        {
            console.log("MessagingCampaign - Invalid scheduling specified: " + JSON.stringify(campaign.scheduling));
            return null;
        }

        //make sure filter, if specified, is an object
        campaign.filter = json.filter;
        if (campaign.filter && typeof(campaign.filter)!=='object')
        {
            console.log("MessagingCampaign - Invalid filter specified: " + JSON.stringify(campaign.filter));
            return null;
        }

        if (campaign.filter)
        {
            //make sure if filter tags are specified, they are an array
            campaign.filter.tags = json.filter.tags;
            if (campaign.filter.tags && !Array.isArray(campaign.filter.tags))
            {
                console.log("MessagingCampaign - Invalid filter tags specified: " + JSON.stringify(campaign.filter.tags));
                return null;
            }

            if (campaign.filter.tags)
            {
                //make sure each tag is a string. numbers are ok, but are converted to string
                for (var i=0; i<campaign.filter.tags.length; i++)
                {
                    var tag = campaign.filter.tags[i];
                    if (typeof(tag)!=='string')
                    {
                        if (typeof(tag)==='number')
                            campaign.filter.tags[i] = (tag as number).toString();
                        else
                        {
                            console.log("MessagingCampaign - Invalid filter tag specified: " + JSON.stringify(tag));
                            return null;
                        }
                    }
                }
            }
        }

        //whew. campaign is valid

        return campaign;
    }
}

export class MessagingCampaignManager
{
    private user:TwitterUser;

    //@ts-ignore
    private twitter:Twitter;

    private campaign:MessagingCampaign;

    private totalSent:number;
    private messageHistory:MessageHistory;

    //@ts-ignore
    constructor(user:TwitterUser, campaign:MessagingCampaign)
    {
        this.user = user;
        this.twitter = user.GetTwitterApi();
        this.campaign = campaign;

        this.totalSent = 0;
        this.messageHistory = null;
    }

    private SendMessage = async (recipient:FollowerCacheQueryResult):Promise<boolean>=>
    {
        //respect the campaign's dryRun setting
        let actuallySendMessage = this.campaign.dryRun!==true;
        
        //loop until we're actually able to send without any response error
        while (1)
        {
            try
            {
                //expand any templated variables that may be in the message - only one handled/expected is
                //"followerTwitterHandle"
                let message;
                try
                {
                    message = MessageTemplate.Expand(this.campaign.message, recipient.screenName);
                }
                catch (err)
                {
                    //expansion failed
                    return false;
                }
                
                if (actuallySendMessage)
                {
                    let params = 
                    {
                        event:
                        {
                            type: 'message_create',
                            message_create:
                            {
                                target: { recipient_id: recipient.idStr },
                                message_data: { text: message }
                            }
                        }
                    }

                    let response = await this.twitter.post('direct_messages/events/new', params);
                }
                else
                {
                    if (g_sandboxSendDelayMillis)
                        await DelayMilliseconds(g_sandboxSendDelayMillis);//simulate a send delay
                }

                //no response error means the send succeeded, add to the history and save it
                var curDate = new Date();

                this.messageHistory.StoreMessageEvent({
                    campaign_id:this.campaign.campaign_id,
                    recipient:recipient.idStr,
                    time:curDate
                });

                this.totalSent++;
                console.log(`Sent message #${this.totalSent} to ${recipient.screenName}`);

                //notify the client of the send
                ClientApi.NotifyMessageSent({
                    campaignId:this.campaign.campaign_id,
                    recipientScreenName:recipient.screenName,
                    recipientDate:curDate.getTime(),
                    totalRemaining:0,
                    totalSent:this.totalSent
                });

                return true;
            }
            catch (err)
            {
                //detect read-only application error - we shouldn't get this error because we should have checked
                //permissions by now and forced ourselves into a dry run mode.. but just in case, catch the error so
                //we dont needlessly retry over and over
                if (typeof(err.error)==='string' && (err.error as string).startsWith('Read-only'))
                {
                    console.log(`Send to ${recipient.screenName} denied, app access is read-only`);
                    return false;
                }
                else
                //handle going over the rate limit..
                if (err && Array.isArray(err.errors) && err.errors[0] && err.errors[0].code===88)
                {
                    console.log('Unexpectedly hit api rate limit, waiting 1 minute before attempting again');

                    let secsToDelay = 60;
                    //notify the client of the delay
                    ClientApi.NotifyMessageCampaignWaiting({
                        campaignId:this.campaign.campaign_id,
                        nextRecipientScreenName:recipient.screenName,
                        estimatedSendDate:new Date().getTime() + secsToDelay*1000,
                        sendDelayReason:ClientApi.SendDelayReason.RateLimit,
                        totalRemaining:0,
                        totalSent:this.totalSent
                    });

                    await DelaySeconds(secsToDelay);
                }
                else
                //handle rejected sends..
                if (err && Array.isArray(err.errors) && err.errors[0] && err.errors[0].code===349)
                {
                    console.log(`Send to ${recipient.screenName} was denied, they may have unfollowed or blocked you.`);
                    return false;
                }
                else
                {
                    console.log(`Unexpected Twitter API response error, not sending to ${recipient.screenName}:`);
                    console.error(err);
                    return false;
                }
            }
        }
    }

    async Run()
    {
        console.log("Beginning campaign: " + this.campaign.campaign_id);

        //if the campaign is a live campaign and we are lacking the necessary permissions, issue a warning and
        //force execution to be dryRun
        if (this.campaign.dryRun!==true && this.user.GetPermissionLevel()!==PermissionLevel.ReadWriteDirectMessages)
        {
            this.campaign.dryRun = true;
            console.log(`*** App permissions do not allow direct messages, campaign will be forced to execute as a dry run ***`);
            console.log(`*** Progress will be displayed but messages will not actually be sent ***`);
            console.log(`*** Visit https://apps.twitter.com and update permissions in order to send direct messages ***`);
        }
        else
        if (this.campaign.dryRun===true)
            console.log("*** campaign.dryRun=true, progress will be displayed but messages will not actually be sent ***");

        console.log("Campaign message: " + this.campaign.message);
        
        //we query for 1000 results at a time from the DB and move through them one by one
        //until we're done
        let maxQuerySizePerLoop = 1000;

        //setup message history for this campaign
        this.messageHistory = new MessageHistory(this.campaign);

        let tags = null;
        if (this.campaign.filter && this.campaign.filter.tags)
            tags = this.campaign.filter.tags;
        
        //the campaign may or may not specify a 'count' to limit how many followers
        //get contacted. if it doesn't specify a count, we will attempt to go all the way through
        //the entire follower list
        let limitByCount:boolean = false;
        let count:number = 0;

        if (this.campaign.count!==null)
        {
            limitByCount = true;
            count = this.campaign.count;
        }

        let firstQuery = true;

        while (1)
        {            
            let queryLimit = maxQuerySizePerLoop;

            //dont query more than count (if specified) asks for..
            if (limitByCount && queryLimit>count)
                queryLimit = count;
           
            //note that no offset is used because as messages are sent,
            //the query itsef will, upon the next invocation, not include
            //the people who were sent messages before
            let q:FollowerCacheQuery = {
                campaignId:this.campaign.campaign_id,
                includeContacted:false,
                sort:this.campaign.sort,
                tags:tags,
                limit:queryLimit,
                offset:0,
                useDryRunMessageHistory:this.campaign.dryRun
            }

            try
            {
                let results = await this.user.GetFollowerCache().Query(q);
                if (results.length===0)
                {
                    //no more left to send, we're done
                    if (firstQuery)
                        console.log("Query returned no eligible recipients, no messages to send.");
                    return;
                }
                firstQuery = false;

                for (var i=0; i<results.length; i++)
                {
                    //figure out when it is safe to start sending the next message
                    //max of 1000 can be sent in 24 hour window
                    //campaign scheduling may dictate a more evenly spread distribution of sends
                    var curDate = new Date();
                    var delay = this.messageHistory.CalcMillisToWaitUntilNextSend(this.campaign);
                    if (delay.millisToWait>0)
                    {
                        var sendDate = new Date(curDate.getTime() + delay.millisToWait);
                        if (delay.reason===SendDelayReason.RateLimit)
                        {
                            console.log(`Hit Twitter Direct Message API Rate Limit at ${curDate.toString()}`);
                            console.log(`                     sending next message at ${sendDate.toString()}`);
                        }
                        else
                        {
                            console.log(`Spread scheduling will send next message at ${sendDate.toString()}`);
                        }

                        //notify the client of the delay
                        ClientApi.NotifyMessageCampaignWaiting({
                            campaignId:this.campaign.campaign_id,
                            nextRecipientScreenName:results[i].screenName,
                            estimatedSendDate:sendDate.getTime(),
                            sendDelayReason:delay.reason,
                            totalRemaining:0,
                            totalSent:this.totalSent
                        });

                        //wait for delay
                        await DelayMilliseconds(delay.millisToWait);
                    }

                    var sendOK = await this.SendMessage(results[i]);
                    if (!sendOK)
                    {
                        //should probably notify client of send failure
                        //error will have been printed to console
                    }
                }
                

                //ok that batch is done, check against the count limitation (if it exists)
                if (this.campaign.count!==undefined && this.campaign.count!==null)
                {
                    this.campaign.count -= results.length;
                    if (this.campaign.count<=0)
                    {
                        //we're done
                        return;
                    }
                }
            }
            catch (err)
            {
                console.log('Error in GetFollowerCache().Query(), aborting');
                console.error(err);
                return;
            }
        }
    }
}

export type MessageEvent = {campaign_id:string,recipient:string, time:Date};

type SendDelayInfo = {millisToWait:number,reason:SendDelayReason}

export class MessageHistory
{
    twitterDB:TwitterDB;
    db:DB;

    campaign:MessagingCampaign;
    tableName:string;

    //we keep the most recently sent 1000 messages in memory because we need to refer to those
    //in order to properly schedule sends
    events:Array<MessageEvent>;

    constructor(campaign:MessagingCampaign)
    {
        this.campaign = campaign;

        this.twitterDB = new TwitterDB();
        this.twitterDB.Init();
        this.db = this.twitterDB.GetDB();

        this.events = new Array<MessageEvent>();

        this.tableName = 'TwitterMessageHistory';
        if (campaign.dryRun===true)
            this.tableName = 'TwitterDryRunMessageHistory';
        
        //get the most recent 1000 messages sent
        try
        {
            //get the most recent 1000 messages, they'll be ordered with newest messages at the front of the array
            let initCacheCmd = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE campaign_id=? ORDER BY date DESC LIMIT 1000`);
            let results = initCacheCmd.all([this.campaign.campaign_id]);

            //we want our event list is to be ordered oldest (at the front of the array) to newest (at the end of the array)
            //as messages get sent, they are .pushed onto the end. so we need to reverse the rows received from the DB
            for (var i=0; i<results.length; i++)
            {
                let r = results[results.length - i - 1];

                this.events.push({campaign_id:r.campaign_id, recipient:r.id_str, time:new Date(r.date)});
            }
        }
        catch (err)
        {
            console.log("Error initializing MessageHistory in-mem cache");
            console.error(err);
        }
    }

    StoreMessageEvent(e:MessageEvent):boolean
    {
        try
        {
            if (e.campaign_id!==this.campaign.campaign_id)
            {
                console.log("StoreMessageEvent - incorrect campaign id");
                return false;
            }

            let storeCmd = this.db.prepare(`INSERT INTO ${this.tableName} VALUES(?,?,?)`);

            storeCmd.run([e.campaign_id, e.recipient, e.time.getTime()]);

            //store this into the in memory event cache
            this.events.push(e);

            //we dont need to keep more than 1000 events in memory
            if (this.events.length>=1001)
                this.events.shift();

            return true;
        }
        catch (err)
        {
            console.log("StoreMessageEvent error:");
            console.error(err);
            return false;
        }
    }

    //the time until next send is determined by
    //- history of messages sent thus far
    //- scheduling preference (burst or spread)
    //- twitter rate limit of 1000 messages per 24 hour period
    CalcMillisToWaitUntilNextSend(campaign:MessagingCampaign):SendDelayInfo
    {
        var curTime = new Date();
        let millisIn24Hours = 1000*60*60*24;

        //in initial cases there is no need to wait and we can send with no delay
        let minimumWait = 0;
        let minimumDelayReason = SendDelayReason.NoDelay;

        //spread scheduling can impose a delay after the very first sent message.
        //it will increase the minimumWait and set the minimumDelayReason appropriately (if necessary)
        if (campaign.scheduling==="spread")
        {
            //we want to evenly distribute 1000 messages over a 24 hour period
            let minimumSendInterval = millisIn24Hours / 1000;

            //spread scheduling dictates that the next send should occur minimumSendInterval after the most recently sent message.
            if (this.events.length>0)
            {
                let mostRecentSend = this.events[this.events.length-1].time;
                let timeToSend = new Date(mostRecentSend.getTime() + minimumSendInterval);

                //how much time remains between now and the time at which spread scheduling dictates we should send?
                minimumWait = timeToSend.getTime() - curTime.getTime();
                if (minimumWait>0)
                {
                    //impose minimum delay due to spread scheduling
                    minimumDelayReason = SendDelayReason.Spread;
                }
                else
                {
                    //we're already past the minimum send interval, spread scheduling imposes no additional minimum wait
                    minimumWait = 0;
                }
            }
        }

        //if we haven't yet sent 1000 messages, twitter api rate limits dont apply so we can 
        //we know we can sent the next message without further delay
        if (this.events.length<1000)
            return {millisToWait:minimumWait,reason:minimumDelayReason};

        //we HAVE sent 1000 messages... 

        //look back 1000 messages into the past. when did we send that one?
        //was it more than 24 hours ago? if so, rate limits dont apply and we can send without
        //further delay
        let indexOf1000thMessage = this.events.length - 1000;
        let event = this.events[indexOf1000thMessage];

        var twentyTwentyTwentyFourHoursAgooo = new Date(curTime.getTime() - millisIn24Hours);

        //if the 1000th message in the past is more than 24 hours old, we can send without further delay
        if (event.time.getTime() < twentyTwentyTwentyFourHoursAgooo.getTime())
            return {millisToWait:minimumWait,reason:minimumDelayReason};

        //ok so the 1000th message is within the past 24 hours. the time at which
        //we will be able to send is 24 hours after that message.
        let timeToSend = new Date(event.time.getTime() + millisIn24Hours);

        //how much time remains between now and the time at which api rate limits dictate we can send?
        let timeToWait = timeToSend.getTime() - curTime.getTime();
        if (timeToWait<0)
        {
            console.log(`Unexpected error calculating timeToWait, curTime: ${curTime} - timeToSend: ${timeToSend}`);
            timeToWait = 0;
        }

        //reconcile timeToWait against the minimumWait calculated above (possibly by spread scheduling)
        //its possible api rate limits may not dictate the delay at this point but if api rate limit
        //requires us to wait longer than the minimumWait calculated above, we must wait for the longer
        //timeToWait, and note that the reason is due to api rate limits
        if (timeToWait>minimumWait)
        {
            return {millisToWait:timeToWait, reason:SendDelayReason.RateLimit}
        }
        else
        {
            //api rate limits do not require any delay beyond the minimum already calculated so we just
            //return the minimum delay as it was already calculated
            return {millisToWait:minimumWait,reason:minimumDelayReason};
        }
    }

}
