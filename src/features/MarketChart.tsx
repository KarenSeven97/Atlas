import {useLayoutEffect,useRef,useState,useMemo} from 'react';
import {createChart,LineSeries,ColorType,TickMarkType,CrosshairMode,PriceScaleMode,type IChartApi,type ISeriesApi,type Time} from 'lightweight-charts';
import {priceWindow,calendarAnchor,chartColor} from '../chart-data';
import {DAY,clampRange} from '../interactions';
import {date,type EventV2} from '../model';
import type {PriceBar,Instrument} from '../data';
import type {Range} from './Charts';

function time(t:Time){return typeof t==='string'?t:typeof t==='number'?date(t*1000):`${t.year}-${String(t.month).padStart(2,'0')}-${String(t.day).padStart(2,'0')}`}
export function MarketChart({data,assets,instruments,range,onRange,selected,cursor,onCursor,light}:{data:Record<string,PriceBar[]>;assets:string[];instruments:Instrument[];range:Range;onRange:(r:Range)=>void;selected?:EventV2;cursor:string;onCursor:(s:string)=>void;light:boolean}){
 const view=useMemo(()=>priceWindow(data,assets,range),[data,assets,range]);
 const calendarRef=useRef<ISeriesApi<'Line'>|null>(null),lines=useRef<ISeriesApi<'Line'>[]>([]);
 const [position,setPosition]=useState<number|null>(null);
 const el=useRef<HTMLDivElement>(null),api=useRef<IChartApi|null>(null);
 const props=useRef({range,onRange,onCursor});props.current={range,onRange,onCursor};
 useLayoutEffect(()=>{
  if(!el.current)return;
  const target=el.current;
  const c=createChart(target,{width:target.clientWidth,height:320,layout:{background:{type:ColorType.Solid,color:light?'#fff':'#101925'},textColor:light?'#5a6a7a':'#91a1b5'},grid:{vertLines:{color:light?'#eef1f5':'#1c2937'},horzLines:{color:light?'#eef1f5':'#1c2937'}},crosshair:{mode:CrosshairMode.Normal,horzLine:{visible:false,labelVisible:false}},handleScroll:false,handleScale:false,timeScale:{minBarSpacing:0.001,tickMarkFormatter:(t:Time,type:TickMarkType)=>type===TickMarkType.Year?time(t).slice(0,4)+'年':time(t).slice(0,7),timeVisible:false,lockVisibleTimeRangeOnResize:true},leftPriceScale:{visible:false,minimumWidth:0,borderVisible:false},rightPriceScale:{mode:PriceScaleMode.Normal,autoScale:true,borderVisible:false,minimumWidth:64,scaleMargins:{top:.12,bottom:.12}}});
  api.current=c;let pointer:{x:number;range:Range}|null=null;
  const applyRange=()=>{const r=props.current.range;c.timeScale().setVisibleRange({from:r.from as Time,to:r.to as Time})};
  const resize=new ResizeObserver(()=>{c.resize(target.clientWidth,320);applyRange()});resize.observe(target);
  const plotWidth=()=>Math.max(1,c.timeScale().width());
  const wheel=(e:WheelEvent)=>{e.preventDefault();e.stopPropagation();const r=props.current.range,s=Date.parse(r.from),span=Date.parse(r.to)-s,rect=target.getBoundingClientRect(),ratio=Math.max(0,Math.min(1,(e.clientX-rect.left)/plotWidth())),n=Math.max(DAY,span*(e.deltaY>0?1.25:.8));props.current.onRange(clampRange({from:date(s+(span-n)*ratio),to:date(s+(span-n)*ratio+n)}))};
  const down=(e:PointerEvent)=>{if(e.button!==0||(e.target as HTMLElement).closest('a'))return;pointer={x:e.clientX,range:props.current.range};target.setPointerCapture(e.pointerId)};
  const move=(e:PointerEvent)=>{if(!pointer)return;const r=pointer.range,span=Date.parse(r.to)-Date.parse(r.from),delta=-(e.clientX-pointer.x)/plotWidth()*span;props.current.onRange(clampRange({from:date(Date.parse(r.from)+delta),to:date(Date.parse(r.to)+delta)}))};
  const up=()=>pointer=null;
  target.addEventListener('wheel',wheel,{passive:false});target.addEventListener('pointerdown',down);target.addEventListener('pointermove',move);target.addEventListener('pointerup',up);target.addEventListener('pointercancel',up);
  // Calendar points use an isolated scale and never contribute to price-axis values.
  calendarRef.current=c.addSeries(LineSeries,{visible:true,lineVisible:false,crosshairMarkerVisible:false,priceLineVisible:false,lastValueVisible:false,priceScaleId:'calendar',autoscaleInfoProvider:()=>null});
  lines.current=assets.map((_,i)=>c.addSeries(LineSeries,{priceScaleId:'right',color:chartColor(i),lineWidth:2,title:'',priceLineVisible:false,lastValueVisible:false,priceFormat:{type:'price',precision:2,minMove:.01}}));
  c.subscribeCrosshairMove(p=>{if(p.time)props.current.onCursor(time(p.time))});
  return()=>{resize.disconnect();target.removeEventListener('wheel',wheel);target.removeEventListener('pointerdown',down);target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',up);target.removeEventListener('pointercancel',up);c.remove();api.current=null};
 },[assets,light]);
 // Update every series and the shared viewport before the browser paints.
 useLayoutEffect(()=>{const c=api.current;if(!c)return;
  calendarRef.current?.setData(calendarAnchor(range).map(p=>({...p,time:p.time as Time})));
  lines.current.forEach((line,i)=>line.setData(view[i].map(p=>({...p,time:p.time as Time}))));
  c.priceScale('right').applyOptions({mode:PriceScaleMode.Normal,autoScale:true});
  c.timeScale().setVisibleRange({from:range.from as Time,to:range.to as Time});
 },[view,range,assets,light]);
 const activeDay=cursor&&cursor>=range.from&&cursor<=range.to?cursor:selected?.date&&selected.date>=range.from&&selected.date<=range.to?selected.date:range.to;
 useLayoutEffect(()=>{setPosition(api.current?.timeScale().timeToCoordinate(activeDay as Time)??null)},[activeDay,view,range,assets,light]);
 return <div className="market-wrap">
  <div className="market-canvas"><div ref={el}/>{position!==null&&<div className="date-marker" style={{left:position}}/>}</div>
  <div className="quote-readout"><time>{activeDay}</time>{assets.map((id,i)=>{const close=data[id]?.find(p=>p.date===activeDay)?.close,currency=instruments.find(a=>a.id===id)?.currency||'';return <span key={id}><i style={{background:chartColor(i)}}/><b>{id}</b> 收盘 {close===undefined?'—':close.toFixed(2)+' '+currency}</span>})}</div>
  <div className="chart-note">日线收盘价 · 右轴为价格 · 各股票币种见读数 · 沿用数据源复权口径 · 无当日行情显示 — · <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">TradingView Lightweight Charts™</a></div>
 </div>
}
