'use client';
import {useState,type ReactNode} from 'react';
export default function VirtualList<T>({items,itemKey,render,rowHeight=72,height=400,label}:{items:T[];itemKey:(v:T)=>string;render:(v:T)=>ReactNode;rowHeight?:number;height?:number;label:string}){
 const[top,setTop]=useState(0);const start=Math.max(0,Math.floor(top/rowHeight)-4),end=Math.min(items.length,Math.ceil((top+height)/rowHeight)+4);
 if(items.length<=50)return <div role="list" aria-label={label}>{items.map(v=><div role="listitem" key={itemKey(v)}>{render(v)}</div>)}</div>;
 return <div role="list" aria-label={label} tabIndex={0} style={{height,overflowY:'auto'}} onScroll={e=>setTop(e.currentTarget.scrollTop)}><div style={{height:items.length*rowHeight,position:'relative'}}>{items.slice(start,end).map((v,i)=><div role="listitem" aria-posinset={start+i+1} aria-setsize={items.length} key={itemKey(v)} style={{position:'absolute',top:(start+i)*rowHeight,height:rowHeight,left:0,right:0,overflow:'auto'}}>{render(v)}</div>)}</div></div>;
}
