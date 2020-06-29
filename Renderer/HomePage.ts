import * as ServerApi from "../Shared/ServerApi.js"
import {UserLogin} from "../Shared/TwitterAuth.js"

import { DOMComponent } from "./DOMComponent.js"
import { FollowerCacheComponent } from "./FollowerCacheComponent.js"
import { QueryComponent } from "./QueryComponent.js"

export class HomePage extends DOMComponent
{
    FollowerCacheComponent = new FollowerCacheComponent(this);
    queryComponent = new QueryComponent(this);
    userLogin:UserLogin = null;
    promoElement:HTMLElement = null;

    async Render(em:Element)
    {
        //make sure we have a valid / current login of a current user
        let userLoginResponse = await ServerApi.GetUserLogin();

        //if they're not logged in, redirect to the login page
        if (!userLoginResponse.userLogin)
        {
            this.GetSite().RouteTo("/login");
            return;
        }

        this.userLogin = userLoginResponse.userLogin;

        let screen_name = userLoginResponse.userLogin.screen_name;

        let link = 'https://flybirdy.herokuapp.com';

        let promoHtml = ''
        let promoHidden = true;
        //if (window.localStorage.getItem('promoHidden')!=="1")
        {
            let onePx = 1.0/window.devicePixelRatio;

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

        var html = 
           `
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
            </div>`
        em.innerHTML = html;

        this.FollowerCacheComponent.Render(em.querySelector('#cacheStatus'));
        this.queryComponent.Render(em.querySelector('#query'));

        if (!promoHidden)
        {
            this.MapEvent(em,"closePromo","click",this.ClosePromo);
            this.promoElement = em.querySelector("#promo");
        }
    }

    async RenderCleanup()
    {
        this.FollowerCacheComponent.RenderCleanup();
        this.queryComponent.RenderCleanup();
    }

    ClosePromo = ()=>
    {
        this.promoElement.style.display = 'none';
        window.localStorage.setItem('promoHidden',"1");
    }
}

