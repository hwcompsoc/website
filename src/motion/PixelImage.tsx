import {useLayoutEffect,useRef,useState} from 'react';
import {PixelBuild} from './PixelBuild';

// Load verb for photos: one that arrives late builds in from its placeholder colour as it finishes downloading, like a progressive
// image decoding. One already loaded when it mounts (cached) shows at once, so nothing pretends to load. A failed image just shows its placeholder.
// `className` sizes the wrapper (it carries the placeholder background); the image fills it.
export function PixelImage({src,alt,width,height,className,lazy=false}:{src:string;alt:string;width:number;height:number;className:string;lazy?:boolean}){
 const img=useRef<HTMLImageElement>(null);const [cached,setCached]=useState(false);const [loaded,setLoaded]=useState(false);
 useLayoutEffect(()=>{const el=img.current;if(el?.complete&&el.naturalWidth)setCached(true)},[]);
 return <PixelBuild className={className} cover="var(--tint)" cols={6} rows={4} order="scatter" duration={.3} trigger="manual" play={loaded} skip={cached}>
  <img ref={img} className="pixel-image" src={src} alt={alt} width={width} height={height} loading={lazy?'lazy':undefined} onLoad={()=>setLoaded(true)} onError={()=>setLoaded(true)}/>
 </PixelBuild>;
}
