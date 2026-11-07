import {useEffect,useState} from 'react';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function InstallApp(){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[help,setHelp]=useState(false),[installed,setInstalled]=useState(false);
 useEffect(()=>{setInstalled(matchMedia('(display-mode: standalone)').matches);const ready=(e:Event)=>{e.preventDefault();setPrompt(e as InstallEvent)};const done=()=>{setInstalled(true);setPrompt(null);setHelp(false)};window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done)}},[]);
 if(installed)return null;
 return <><button aria-label="安装 Atlas 应用" onClick={async()=>{if(prompt){await prompt.prompt();await prompt.userChoice;setPrompt(null)}else setHelp(true)}}>安装</button>{help&&<div className="confirm-backdrop" onClick={()=>setHelp(false)}><div className="delete-dialog" role="dialog" aria-modal="true" aria-label="安装 Atlas" onClick={e=>e.stopPropagation()}><h2>安装 Atlas</h2><p>电脑 Chrome / Edge：地址栏安装图标，或浏览器菜单 → 安装此应用。</p><p>Android：Chrome 菜单 → 安装应用 / 添加到主屏幕。</p><p>iPhone / iPad：Safari 分享 → 添加到主屏幕 → 添加。</p><p>在系统浏览器打开 GitHub Pages 网站后安装。云端资料读写需要联网。</p><a href="https://karenseven97.github.io/Atlas/" target="_blank" rel="noreferrer">打开网站</a><button onClick={()=>setHelp(false)}>关闭</button></div></div>}</>;
}
