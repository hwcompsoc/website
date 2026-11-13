import {useEffect,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
import {ChevronRight,ExternalLink,File as FileIcon,FileText,Folder,Image as ImageIcon,Presentation,Search,Sheet,Unplug,Video,type LucideIcon} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Input} from '../components/ui/input';
import {go,onRouteChange} from '../router';
import {driveKind,driveKindLabel,type DriveKind} from '../admin-rules';
import {callFunction,ConfirmDialog,EmptyNote,Failure,useLoad,useTitle,type Confirm} from './ui';
import {PeopleSkeleton} from './skeletons';

type Status={configured:boolean;connected:boolean;account:string|null;root:{id:string;name:string}|null};
type DriveFile={id:string;name:string;mimeType:string;modified:string|null;link:string|null};
type Listing={trail:{id:string;name:string}[];files:DriveFile[]};
// Everything goes through a server function, which holds the society's Google connection.
export const drive=<T,>(body:Record<string,string>)=>callFunction<T>('google-drive',body);
const redirect=()=>`${location.origin}/admin/drive`;
const icons:Record<DriveKind,LucideIcon>={folder:Folder,doc:FileText,sheet:Sheet,slides:Presentation,form:FileText,pdf:FileText,image:ImageIcon,video:Video,file:FileIcon};
const changed=(iso:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',day:'numeric',month:'short',year:'numeric'}).format(new Date(iso));
const folderHref=(id:string,root:string)=>id===root?'/admin/drive':`/admin/drive?folder=${encodeURIComponent(id)}`;

function Row({file,root}:{file:DriveFile;root:string}){const kind=driveKind(file.mimeType);const Icon=icons[kind];const detail=[driveKindLabel[kind],file.modified&&`changed ${changed(file.modified)}`].filter(Boolean).join(', ');
 const body=<><Icon size={16} aria-hidden="true"/><span className="admin-row-main"><b>{file.name}</b><small>{detail}</small></span></>;
 return <li>{kind==='folder'?<a href={folderHref(file.id,root)}>{body}<ChevronRight size={16} aria-hidden="true"/></a>:<a href={file.link??'#'} target="_blank" rel="noopener noreferrer">{body}<ExternalLink size={16} aria-hidden="true"/><span className="sr-only"> (opens Google Drive in a new tab)</span></a>}</li>}

function Browser({root,folder}:{root:{id:string;name:string};folder:string}){const {data,error,loading}=useLoad(()=>drive<Listing>({action:'list',folder}),`drive-${root.id}-${folder}`);const [query,setQuery]=useState('');const [found,setFound]=useState<{query:string;files:DriveFile[]}|null>(null);const [searching,setSearching]=useState(false);const [searchError,setSearchError]=useState('');
 useEffect(()=>{setFound(null);setQuery('');setSearchError('')},[folder]);
 async function submit(e:FormEvent){e.preventDefault();const words=query.trim();if(!words){setFound(null);return}setSearching(true);setSearchError('');try{const {files}=await drive<{files:DriveFile[]}>({action:'search',query:words});setFound({query:words,files})}catch(failure){setSearchError((failure as Error).message)}finally{setSearching(false)}}
 return <><form className="admin-tools" role="search" onSubmit={submit}>{data&&<nav aria-label="Folder" className="admin-drive-trail"><ol>{data.trail.map((step,i)=><li key={step.id}>{i===data.trail.length-1?<span aria-current="page">{step.name}</span>:<a href={folderHref(step.id,root.id)}>{step.name}</a>}</li>)}</ol></nav>}<div className="admin-search"><Search size={16} aria-hidden="true"/><Input aria-label={`Search ${root.name}`} placeholder="Search by name" value={query} onChange={e=>{setQuery(e.target.value);if(!e.target.value.trim())setFound(null)}}/></div></form>
  <Failure>{searchError||error}</Failure>
  {searching?<PeopleSkeleton/>:found?<section aria-label="Search results"><p className="admin-quiet" role="status">{found.files.length?`${found.files.length===50?'The first 50':found.files.length} ${found.files.length===1?'match':'matches'} for “${found.query}”.`:''}</p>{found.files.length?<ul className="admin-rows">{found.files.map(file=><Row key={file.id} file={file} root={root.id}/>)}</ul>:<EmptyNote kind="search">Nothing in {root.name} has a name like that.</EmptyNote>}</section>
  :loading&&!data?<PeopleSkeleton/>:data&&(data.files.length?<ul className="admin-rows">{data.files.map(file=><Row key={file.id} file={file} root={root.id}/>)}</ul>:<EmptyNote kind="none">This folder is empty.</EmptyNote>)}</>}

function FolderChoice({onChosen,onCancel}:{onChosen:()=>void;onCancel?:()=>void}){const {data,error,loading}=useLoad(()=>drive<{folders:{id:string;name:string}[]}>({action:'folders'}),'drive-folders');const [busy,setBusy]=useState('');const [failure,setFailure]=useState('');
 async function choose(id:string){setBusy(id);setFailure('');try{await drive({action:'choose-folder',folder:id});onChosen()}catch(e){setFailure((e as Error).message);setBusy('')}}
 return <section className="admin-form-block" aria-labelledby="drive-choose"><h2 id="drive-choose">Choose the society folder</h2><p className="admin-quiet">The admin shows only this folder and what’s inside it, and saves minutes into a Minutes folder within it. These are the folders at the top of the Drive.</p><Failure>{failure||error}</Failure>
  {loading&&!data?<PeopleSkeleton/>:data&&(data.folders.length?<ul className="admin-rows">{data.folders.map(folder=><li key={folder.id}><button type="button" className="admin-drive-choice" disabled={!!busy} onClick={()=>choose(folder.id)}><Folder size={16} aria-hidden="true"/><span className="admin-row-main"><b>{folder.name}</b>{busy===folder.id&&<small>Choosing…</small>}</span></button></li>)}</ul>:<EmptyNote kind="none">There are no folders at the top of this Drive. Make one in Google Drive, then reload this page.</EmptyNote>)}
  {onCancel&&<div className="admin-actions"><Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button></div>}</section>}

function Connect(){const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function start(){setBusy(true);setError('');try{const {url}=await drive<{url:string}>({action:'connect-url',redirect:redirect()});location.assign(url)}catch(failure){setError((failure as Error).message);setBusy(false)}}
 return <section className="admin-form-block" aria-labelledby="drive-connect"><h2 id="drive-connect">Connect the society’s Google Drive</h2><ol className="admin-drive-steps"><li>Choose <b>Connect Google Drive</b> and sign in as the society’s Google account, not your own.</li><li>Google warns that the app isn’t verified. That’s expected, because only the society uses it. Choose <b>Advanced</b>, then go on to the app.</li><li>Allow it to see and add to the Drive. The admin only ever lists, opens and adds files. It never changes or deletes anything.</li><li>Back here, choose which folder the committee sees.</li></ol><Failure>{error}</Failure><Button className="site-button" disabled={busy} onClick={start}>{busy?'Opening Google…':'Connect Google Drive'}</Button></section>}

export function Drive({owner}:{owner:boolean}){useTitle('Drive');const search=useSyncExternalStore(onRouteChange,()=>location.search);const folder=new URLSearchParams(search).get('folder')??'';const [version,setVersion]=useState(0);const status=useLoad(()=>drive<Status>({action:'status'}),`drive-status-${version}`);const [notice,setNotice]=useState('');const [error,setError]=useState('');const [connecting,setConnecting]=useState(false);const [changing,setChanging]=useState(false);const [confirm,setConfirm]=useState<Confirm|null>(null);const returned=useRef(false);
 // Google sends the Owner back here with a one-time code, which the server swaps for the lasting connection.
 useEffect(()=>{const params=new URLSearchParams(location.search);const code=params.get('code');const given=params.get('state');if(returned.current||(!code&&!params.get('error')))return;returned.current=true;go('/admin/drive',{replace:true});
  if(!code||!given){setError('Google Drive wasn’t connected. Choose Connect again, and choose Allow when Google asks.');return}
  setConnecting(true);drive<{account:string}>({action:'connect',code,state:given,redirect:redirect()}).then(({account})=>{setNotice(`Connected to ${account}.`);setVersion(v=>v+1)},(failure:Error)=>setError(failure.message)).finally(()=>setConnecting(false))},[]);
 const refresh=(message:string)=>{setNotice(message);setChanging(false);setVersion(v=>v+1)};
 const askDisconnect=()=>setConfirm({title:'Disconnect Google Drive?',body:'Nothing in the Drive changes, but the admin stops showing it and minutes can’t be saved to it until an Owner connects it again.',action:'Disconnect',danger:true,run:async()=>{setError('');try{await drive({action:'disconnect'});refresh('Google Drive disconnected.')}catch(failure){setError((failure as Error).message)}}});
 const info=status.data;
 return <section className="admin-page admin-narrow"><header className="admin-head"><h1>Drive</h1>{info?.root&&<Button asChild variant="outline"><a href={`https://drive.google.com/drive/folders/${info.root.id}`} target="_blank" rel="noopener noreferrer">Open in Google Drive<ExternalLink aria-hidden="true"/><span className="sr-only"> (opens in a new tab)</span></a></Button>}</header>
  <p className="admin-quiet admin-people-intro">The society’s shared files, from its Google Drive. To add, rename or delete anything, open it in Google Drive.</p>
  <Failure>{error||status.error}</Failure><p role="status" className="admin-notice">{connecting?'Connecting Google Drive…':notice}</p>
  {(status.loading&&!info)||connecting?<PeopleSkeleton/>:info&&(!info.configured?<EmptyNote kind="none">Google Drive isn’t set up on the server yet. Whoever looks after the website needs to add the Google keys.</EmptyNote>
  :!info.connected?(owner?<Connect/>:<EmptyNote kind="none">The society’s Google Drive isn’t connected yet. Ask an Owner to connect it.</EmptyNote>)
  :!info.root||changing?(owner?<FolderChoice onChosen={()=>refresh('Folder chosen.')} onCancel={info.root?()=>setChanging(false):undefined}/>:<EmptyNote kind="none">An Owner needs to choose which folder to show.</EmptyNote>)
  :<Browser key={info.root.id} root={info.root} folder={folder}/>)}
  {owner&&info?.connected&&!connecting&&<section className="admin-block admin-drive-owner" aria-labelledby="drive-settings"><h2 id="drive-settings">Connection</h2><p>Connected to <b>{info.account}</b>{info.root&&<>, showing <b>{info.root.name}</b></>}. Only Owners see this.</p><div className="admin-actions">{info.root&&!changing&&<Button type="button" variant="outline" onClick={()=>setChanging(true)}>Change folder</Button>}<Button type="button" variant="ghost" className="admin-menu-danger" onClick={askDisconnect}><Unplug aria-hidden="true"/>Disconnect</Button></div></section>}
  <ConfirmDialog confirm={confirm} onClose={()=>setConfirm(null)}/></section>}
