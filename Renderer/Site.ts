import * as RPC from "../Shared/RPC.js"
import * as ServerApi from "../Shared/ServerApi.js"
import { ElectronIPC } from "../Shared/ElectronIPC.js";
import { DOMComponent } from "./DOMComponent.js"
import { DOMSite } from "./DOMSite.js"
import { HomePage } from "./HomePage.js"
import { LoginPage } from "./LoginPage.js"


export class Site extends DOMSite
{
    routerContentElement:HTMLElement;
    
    private static g_site:Site = null;
    static GetSite():Site
    {
        return Site.g_site;
    }

    constructor()
    {
        super();
        if (Site.g_site)
        {
            console.log("Site.g_site already exists, should never have multiple Site instantiations");
            return;
        }
        Site.g_site = this;

        this.routerContentElement = null;

        var map = 
        {
            "/":HomePage,
            "/login":LoginPage,
        };

        this.InitRoutes(map);

        window.addEventListener('popstate', (event) =>
        {
            //console.log(inspect(event));
            this.RouteTo(event.state.path,{pushState:false});
        }, false);
    }

    GetSite():DOMSite
    {
        return this;
    }

    GetRouteContentElement():HTMLElement
    {
        return this.routerContentElement;
    }
    
    async Render(em:HTMLElement)
    {
        try
        {
            //apply the title bar and router content div
            em.innerHTML = `
                <div id="routerContentId"></div>`;

            this.routerContentElement = em.querySelector('#routerContentId');   

            //first make sure our session cookie is valid and we're logged in
            let userLoginResponse = await ServerApi.GetUserLogin();
            
            //if they're not logged in, we either tell them that they're not authorized, or show them
            //the login page where they can try to login
            if (!userLoginResponse.userLogin)
            {
                //render the login page
                this.RouteTo("/login");
                return;
            }
                
            //default route, go to /home            
            await this.RouteTo("/");
        }
        catch (err)
        {
            console.log("error");
        }
    }

    async onload()
    {
        RPC.SetTransport(new ElectronIPC());

        this.Render(document.getElementById("site"));
    }

}

