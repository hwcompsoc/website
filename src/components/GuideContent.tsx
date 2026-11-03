import {ScrollArea} from './ui/scroll-area';
import {Separator} from './ui/separator';
import {links,type Resource} from '../content';
import {External} from './shared';
import {GuideBody} from './GuideBody';

export function GuideContent({resource}:{resource:Resource}){return <>{resource.reviewed&&<p className="guide-reviewed">Last reviewed {resource.reviewed}</p>}<ScrollArea className="guide-reader" aria-label={resource.title}><div className="guide-content"><GuideBody source={resource.body}/><Separator/><External href={links.discord} className="text-link">Ask on Discord</External></div></ScrollArea></>}
