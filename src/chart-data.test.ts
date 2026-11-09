import test from 'node:test';import assert from 'node:assert/strict';import {normalizedWindow,timelineCountries,calendarAnchor,quoteAt,chartColor} from './chart-data';
const bars=(id:string,values:[string,number][])=>values.map(([date,close])=>({instrumentId:id,date,close,source:'test',datasetId:'test'}));
test('explicit rebase uses the first shared trading date in the selected window',()=>{const data={A:bars('A',[['2020-01-01',10],['2020-01-02',20],['2020-01-03',30],['2020-01-04',1000]]),B:bars('B',[['2020-01-02',40],['2020-01-03',20]])};const r=normalizedWindow(data,['A','B'],{from:'2020-01-01',to:'2020-01-03'});assert.equal(r.baseDate,'2020-01-02');assert.deepEqual(r.series.map(s=>s.map(p=>p.value)),[[100,150],[100,50]]);const zoom=normalizedWindow(data,['A','B'],{from:'2020-01-03',to:'2020-01-03'});assert.deepEqual(zoom.series.map(s=>s.map(p=>p.value)),[[100],[100]])});
test('no common date within the window never uses future data as the baseline',()=>{const d={A:bars('A',[['2020-01-02',10]]),B:bars('B',[['2020-01-03',20]])};assert.deepEqual(normalizedWindow(d,['A','B'],{from:'2020-01-01',to:'2020-01-02'}).series,[[{time:'2020-01-02',value:100}],[]])});
test('primary country tracks remain in stable order even without events',()=>{assert.deepEqual(timelineCountries([]),['中国','全球','美国']);assert.deepEqual(timelineCountries([{countries:['日本','美国']}]),['中国','全球','美国','日本'])});

test('empty chart calendar stays on the selected dates after August 2024',()=>{const days=calendarAnchor({from:'2024-08-22',to:'2024-08-24'});assert.deepEqual(days.map(d=>d.time),['2024-08-22','2024-08-23','2024-08-24']);assert.ok(days.every(d=>d.value===0))});

test('zoom and pan retain identical values for all assets with a locked common origin',()=>{
 const data={AMD:bars('AMD',[['2024-08-01',100],['2024-08-02',120],['2024-08-05',90]]),GOOGL:bars('GOOGL',[['2024-08-01',200],['2024-08-02',220],['2024-08-05',260]])};
 const full=normalizedWindow(data,['AMD','GOOGL'],{from:'2024-08-01',to:'2024-08-05'});
 for(const range of [{from:'2024-08-02',to:'2024-08-05'},{from:'2024-08-01',to:'2024-08-02'},{from:'2024-08-05',to:'2024-08-06'}]){
  const zoom=normalizedWindow(data,['AMD','GOOGL'],range,full.baseDate);
  zoom.series.forEach((line,i)=>line.forEach(p=>assert.equal(p.value,full.series[i].find(v=>v.time===p.time)?.value)));
 }
 assert.equal(quoteAt(data,'AMD','2024-08-05',full.baseDate).index,90);
 assert.equal(quoteAt(data,'GOOGL','2024-08-05',full.baseDate).index,130);
 assert.deepEqual(quoteAt(data,'AMD','2024-08-03',full.baseDate),{close:null,index:null});
});
test('adding a late-listed asset cannot silently rebase existing lines',()=>{
 const data={A:bars('A',[['2024-08-01',100],['2024-08-02',120]]),B:bars('B',[['2024-08-02',50]])};
 const fixed=normalizedWindow(data,['B','A'],{from:'2024-08-02',to:'2024-08-03'},'2024-08-01');
 assert.deepEqual(fixed.missingBase,['B']);assert.deepEqual(fixed.series.map(s=>s.map(p=>p.value)),[[],[120]]);
 const reset=normalizedWindow(data,['B','A'],{from:'2024-08-02',to:'2024-08-03'});
 assert.equal(reset.baseDate,'2024-08-02');assert.deepEqual(reset.series.map(s=>s.map(p=>p.value)),[[100],[100]]);
});
test('unordered data uses the earliest common baseline and never mutates the input',()=>{
 const A=bars('A',[['2024-08-05',30],['2024-08-01',10],['2024-08-02',20]]),B=bars('B',[['2024-08-02',80],['2024-08-01',40]]);
 const view=normalizedWindow({A,B},['A','B'],{from:'2024-08-01',to:'2024-08-05'});
 assert.equal(view.baseDate,'2024-08-01');assert.deepEqual(view.series[0].map(p=>p.value),[100,200,300]);assert.equal(A[0].date,'2024-08-05');
 assert.notEqual(chartColor(4),chartColor(0));
});
