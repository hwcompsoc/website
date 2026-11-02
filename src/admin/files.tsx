import {useEffect,useSyncExternalStore} from 'react';
import {supabase} from '../supabase';

// Deleting a file is the last step of a change that has already saved. If it fails, the file stays public at its address,
// so it's tried again and remembered on this device, and the committee sees a warning until it's gone.
type Pending={bucket:string;name:string};
const KEY='hwcs-files-to-remove',CHANGE='hwcs-files-to-remove-changed';
const RETRY_EVERY=60*1000;
const stored=():Pending[]=>{try{return JSON.parse(localStorage.getItem(KEY)??'[]')}catch{return []}};
let pending=stored();
function remember(next:Pending[]){pending=next;try{if(next.length)localStorage.setItem(KEY,JSON.stringify(next));else localStorage.removeItem(KEY)}catch{/* Storage can be blocked: the warning and retries still last until the page closes. */}window.dispatchEvent(new Event(CHANGE))}
async function attempt(bucket:string,names:string[]){try{const {error}=await supabase.storage.from(bucket).remove(names);if(error)console.warn(`Could not remove ${names.join(', ')}: ${error.message}`);return !error}catch(failure){console.warn(`Could not remove ${names.join(', ')}: ${(failure as Error).message}`);return false}}

export async function removeFiles(bucket:string,names:string[]){if(!names.length)return;for(const wait of [0,1000,3000]){if(wait)await new Promise(resolve=>setTimeout(resolve,wait));if(await attempt(bucket,names))return}remember([...pending,...names.map(name=>({bucket,name}))])}

let retrying=false;
async function retry(){if(retrying||!pending.length)return;retrying=true;const done=new Set<Pending>();for(const bucket of new Set(pending.map(file=>file.bucket))){const files=pending.filter(file=>file.bucket===bucket);if(await attempt(bucket,files.map(file=>file.name)))files.forEach(file=>done.add(file))}retrying=false;if(done.size)remember(pending.filter(file=>!done.has(file)))}

const subscribe=(listener:()=>void)=>{window.addEventListener(CHANGE,listener);return()=>window.removeEventListener(CHANGE,listener)};
export function FilesLeftWarning(){const count=useSyncExternalStore(subscribe,()=>pending.length);
 useEffect(()=>{retry();const timer=setInterval(retry,RETRY_EVERY);window.addEventListener('online',retry);return()=>{clearInterval(timer);window.removeEventListener('online',retry)}},[]);
 return count?<p role="alert" className="admin-error">{`${count===1?'A file that should have been deleted is':`${count} files that should have been deleted are`} still online. The admin keeps trying while it’s open on this device. If this message stays, tell whoever looks after the website.`}</p>:null}
