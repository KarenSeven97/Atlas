// ASSETS is injected by build-cloud.mjs. No server secrets enter the Vite bundle.
const gateway='https://kcwyrkewzjkydnyctnkc.supabase.co/functions/v1/atlas-gateway';
export default {async fetch(request) {
 const url=new URL(request.url);
 if(url.pathname.startsWith('/api/')) {
  const headers=new Headers();
  for(const name of ['content-type','cookie','origin','content-length']){const value=request.headers.get(name);if(value)headers.set(name,value)}
  // Only this proxy's observed address is forwarded, never a visitor-supplied forwarding chain.
  const ip=request.headers.get('cf-connecting-ip');if(ip)headers.set('x-forwarded-for',ip);
  try{const response=await fetch(gateway+url.pathname.slice(4),{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:request.body,redirect:'manual'});
   const out=new Headers({'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   const cookie=response.headers.get('set-cookie');if(cookie)out.set('set-cookie',cookie);
   return new Response(response.body,{status:response.status,headers:out});
  }catch{return new Response(JSON.stringify({error:'无法连接云端服务'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}})}
 }
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});
 let path=url.pathname;if(path==='/')path='/index.html';
 if(!ASSETS[path]){if(path.split('/').pop().includes('.'))return new Response('Not found',{status:404});path='/index.html'}
 const mime=path.endsWith('.html')?'text/html; charset=utf-8':path.endsWith('.js')?'text/javascript; charset=utf-8':path.endsWith('.css')?'text/css; charset=utf-8':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.png')?'image/png':'application/octet-stream';
 const binary=atob(ASSETS[path]),body=Uint8Array.from(binary,c=>c.charCodeAt(0));
 return new Response(request.method==='HEAD'?null:body,{headers:{'Content-Type':mime,'Cache-Control':path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-ancestors 'self'; base-uri 'self'"}});
}};
