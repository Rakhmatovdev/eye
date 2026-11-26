'use client';
import {useState} from 'react';
import type {Hypothesis} from '../../lib/research';
import {useT} from '../../lib/i18n';
export default function OpenQuestions({hypothesis:h,onChange}:{hypothesis:Hypothesis;onChange:(questions:NonNullable<Hypothesis['questions']>)=>void}) {
 const t=useT(),[title,setTitle]=useState('');const questions=h.questions??[];
 return <section className="wb-stack"><h4>{t('pro_open_questions')} ({questions.filter(q=>!q.done).length})</h4>{questions.map(q=><div key={q.id} className="wb-toolbar"><label className="pro-check"><input type="checkbox" checked={q.done} onChange={e=>onChange(questions.map(item=>item.id===q.id?{...item,done:e.target.checked}:item))}/>{q.title}</label><button type="button" className="dashboard-text-link" onClick={()=>onChange(questions.filter(item=>item.id!==q.id))}>{t('pro_remove')}</button></div>)}<label>{t('pro_open_questions')}<input maxLength={300} value={title} onChange={e=>setTitle(e.target.value)}/></label><button type="button" className="dashboard-secondary-button" disabled={!title.trim()||questions.length>=30} onClick={()=>{onChange([...questions,{id:crypto.randomUUID(),title:title.trim(),done:false}]);setTitle('');}}>{t('pro_add_question')}</button></section>;
}
