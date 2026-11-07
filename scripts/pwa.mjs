import fs from 'node:fs/promises';
export async function generateWorker(dir='dist'){
 const html=await fs.readFile(dir+'/index.html','utf8');
 const assets=[...html.matchAll(/(?:src|href)="(\/Atlas\/assets\/[^\"]+)"/g)].map(m=>m[1]);
 const version=assets.join('|');
 await fs.writeFile(dir+'/sw.js',`const CACHE='atlas-shell-'+${JSON.stringify(version)},SHELL='/Atlas/',FILES=${JSON.stringify(['/Atlas/','/Atlas/manifest.webmanifest','/Atlas/icons/icon-192.png','/Atlas/icons/icon-512.png','/Atlas/icons/apple-touch-icon.png',...assets])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('atlas-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(SHELL))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.match(SHELL)));return}
if(FILES.includes(u.pathname))e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request)));
});`);
}
