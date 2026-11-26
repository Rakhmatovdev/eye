'use client';
import React,{useState} from 'react';
import {useLocaleStore} from '../../store/localeStore';
export function useRequirementPage<T>(items:T[]){
 const [chosen,setChosen]=useState(0),locale=useLocaleStore(s=>s.locale),size=20;
 const page=Math.min(chosen,Math.max(0,Math.ceil(items.length/size)-1));
 const labels={uz:['Oldingi','Keyingi','Talablar sahifasi'],en:['Previous','Next','Requirements page'],ru:['Назад','Далее','Страница требований']}[locale];
 return {items:items.slice(page*size,(page+1)*size),controls:items.length>size?<nav className="wb-actions requirement-pager" aria-label={labels[2]}><button type="button" className="dashboard-secondary-button" disabled={page===0} onClick={()=>setChosen(page-1)}>{labels[0]}</button><span>{page+1} / {Math.ceil(items.length/size)} · {page*size+1}–{Math.min((page+1)*size,items.length)} / {items.length}</span><button type="button" className="dashboard-secondary-button" disabled={(page+1)*size>=items.length} onClick={()=>setChosen(page+1)}>{labels[1]}</button></nav>:null};
}
