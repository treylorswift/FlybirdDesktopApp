import {DOMSite} from "./DOMSite.js"

export class DOMPopupHandle
{
    handle:string;
    static count:number = 0;

    constructor()
    {
        this.handle = 'popup_'+DOMPopupHandle.count;
        DOMPopupHandle.count++;
    }
}


export type DOMComponentConstructor = new(parent:DOMComponent)=>DOMComponent;

export abstract class DOMComponent
{
    parent:DOMComponent;
    site:DOMSite;

    constructor(parent:DOMComponent)
    {
        this.parent = parent;
        
        if (parent)
            this.site = parent.GetSite();
        else
            this.site = null;
    }

    GetSite():DOMSite
    {
        return this.site;
    }

    abstract async Render(em:Element):Promise<void>;

    //any listeners or watches or other external references that were established during Render
    //should be cleaned up here
    async RenderCleanup():Promise<void> {}

    MapEvent(parentElement:Element,id:string,eventName:string,memberFunction:Function)
    {
        try{
            parentElement.querySelector(`#${id}`).addEventListener(`${eventName}`, memberFunction.bind(this));
        }
        catch (err)
        {
            console.log(`MapEvent error - name: "${err.name}" message: "${err.message}`);
            console.error(err);
        }
    }

    DisplayPopupComponent(x:number,y:number,component:DOMComponent):DOMPopupHandle
    {
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
        var checkOutsideClick = function(event)
        {
            //allow clicks within the popup, clicks outside will close it
            if (event.target == popupModal)
            {
                popupModal.removeChild(newDiv);
                component.RenderCleanup();

                window.removeEventListener("click",checkOutsideClick);
                popupModal.style.display = 'none';
            }
        }

        window.addEventListener("click", checkOutsideClick);
        return h;
    }

    ClosePopupComponent(h?:DOMPopupHandle)
    {
        var popupModal = document.getElementById("popup-modal");
        if (!popupModal)
            return;

        if (h)
        {
            var em = popupModal.querySelector(`#${h.handle}`);
            if (em)
            {
                popupModal.removeChild(em);
                popupModal.style.display = 'none';
            }
        }
        else
        {
            popupModal.innerHTML = ""; //remove all children
            popupModal.style.display = 'none';
        }
    }

    DisplayModalMessage(message:string)
    {
        this.DisplayModalComponent(new StringMessageComponent(this,message));
    }

    //same as DisplayModalMessage except shows an 'ok' and 'cancel' button
    //resolves with true if they click ok, false if they click cancel or click outside the content
    async DisplayModalConfirm(message:string):Promise<boolean>
    {
        var modal = document.getElementById('modal');
        var modalContent = document.getElementById('modal-content');
        
        let confirmComponent = new ConfirmComponent(this,message);

        //await the render so we are sure that it's .promise and .promiseResolve are accessible here
        await confirmComponent.Render(modalContent);

        modal.style.display = "flex";

        // When the user clicks anywhere outside of the modal, close it
        var checkOutsideClick = function(event)
        {
            //'modal' is effectively a page-covering background behind the modal content
            //which will catch any attemps to click anywhere other than the modal content
            //if they do that, the modal dialog cancels out
            if (event.target == modal)
            {
                modalContent.innerHTML = '';
                confirmComponent.promiseResolve(false); //clicking outside is the same as clicking cancel
                confirmComponent.RenderCleanup();
                modal.style.display = "none";
                window.removeEventListener("click",checkOutsideClick);
            }
        }

        window.addEventListener("click", checkOutsideClick);

        //this promise returned from the confirmcomponent gets resolved
        //when ok is clicked, cancel is clicked, or right above here if they click
        //outside the modal content
        return confirmComponent.promise;
    }

    DisplayModalComponent(component:DOMComponent)
    {
        var modal = document.getElementById('modal');
        var modalContent = document.getElementById('modal-content');
        
        component.Render(modalContent);

        modal.style.display = "flex";

        // When the user clicks anywhere outside of the modal, close it
        var checkOutsideClick = function(event)
        {
            //'modal' is effectively a page-covering background behind the modal content
            //which will catch any attemps to click anywhere other than the modal content
            //if they do that, the modal dialog cancels out
            if (event.target == modal)
            {
                modalContent.innerHTML = '';
                component.RenderCleanup();
                modal.style.display = "none";
                window.removeEventListener("click",checkOutsideClick);
            }
        }

        window.addEventListener("click", checkOutsideClick);
    }

    ClearModalComponent()
    {
        var modal = document.getElementById('modal');
        var modalContent = document.getElementById('modal-content');

        if (modalContent)
            modalContent.innerHTML = '';
        if (modal)
            modal.style.display = "none";
    }

}

class StringMessageComponent extends DOMComponent
{
    message:string;

    constructor(parent:DOMComponent,message:string)
    {
        super(parent);
        this.message = message;
    }

    async Render(em:Element)
    {
        em.innerHTML = this.message;
    }
}

class ConfirmComponent extends DOMComponent
{
    message:string;
    promise:Promise<boolean> = null;
    promiseResolve:Function = null;

    constructor(parent:DOMComponent,message:string)
    {
        super(parent);
        this.message = message;
    }

    async Render(em:Element)
    {
        this.promise = new Promise((resolve,reject)=>
        {
            //we have to save this resolve function so it can be accessed outside the component
            //by DisplayConfirmComponent, which catches clicks outside the modal content area
            //and resolves(false)
            this.promiseResolve = resolve;

            em.innerHTML = 
                `${this.message}<br/><br/>
                <div style="display:flex; justify-content:flex-end">
                    <button id="ok" style="margin-right: 12px">OK</button><button id="cancel">Cancel</button>
                </div>`
            
            em.querySelector('#ok').addEventListener('click',()=>
            {
                this.ClearModalComponent();
                resolve(true);
            });

            em.querySelector('#cancel').addEventListener('click',()=>
            {
                this.ClearModalComponent()
                resolve(false);
            });
        });
    }
}
