'use client';
import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { BrainCircuit, SearchCheck } from 'lucide-react';
import { workspaceApi } from '../../lib/workspaceApi';
import { apiErrorMessage } from '../../lib/apiClient';
import { useT } from '../../lib/i18n';
import { ErrorMessage } from './Shared';
import SourceReader from './SourceReader';

export default function CaseAnalysis({ caseId }: { caseId: string }) {
  const t = useT(); const [question, setQuestion] = useState(''); const [error, setError] = useState('');
  const [source,setSource]=useState<string|null>(null);
  const analysis = useMutation({ mutationFn: () => workspaceApi.analyze(caseId, question.trim()), onError: e => setError(apiErrorMessage(e, t('wb_error'))), onSuccess: () => setError('') });
  return <div className="wb-stack wb-analysis"><div className="wb-toolbar"><div><h2>{t('wb_analysis')}</h2><p>{t('wb_analysis_note')}</p></div></div>
    <form className="wb-form wb-analysis-form" onSubmit={e => { e.preventDefault(); analysis.mutate(); }}><label>{t('wb_analysis_question')}<textarea maxLength={2000} rows={3} value={question} onChange={e => setQuestion(e.target.value)} placeholder={t('wb_analysis_placeholder')} /></label><button className="dashboard-primary-button" disabled={analysis.isPending}><BrainCircuit size={16}/>{analysis.isPending ? t('common_loading') : t('wb_analyze')}</button></form>
    <ErrorMessage message={error}/>{analysis.data && <article className="wb-report-document"><div className="wb-report-masthead"><span>KO‘Z / AI</span><span className="wb-badge">{analysis.data.source}</span></div>{analysis.data.claims?.length?<ol className="wb-stack">{analysis.data.claims.map((claim,i)=><li key={i}><p className="wb-prose">{claim.kind==='inference'&&<strong>{t('wb_inference')}: </strong>}{claim.text}</p><div className="wb-actions">{claim.citation_ids.map(id=><button className="dashboard-text-link" key={id} disabled={!analysis.data!.citations.some(c=>c.id===id)} onClick={()=>setSource(id)}>{t('wb_source')}: {analysis.data!.citations.find(c=>c.id===id)?.filename??id}</button>)}</div></li>)}</ol>:<p className="wb-prose">{analysis.data.reply}</p>}<h4><SearchCheck size={15}/> {t('wb_analysis_sources')} ({analysis.data.citations.length})</h4>{analysis.data.citations.map(c => <details className="wb-history" key={c.id}><summary>{c.id} · {c.classification}</summary><p className="wb-prose">{c.excerpt}</p><button className="dashboard-text-link" onClick={()=>setSource(c.id)}>{t("pro_open_source")}{c.page?` · ${t("pro_page")} ${c.page}`:""}</button><code className="wb-report-hash">SHA-256: {c.snapshot_sha256}</code></details>)}</article>}{source&&analysis.data?.citations.find(c=>c.id===source)&&<SourceReader caseId={caseId} citation={analysis.data.citations.find(c=>c.id===source)!} onClose={()=>setSource(null)}/>}
  </div>;
}
