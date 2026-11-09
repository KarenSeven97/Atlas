import {useState} from 'react';
import {stockSelection} from '../chart-data';
import type {Instrument} from '../data';

export function AssetSelector({instruments,selected,change,add}:{instruments:Instrument[];selected:string[];change:(ids:string[])=>void;add:(symbol:string)=>Promise<void>}){
 const [query,setQuery]=useState(''),[expanded,setExpanded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const stocks=instruments.filter(i=>stockSelection([i.id],instruments).length);
 const matches=stocks.filter(i=>(i.id+' '+i.name).toLowerCase().includes(query.trim().toLowerCase()));
 const symbol=query.trim().toUpperCase();
 async function search(){if(busy||!symbol)return;setError('');if(stocks.some(i=>i.id===symbol)){setQuery('');return}setBusy(true);try{await add(symbol);setQuery('')}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 return <div className="line-selector"><div className="line-presets"><span>行情线</span><button onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'收起选择':'添加股票'}</button></div>{expanded&&<div className="line-options">
  <div className="stock-options-header"><div className="stock-search"><input aria-label="搜索行情资产" placeholder="搜索名称或输入美股代码，如 MSFT" value={query} onChange={e=>{setQuery(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();void search()}}}/>{symbol&&!matches.length&&<button disabled={busy} onClick={()=>void search()}>{busy?'查找中…':'搜索并加入'}</button>}</div><div className="stock-options-actions"><small>已选 {selected.length} / 4</small><button onClick={()=>change([])}>清空选择</button></div></div>
  {error&&<p role="alert">{error}</p>}
  <div className="line-grid">{matches.map(i=><label key={i.id}><input type="checkbox" checked={selected.includes(i.id)} disabled={!selected.includes(i.id)&&selected.length>=4} onChange={e=>change(e.target.checked?[...selected,i.id]:selected.filter(x=>x!==i.id))}/><b>{i.id}</b><span>{i.name}</span></label>)}</div>
 </div>}</div>
}
