import {useRef,useState,type ChangeEvent} from 'react';
import {ImagePlus,Trash2} from 'lucide-react';
import {Button} from '../components/ui/button';
import {Textarea} from '../components/ui/textarea';
import {supabase} from '../supabase';
import {COVER_BUCKET,coverThumb} from '../supabase-config';
import {COVER_FULL,COVER_MAX_FILE,COVER_MIN,COVER_THUMB,coverProblem,coverSize,coverUrl,type AdminEvent,type CoverKind,type Problems} from '../admin-rules';
import {Failure,Field,fieldProps,friendly} from './ui';

const TOO_BIG='That file is over 25 MB. Try a smaller one.';const UNREADABLE='That file couldn’t be read as an image. Try a JPG or PNG.';
const KINDS={cover:{column:'cover_path',label:'Landscape image',use:'16:9, like 1600 × 900. For this site and Native.'},square:{column:'square_path',label:'Square image',use:'1:1, like 1080 × 1080. For Luma, Instagram and Discord.'}} as const;
const storage=()=>supabase.storage.from(COVER_BUCKET);
const removeFiles=async(path:string)=>{const {error}=await storage().remove([path,coverThumb(path)]);if(error)console.warn(`Could not remove old image ${path}: ${error.message}`)};

// Drawing onto a canvas shrinks the image, and leaves behind everything else in the file, including a photo's location.
function toJpeg(image:HTMLImageElement,longest:number,quality:number){const {width,height}=coverSize(image.naturalWidth,image.naturalHeight,longest);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d')!;context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,0,0,width,height);return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error(UNREADABLE)),'image/jpeg',quality))}

// Only the landscape image is shown in lists, so only it needs a small copy.
async function prepare(file:File,kind:CoverKind){if(file.size>COVER_MAX_FILE)throw new Error(TOO_BIG);const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;try{await image.decode()}catch{throw new Error(UNREADABLE)}const problem=coverProblem(kind,image.naturalWidth,image.naturalHeight);if(problem)throw new Error(problem);return {full:await toJpeg(image,COVER_FULL.longest,COVER_FULL.quality),thumb:kind==='cover'?await toJpeg(image,COVER_THUMB.longest,COVER_THUMB.quality):null}}finally{URL.revokeObjectURL(url)}}

async function upload(name:string,blob:Blob){const {error}=await storage().upload(name,blob,{contentType:'image/jpeg',cacheControl:'31536000'});if(error)throw new Error(friendly(error))}
async function saveImage(id:string,column:string,path:string|null){const {error}=await supabase.from('events').update({[column]:path}).eq('id',id).select('id').single();if(error)throw new Error(friendly(error))}

// Saves as soon as an image is chosen. The form's own save never touches the images, so a form left open can't bring back a removed photo.
function ImageField({event,kind,onImage}:{event:AdminEvent;kind:CoverKind;onImage:(change:Partial<AdminEvent>)=>void}){const {column,label,use}=KINDS[kind];const current=event[column]??null;const input=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState<'adding'|'removing'|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');const live=event.status!=='draft';const hint=`ev-${kind}-hint`;
 async function choose(e:ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file)return;setBusy('adding');setError('');setNotice('');try{const {full,thumb}=await prepare(file,kind);const path=`${crypto.randomUUID()}.jpg`;if(thumb)await upload(coverThumb(path),thumb);await upload(path,full);try{await saveImage(event.id!,column,path)}catch(failure){await removeFiles(path);throw failure}if(current)await removeFiles(current);onImage({[column]:path});setNotice(`${label} saved.`)}catch(failure){setError((failure as Error).message)}setBusy(null)}
 async function remove(){setBusy('removing');setError('');setNotice('');try{await saveImage(event.id!,column,null);await removeFiles(current!);onImage({[column]:null});setNotice(`${label} removed.`)}catch(failure){setError((failure as Error).message)}setBusy(null)}
 return <div className="admin-field admin-image"><span className="admin-image-label">{label}</span><small id={hint}>{use}</small><div className="admin-cover-frame" data-kind={kind} aria-busy={!!busy}>{current?<img src={coverUrl(current)} alt={`Current ${label.toLowerCase()}`}/>:<span>Not added yet</span>}</div><input ref={input} type="file" accept="image/*" hidden aria-label={label} onChange={choose}/><div className="admin-actions admin-cover-actions"><Button type="button" variant="outline" disabled={!!busy} aria-label={`${current?'Replace':'Choose'} ${label.toLowerCase()}`} aria-describedby={hint} onClick={()=>input.current?.click()}><ImagePlus aria-hidden="true"/>{busy==='adding'?'Uploading…':current?'Replace':'Choose image'}</Button>{current&&!live&&<Button type="button" variant="ghost" disabled={!!busy} aria-label={`Remove ${label.toLowerCase()}`} onClick={remove}><Trash2 aria-hidden="true"/>{busy==='removing'?'Removing…':'Remove'}</Button>}</div><Failure>{error}</Failure><p role="status" className="admin-notice">{notice}</p></div>}

export function CoverFields({event,onImage,onAlt,problems}:{event:AdminEvent;onImage:(change:Partial<AdminEvent>)=>void;onAlt:(text:string)=>void;problems:Problems}){const alt=event.cover_alt??'';return <>
 <p className="admin-quiet admin-images-note">The same poster or photo in two shapes, each at least {COVER_MIN} pixels wide. Check that anyone clearly identifiable is happy to appear. Images save as soon as you choose them.</p>
 <div className="admin-images"><ImageField event={event} kind="cover" onImage={onImage}/><ImageField event={event} kind="square" onImage={onImage}/></div>
 <Field id="ev-alt" label="Describe the image" error={problems.cover_alt} hint={`For people who can’t see it. Say what it shows, and include any words on a poster, like a speaker’s name. ${300-alt.length} characters left.`}><Textarea {...fieldProps('ev-alt',problems.cover_alt,true)} maxLength={300} rows={3} value={alt} onChange={e=>onAlt(e.target.value)}/></Field></>}
