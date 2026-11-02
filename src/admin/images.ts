// Images are shrunk in the browser before upload. Drawing onto a canvas also leaves behind everything else in the file, including a photo's location.
export const IMAGE_MAX_FILE=25*1024*1024;
const TOO_BIG='That file is over 25 MB. Try a smaller one.';
const UNREADABLE='That file couldn’t be read as an image. Try a JPG or PNG.';

// Runs `use` with the decoded image, and lets the file go afterwards.
export async function withImage<T>(file:File,use:(image:HTMLImageElement)=>Promise<T>){if(file.size>IMAGE_MAX_FILE)throw new Error(TOO_BIG);const url=URL.createObjectURL(file);try{const image=new Image();image.src=url;try{await image.decode()}catch{throw new Error(UNREADABLE)}return await use(image)}finally{URL.revokeObjectURL(url)}}

const toBlob=(canvas:HTMLCanvasElement,quality:number)=>new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error(UNREADABLE)),'image/jpeg',quality));
function paint(image:HTMLImageElement,width:number,height:number,sx=0,sy=0,sw=image.naturalWidth,sh=image.naturalHeight){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d')!;context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(image,sx,sy,sw,sh,0,0,width,height);return canvas}

export const toJpeg=(image:HTMLImageElement,width:number,height:number,quality:number)=>toBlob(paint(image,width,height),quality);
// The middle of the image as a square, for headshots.
export function toSquareJpeg(image:HTMLImageElement,size:number,quality:number){const side=Math.min(image.naturalWidth,image.naturalHeight);const out=Math.min(size,side);return toBlob(paint(image,out,out,(image.naturalWidth-side)/2,(image.naturalHeight-side)/2,side,side),quality)}
