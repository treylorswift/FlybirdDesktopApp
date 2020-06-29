import * as RPC from "../Shared/RPC.js"
import * as ServerApi from "../Shared/ServerApi.js"
import * as ClientApi from "../Shared/ClientApi.js"
import * as MessageTemplate from "../Shared/MessageTemplate.js"

import { DOMComponent } from "./DOMComponent.js"
import { HomePage } from "./HomePage.js"

//only support a single / default messaging campaign from this UI currently
let g_campaignId = 'default'

export class QueryComponent extends DOMComponent
{
    containerElement:HTMLElement = null;
    resultsDiv:HTMLElement = null;
    sortElement:HTMLInputElement = null;
    tagsElement:HTMLInputElement = null;
    messageElement:HTMLInputElement = null;
    sendButton:HTMLButtonElement = null;
    sendLimit:HTMLInputElement = null;
    sandboxCheckbox:HTMLInputElement = null;
    waitingMessage:HTMLElement = null;

    //how many query results we will show on screen
    numResultsToDisplay:number = 50;

    //we intentionally query for more results than we can display on screen so
    //that when sending messages, we have the necessary information needed to
    //fill in at the bottom of the list as entries dissappear from the top
    extraRows:Array<HTMLElement> = null;
    nextExtraRowToAppear:number = 0;

    //1.5secs is the full animation time for a row deletion.
    //(many rows might be disappearing at once though)
    rowDeletionAnimationTime:number = 1500;

    //if they update the query ui before a previous query has finished, we wait
    //for the previous query to finish.
    //we keep a queue of 1 query (representing the most recent query attempt) to run
    //after the completion of the previous query.
    queryRunning:boolean = false;
    deferredQuery:ServerApi.FollowerCacheQuery = null;
    parent:HomePage = null;

    //by default we show only followers who we haven't contacted
    contactedVisible:boolean = false;
    toggleContactedButton:HTMLElement = null;

    campaignRunning:boolean = false;
    
    constructor(parent:HomePage)
    {
        super(parent);
        this.parent = parent;
    }

    RunQuery = async ()=>
    {
        var sort = this.sortElement.value as ServerApi.MessagingCampaignSortType;
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

        let query = 
        {
            campaignId:g_campaignId,
            tags:tags,
            sort:sort,
            offset:0,
            limit:queryLimit,
            includeContacted:this.contactedVisible,
            useDryRunMessageHistory:this.sandboxCheckbox.checked
        }

        if (this.queryRunning)
        {
            this.deferredQuery = query;
            return;
        }


        this.queryRunning = true;
        //this loop exists to make sure that any queries queued
        //while processing this query get immediately executed when
        //this query finishes.
        while (1)
        {
            try
            {
                let results = await ServerApi.QueryFollowerCache(query);

                //display the results
                this.RenderResults(results);

                if (this.deferredQuery)
                {
                    //there was a query queued up while the previous query was processing.
                    //we should loop and run that query now
                    query = this.deferredQuery;
                    this.deferredQuery = null;
                }
                else
                {
                    //there is no deferred query to do, we can 
                    //break out of this loop
                    break;
                }
            }
            catch (err)
            {
                console.log("Error while processing query: " + JSON.stringify(query));
                console.error(err);
                break;
            }
        }
        this.queryRunning = false;

    }
    
    RenderResults(results:ServerApi.QueryFollowerCacheResponse)
    {
        //we query for more results than we are going to display so that
        //if a message send is initiated, we have extra entries to fill in
        //the bottom as they disappear from the top
        this.extraRows = new Array<HTMLElement>();
        this.nextExtraRowToAppear = 0;

        //remove all entries currently in the results div..
        this.resultsDiv.innerHTML = '';

        for (var i=0; i<results.followers.length; i++)
        {
            let f = results.followers[i];
            let imgUrl = f.profileImageUrl;
            if (!imgUrl)
                imgUrl = "https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png"
            
            let contactedString = 'No'
            if (results.followers[i].contactDate)
                contactedString = 'Yes'
                
            let rowHtml = 
               `<div class="followerRow" onclick="window.open('https://twitter.com/${f.screenName}', '_blank')">
                    <div class="followerIcon"><img class="followerIconImg" src="${imgUrl}"></div>
                    <div class="followerName">${f.name}</div>
                    <div class="followerScreenName">${f.screenName}</div>
                    <div class="followerFollowersCount">${f.followersCount}</div>
                    <div id="contacted-${f.screenName}" class="followerContacted">${contactedString}</div>
                </div>`

            //`<div id="row-${f.screenName}" class="followerRowDeleter">${rowHtml}</div>`;
            let rowDiv = document.createElement('div');
            rowDiv.id = `row-${f.screenName}`;
            rowDiv.className = "followerRowDeleter";
            rowDiv.innerHTML = rowHtml;

            if (i<this.numResultsToDisplay)
            {
                this.resultsDiv.appendChild(rowDiv);
            }
            else
            { 
                //these are the rows we wont display yet.. when they start sending messages,
                //they'll be added to the bottom of the resultsDiv as the ones on top
                //disappear
                //
                this.extraRows.push(rowDiv);
            }
        }
    }



    RunCampaign = async () =>
    {
        if (this.campaignRunning)
        {
            this.DisplayModalMessage("Sending in progress, please wait for it to finish.");
            return;
        }

        var sort = this.sortElement.value as ServerApi.MessagingCampaignSortType;
        let tags = this.tagsElement.value.split(' ');
        let count = this.GetSendCount();

        //test the expansion template (its gonna be called server side so better to
        //inform the user of errors before sending)
        let expansion:string = null;
        try
        {
            let followerTwitterHandle = 'TestHandle';
            expansion = MessageTemplate.Expand(this.messageElement.value, followerTwitterHandle);
        }
        catch (err)
        {
            this.DisplayModalMessage(`Error interpreting your message template:<br/><br/>${err.message}`);
            return;
        }
        
        let campaign:ServerApi.MessagingCampaign =
        {
            message:this.messageElement.value,
            campaign_id:g_campaignId,
            sort:sort,
            scheduling:"burst",
            dryRun:this.sandboxCheckbox.checked,
            count:count,
            filter:
            {
                tags:tags
            }
        }

        this.campaignRunning = true;
        this.sendButton.disabled = true;

        let startOK = await ServerApi.RunMessagingCampaign(campaign);
        if (startOK.success!==true)
        {
            this.DisplayModalMessage('Unable to start sending messages: ' + startOK.errorMessage);
            this.campaignRunning = false;
            return;
        }
    }

    //returns null if the send count field is empty/blank
    GetSendCount():number
    {
        if (this.sendLimit.value==='')
            return null;

        let count = 0;
        try
        {
            let count = parseInt(this.sendLimit.value);
            return count;
        }
        catch (err)
        {
            return null;
        }
    }

    SandboxCheckboxChanged = () =>
    {
        if (!this.sandboxCheckbox.checked)
        {
            this.DisplayModalMessage('<center>With "Sandbox" unchecked, clicking "Send Messages" will send real direct messages.<br/><br/>Be careful!</center>');
        }
        this.SaveUIStateToLocalStorage();
        this.RunQuery();
    }

    UpdateSendButtonText = () =>
    {
        let count = this.GetSendCount();
        if (count!==null)
        {
            let msg = `Send To ${count} Follower`;
            if (count>1)
                msg += 's';

            this.sendButton.innerHTML = msg;
        }
        else
            this.sendButton.innerHTML = `Send To All Followers`;
    }

    SendLimitChanged = () =>
    {
        this.UpdateSendButtonText();
        this.SaveUIStateToLocalStorage();
    }

    SortChanged = ()=>
    {
        this.SaveUIStateToLocalStorage();
        this.RunQuery();
    }

    TagsChanged = ()=>
    {
        this.SaveUIStateToLocalStorage();
        this.RunQuery();
    }

    MessageChanged = ()=>
    {
        this.SaveUIStateToLocalStorage();
    }

    UpdateContactedButton(showContacted:boolean)
    {
        if (showContacted===false)
        {
            this.toggleContactedButton.innerHTML = "Show Contacted"
        }
        else
        {
            this.toggleContactedButton.innerHTML = "Hide Contacted"
        }
    }

    ToggleContacted = ()=>
    {
        this.contactedVisible = !this.contactedVisible;
        this.UpdateContactedButton(this.contactedVisible);
        this.RunQuery();
        this.SaveUIStateToLocalStorage();
    }

    SaveUIStateToLocalStorage()
    {
        let uiState =
        {
            message:this.messageElement.value,
            sort:this.sortElement.value,
            sandbox:this.sandboxCheckbox.checked,
            sendLimit:this.sendLimit.value,
            tags:this.tagsElement.value,
            showContacted:this.contactedVisible
        }

        localStorage.setItem('uiState',JSON.stringify(uiState));
    }

    LoadUIStateFromLocalStorage()
    {
        try
        {
            let c = JSON.parse(localStorage.getItem('uiState'));

            try { this.messageElement.value = c.message; } catch (err) {}
            try { this.sortElement.value = c.sort; } catch (err) {}
            try { this.sandboxCheckbox.checked = c.sandbox; } catch (err) {}
            try { this.sendLimit.value = c.sendLimit; } catch (err) {}
            try { this.tagsElement.value = c.tags; } catch (err) {}
            try { this.contactedVisible = c.showContacted; } catch (err) {}

            this.UpdateContactedButton(this.contactedVisible);
            this.UpdateSendButtonText();
        }
        catch (err)
        {
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

    SetVisible(visible:boolean)
    {
        if (visible)
            this.containerElement.style.display = 'block';
        else
            this.containerElement.style.display = 'none';
    }

    GetDefaultMessage():string
    {
        return `Hey there, are you interested in receiving my newsletter?

You can sign up at https://flybirdy.herokuapp.com/${this.parent.userLogin.screen_name}?twRef=\${followerTwitterHandle}`;
    }

    async Render(em:HTMLElement)
    {
    
        let html = 
           `<div>
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
        this.MapEvent(em, 'toggleContactedButton', 'click',this.ToggleContacted);
        this.MapEvent(em, "sendButton", "click", this.RunCampaign);

        this.LoadUIStateFromLocalStorage();

        /////////////////
        //sign up to handle message campaign stuff
        ////////////////
        RPC.SetHandler(ClientApi.NotifyMessageCampaignStartedCall, async (c:ClientApi.NotifyMessageCampaignStartedCall):Promise<RPC.Response> =>
        {
            this.campaignRunning = true;
            return {success:true};
        });

        RPC.SetHandler(ClientApi.NotifyMessageCampaignStoppedCall, async (c:ClientApi.NotifyMessageCampaignStoppedCall):Promise<RPC.Response> =>
        {
            this.sendButton.disabled = false;
            this.campaignRunning = false;
        
            setTimeout(()=>
            {
                //now that the campaign is over we should require to be sure we're displaying things accurately -
                //and also, we need to refill our 'extraRows' buffer so we have rows to fill in on the bottom
                //when more messages are sent
                this.RunQuery();

                //we delay by the row dletion time so that the query doesnt happen until the
                //last animation is finished
            }, this.rowDeletionAnimationTime);

            return {success:true};
        });

        RPC.SetHandler(ClientApi.NotifyMessageCampaignWaitingCall, async (c:ClientApi.NotifyMessageCampaignWaitingCall):Promise<RPC.Response> =>
        {

            this.waitingMessage.innerHTML =
               `<div>
                    <div style="display:flex; align-items:center">
                        <div style="display:inline-block; margin-right: 4px; width:16px; height:16px; border-radius:20px; background-color:#F00"></div>
                        <span style="position:relative; top:1px">Sending limit reached, attempting next send in <span id="timeLeft"></span></span>
                    </div>
                </div><br/>`

            //count down the time..
            let timeLeftSpan = this.waitingMessage.querySelector('#timeLeft');

            let updateTimeShown = ()=>
            {
                let millisLeft = c.args.estimatedSendDate - new Date().getTime();
                let millisPerHour = 1000*60*60;
                let millisPerMinute = 1000*60;

                let str = '';

                let hours = millisLeft / millisPerHour;
                let minutes = millisLeft / millisPerMinute;
                let seconds = Math.floor(millisLeft / 1000);
                if (hours>1)
                {
                    str = `${hours.toFixed(1)} hours`;
                }
                else
                if (minutes>1)
                {
                    str = `${minutes.toFixed(1)} minutes`;
                }
                else
                {
                    str = `${seconds} seconds`
                }

                timeLeftSpan.innerHTML = str;
                if (seconds<=0)
                    return false;
                else
                    return true;
            }

            if (updateTimeShown())
            {
                let interval = setInterval(()=>
                {
                    if (!updateTimeShown())
                        clearInterval(interval);
                },1000);
            }

            return {success:true};
        });


        RPC.SetHandler(ClientApi.NotifyMessageSentCall, async (c:ClientApi.NotifyMessageSentCall):Promise<RPC.Response> =>
        {
            //clear any waiting message that was previously displayed
            this.waitingMessage.innerHTML = '';

            //updated the Contacted column for this user to 'Yes'
            let updateContactedElement = em.querySelector(`#contacted-${c.args.recipientScreenName}`);
            if (updateContactedElement)
                updateContactedElement.innerHTML = 'Yes';

            if (!this.contactedVisible)
            {
                //make their row disappear
                //animate the rows disappearance?
                let updateContactedRow = em.querySelector(`#row-${c.args.recipientScreenName}`) as HTMLElement;
                if (updateContactedRow)
                {
                    updateContactedRow.style.opacity = '0';
                    updateContactedRow.style.maxHeight = '0px';
                    setTimeout(()=>
                    {
                        this.resultsDiv.removeChild(updateContactedRow);
                    },this.rowDeletionAnimationTime);

                    if (this.nextExtraRowToAppear < this.extraRows.length)
                    {
                        let e = this.extraRows[this.nextExtraRowToAppear];
                        if (e)
                        {
                            //move the next row out of the extra row and to the bottom of the visible resultsDiv
                            this.resultsDiv.appendChild(e);

                            //clear our reference from the extraRows array
                            this.extraRows[this.nextExtraRowToAppear] = null;
                            this.nextExtraRowToAppear++;
                        }
                    }
                }
            }
            return {success:true};
        });
    }


    async RenderCleanup()
    {
        //dont need these notifications anymore
        RPC.SetHandler(ClientApi.NotifyMessageCampaignStartedCall, null);
        RPC.SetHandler(ClientApi.NotifyMessageCampaignStoppedCall, null);
        RPC.SetHandler(ClientApi.NotifyMessageCampaignWaitingCall, null);
        RPC.SetHandler(ClientApi.NotifyMessageSentCall, null);
    }

}
