'use client';
import {useState} from 'react';
import {compareFields,snapshotFields,type EntityWatch} from '../../lib/research';
import {FieldComparison} from './ComparisonTools';
import {useT} from '../../lib/i18n';
export default function EntityHistory({watch:w}:{watch:EntityWatch}) {
 const t=useT(),[selected,setSelected]=useState('');const history=w.history??[];
 const baseline=history.find(h=>h.at===selected)?.snapshot??w.baseline;
 return <div className="wb-stack">{!!history.length&&<label>{t('pro_saved_snapshot')}<select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">{t('pro_latest_capture')}</option>{history.map((h,i)=><option key={`${h.at}-${i}`} value={h.at}>{new Date(h.at).toLocaleString()} · {h.snapshot.classification}</option>)}</select></label>}<FieldComparison rows={compareFields(snapshotFields(baseline),snapshotFields(w.current))}/></div>;
}
