import { DOMComponent } from "./DOMComponent.js"

//simple progress bar

export class ProgressComponent extends DOMComponent
{
    progressDiv:HTMLElement;

    //expect a number 0 to 100
    SetProgressPercent(p:number)
    {
        this.progressDiv.style.width = `${p}%`
    }

    async Render(em:Element)
    {
        em.innerHTML = `<div id="progressInner" style="display:inline-block; width:0%; height:100%; background-color:rgb(88, 178, 255)"></div>`;
        this.progressDiv = em.querySelector('#progressInner');
    }

}
