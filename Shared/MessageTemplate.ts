//when composing a message for their followers, users can define variables in their message
//that will be expanded just prior to sending
//
//the main reason this 'template expansion' exists is so that users can create unique
//newsletter sign up links for each user that is contacted.
//
//instead of just saying "Hey check out my newsletter at https://itk-signup.herokuapp.com/treylorswift"
//
//the message can say "Hey check out my newsletter at https://itk-signup.herokuapp.com/treylorswift?twRef=balajis "
//
//the above would be obtained by composing a message like this:
//"Hey check out my newsletter at https://itk-signup.herokuapp.com/treylorswift?twRef=${followerTwitterHandle}
//
//the point of this is that now balajis can direct other people to my newsletter using that link, and
//he will receive credit when people sign up using that link
//
//variables are encoded javascript style, ${variableName}
//but the expansion is not actually done by evaluating the javascript, its just a simple
//look for $ followed by {, find the next }, and see whether it matches
//any of the variables we are prepared to handle
//
//if an unknown variable is found it will throw an error
//

export function Expand(message:string, followerTwitterHandle:string):string
{
    let str = '';

    //any variables in the message that are matched by the
    //map below will expand as defined by the map
    let expansionMap = {
        'followerTwitterHandle':followerTwitterHandle
    }

    //look for ${
    let vars = message.split('$');
    for (var i=0; i<vars.length; i++)
    {
        str += vars[i];

        let varExpanded = false;

        //is the next character a { ?
        if (i<vars.length-1)
        {
            if (vars[i+1].startsWith('{'))
            {
                //yes...
                //was the previous character a \ (was the $ escaped, as in \$) ?
                if (i>0 && vars[i].endsWith('\\'))
                { 
                    //yes it was escaped, we wont expand  the variable name, but we will remove the \ escape character
                    str = str.substr(0,str.length-1);
                }
                else
                {
                    //no it wasnt escaped, attempt to expand by finding whats between the {}
                    //only a simple search for } is performed. if people get crazy and nest ${} within other ${} this will fail
                    let closingBracketIndex = vars[i+1].indexOf('}');
                    if (closingBracketIndex>0)
                    {
                        //we found the closing bracket
                        let varName = vars[i+1].substr(1,closingBracketIndex-1).trim();
                        let expandedString = expansionMap[varName];
                        if (expandedString!==undefined && expandedString!==null && typeof(expandedString==='string'))
                        {
                            varExpanded = true;
                            
                            //insert the expanded variable into the output string
                            str += expandedString;

                            //insert the remainder after the closing }
                            let remainder = vars[i+1].substr(closingBracketIndex+1);
                            str += remainder;

                            //we just consumed the i+1 index from the iteration process so
                            //make sure we skip it
                            i++;
                        }
                        else
                        {
                            console.log("ExpandMessageTemplate - Invalid variable named in template: " + varName);
                            throw {name:"InvalidVariable",message:`Invalid variable named in template: ${varName}`}
                        }
                    }
                }
            }

            //if we didnt do any expansion just include the $ as it occurred in the message
            if (varExpanded===false)
            {
                str += '$';
            }
        }
    }

    return str;
}
