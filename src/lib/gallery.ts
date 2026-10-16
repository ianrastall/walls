import records from '../generated/artworks.json';
import { createHash } from 'node:crypto';

export const artworks = records;
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const versions = new Map(records.map(art => [art.slug, createHash('sha256').update(JSON.stringify(art)).digest('hex').slice(0, 12)]));
export const url = (path = '') => {
  const clean = path.replace(/^\//, '');
  const version = clean.startsWith('generated/') ? versions.get(clean.split('/')[1]) : undefined;
  return `${base}/${clean}${version ? `?v=${version}` : ''}`;
};
export const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const srcset = (images: {url:string;width:number}[]) => images.map(p => `${url(p.url)} ${p.width}w`).join(', ');
