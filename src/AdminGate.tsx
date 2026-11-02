import {Component,Suspense,lazy,type ReactNode} from 'react';
import {AdminBoot} from './admin/Boot';

// The admin's code loads separately, so this file has to explain any wait or failure without it.
const AdminApp=lazy(()=>import('./admin/App'));
const box={minHeight:'100vh',display:'grid',placeItems:'center',padding:24,textAlign:'center'} as const;
const reload=<button type="button" className="site-button" style={{marginTop:16,padding:'10px 18px',borderRadius:4,background:'var(--panel)',color:'var(--on-accent)'}} onClick={()=>location.reload()}>Reload the page</button>;

class Failed extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 componentDidCatch(error:unknown){console.error('The admin failed to load or crashed:',error)}
 render(){return this.state.failed?<main style={box}><div role="alert"><p style={{margin:0,fontWeight:600}}>Something went wrong loading the admin.</p><p style={{margin:'8px 0 0'}}>Your saved events aren’t affected.</p>{reload}</div></main>:this.props.children}
}

export function AdminGate(){return <Failed><Suspense fallback={<AdminBoot/>}><AdminApp/></Suspense></Failed>}
