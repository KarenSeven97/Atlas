export function linkQueryAt(text:string,caret:number){
 const start=text.lastIndexOf('[[',caret-1);if(start<0||start+2>caret)return null;
 const query=text.slice(start+2,caret);if(/[\]\n\[]/.test(query))return null;
 return {start,end:caret+(text.slice(caret,caret+2)===']]'?2:0),query};
}
export function insertNoteLink(text:string,span:{start:number;end:number},id:string,title:string){const link=`[[${id}|${title}]]`;return {text:text.slice(0,span.start)+link+text.slice(span.end),caret:span.start+link.length}}
export function inDateWindow(event:{date:string;endDate?:string},range:{from:string;to:string}){return event.date<=range.to&&(event.endDate||event.date)>=range.from}
