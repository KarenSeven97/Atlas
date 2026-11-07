const encoder = new TextEncoder();
export const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
export const unhex = text => Uint8Array.from(text.match(/.{2}/g)||[], b => parseInt(b,16));
export const random = (length=32) => hex(crypto.getRandomValues(new Uint8Array(length)));
export const digest = async value => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export async function passwordHash(password,salt,iterations=210000) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(salt),iterations},key,256));
}
export function equal(a,b) { let d=a.length^b.length; for(let i=0;i<Math.max(a.length,b.length);i++)d|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0); return d===0; }
export async function cryptKey(secret) {return crypto.subtle.importKey('raw',await crypto.subtle.digest('SHA-256',encoder.encode('atlas:connections:v1:'+secret)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function encrypt(value,key) {const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+'.'+hex(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(value)));}
export async function decrypt(value,key) {const [iv,data]=value.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unhex(iv)},key,unhex(data)));}
// Embedded browsers block an unpartitioned SameSite=Lax login cookie.
// A new name avoids a stale v1 cookie shadowing the partitioned cookie.
export const COOKIE='__Host-atlas_session_v2';
export const sessionCookie = token => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${token?604800:0}`;
