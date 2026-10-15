import records from '../generated/artworks.json';

export const artworks = records;
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path = '') => `${base}/${path.replace(/^\//, '')}`;
export const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const srcset = (images: {url:string;width:number}[]) => images.map(p => `${url(p.url)} ${p.width}w`).join(', ');
