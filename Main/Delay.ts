export async function DelaySeconds(secs:number):Promise<void>
{
    return DelayMilliseconds(secs*1000);
}

export async function DelayMilliseconds(millis:number):Promise<void>
{
    return new Promise<void>((resolve,reject)=>
    {
        setTimeout(()=>
        {
            return resolve();
        },millis);
    });
}