'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import WorkspaceLayout from '../../../components/layout/WorkspaceLayout';

const CytoscapeGraph = dynamic(() => import('../../../components/graph/CytoscapeGraph'), {
  ssr: false,
});

export default function GraphAnalysisPage({ params }: { params: { caseId: string } }) {
  return (
    <WorkspaceLayout>
      <div className="w-full h-full flex flex-col">
        {/* Header Bar */}
        <div className="h-14 border-b border-gray-800 bg-[#0c0e17] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold font-mono tracking-wide text-white uppercase">Link Analysis Workspace</h2>
            <span className="text-xxs font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded">
              Active Case: {params.caseId}
            </span>
          </div>
        </div>

        {/* Graph Canvas */}
        <div className="flex-1 min-h-0 relative">
          <CytoscapeGraph />
        </div>
      </div>
    </WorkspaceLayout>
  );
}
