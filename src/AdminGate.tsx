import {Component,Suspense,lazy,useEffect,useState,type ReactNode} from 'react';

// The admin's code loads separately, so this file has to explain any wait or failure without it.
const AdminApp=lazy(()=>import('./admin/App'));
const STALLED_AFTER=8000;
const box={minHeight:'100vh',display:'grid',placeItems:'center',padding:24,textAlign:'center'} as const;
const reload=<button type="button" className="site-button" style={{marginTop:16,padding:'10px 18px',borderRadius:4,background:'var(--panel)',color:'var(--on-accent)'}} onClick={()=>location.reload()}>Reload the page</button>;

function Waiting(){const [stalled,setStalled]=useState(false);useEffect(()=>{const timer=setTimeout(()=>setStalled(true),STALLED_AFTER);return()=>clearTimeout(timer)},[]);
 return <main style={box}><div role="status">{stalled?<><p style={{margin:0,fontWeight:600}}>The admin is taking too long to load.</p><p style={{margin:'8px 0 0'}}>Check your connection, then try again.</p>{reload}</>:<p style={{margin:0}}>Loading the admin…</p>}</div></main>}

class Failed extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:unknown){console.error('The admin failed to load or crashed:',error)}
 render(){return this.state.failed?<main style={box}><div role="alert"><p style={{margin:0,fontWeight:600}}>Something went wrong loading the admin.</p><p style={{margin:'8px 0 0'}}>Your saved events aren’t affected.</p>{reload}</div></main>:this.props.children}
}

export function AdminGate(){return <Failed><Suspense fallback={<Waiting/>}><AdminApp/></Suspense></Failed>}
