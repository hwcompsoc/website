import {type ReactNode} from 'react';
import {Skeleton} from '../components/ui/skeleton';

// Each one follows the shape of the content it stands in for, so nothing jumps when the data arrives.
const Busy=({label,children}:{label:string;children:ReactNode})=><div role="status" aria-busy="true"><span className="sr-only">{label}</span>{children}</div>;

function Rows({count,date=false}:{count:number;date?:boolean}){return <ul className="admin-rows" aria-hidden="true">{Array.from({length:count},(_,i)=><li key={i}><span className="admin-skeleton-row">{date&&<Skeleton className="admin-sk-date"/>}<span className="admin-row-main"><Skeleton className="admin-sk-title"/><Skeleton className="admin-sk-line"/></span><Skeleton className="admin-sk-side"/></span></li>)}</ul>}

export function OverviewSkeleton(){return <Busy label="Loading the overview"><section className="admin-block"><h2 className="admin-sk-heading"><Skeleton className="admin-sk-h2"/></h2><Rows count={2}/></section><section className="admin-block"><h2 className="admin-sk-heading"><Skeleton className="admin-sk-h2"/></h2><Rows count={3} date/></section></Busy>}

export function EventsSkeleton(){return <Busy label="Loading events"><div className="admin-tools"><Skeleton className="admin-sk-tabs"/><Skeleton className="admin-sk-search"/></div><Rows count={4} date/></Busy>}

function FieldSkeleton({tall=false}:{tall?:boolean}){return <div className="admin-field"><Skeleton className="admin-sk-label"/><Skeleton className={tall?'admin-sk-textarea':'admin-sk-input'}/></div>}

// One step of the new event form.
export function StepSkeleton(){return <div className="admin-focus-body"><Busy label="Loading your draft"><Skeleton className="admin-sk-label"/><Skeleton className="admin-sk-h1"/><FieldSkeleton/><FieldSkeleton/><FieldSkeleton/></Busy></div>}

export function EditSkeleton(){return <section className="admin-page admin-narrow"><Busy label="Loading the event"><Skeleton className="admin-sk-crumb"/><Skeleton className="admin-sk-h1"/><div className="admin-form-block"><FieldSkeleton/><FieldSkeleton/><FieldSkeleton/></div><div className="admin-form-block"><FieldSkeleton/><FieldSkeleton tall/></div></Busy></section>}

export function EventSkeleton(){return <section className="admin-page"><Busy label="Loading the event"><Skeleton className="admin-sk-crumb"/><Skeleton className="admin-sk-h1"/><div className="admin-event-grid"><div className="admin-card"><div className="admin-block-head"><Skeleton className="admin-sk-h2"/><Skeleton className="admin-sk-side"/></div>{Array.from({length:4},(_,i)=><div key={i} className="admin-sk-step"><Skeleton className="admin-sk-mark"/><Skeleton className="admin-sk-title"/></div>)}<Skeleton className="admin-sk-button"/></div><div className="admin-card admin-details"><Skeleton className="admin-sk-h2"/>{Array.from({length:5},(_,i)=><div key={i} className="admin-sk-detail"><Skeleton className="admin-sk-label"/><Skeleton className="admin-sk-line"/></div>)}</div></div></Busy></section>}
