'use client';
import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { mockEntities, type Entity } from '../../data/mockEntities';
import { mockRelationships, type Relationship } from '../../data/mockRelationships';
import { fetchGraph } from '../../lib/api';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ZoomIn, ZoomOut, Maximize2, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function CytoscapeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cyInstance, setCyInstance] = useState<cytoscape.Core | null>(null);
  const setSelectedEntityId = useWorkspaceStore(state => state.setSelectedEntityId);
  const [activeDetails, setActiveDetails] = useState<Entity | null>(null);

  const [graph, setGraph] = useState<{ nodes: Entity[]; edges: Relationship[] } | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // Load the real graph from the backend; fall back to bundled demo data when
  // the API is unreachable or returns nothing.
  useEffect(() => {
    let cancelled = false;
    fetchGraph()
      .then((g) => {
        if (cancelled) return;
        if (g.nodes.length === 0) {
          setGraph({ nodes: mockEntities.slice(0, 15), edges: mockRelationships });
          setUsingFallback(true);
        } else {
          setGraph(g);
          setUsingFallback(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setGraph({ nodes: mockEntities.slice(0, 15), edges: mockRelationships });
        setUsingFallback(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current || !graph) return;

    const nodes = graph.nodes.map(e => ({
      data: {
        id: e.id,
        label: e.name,
        type: e.type,
        classification: e.classification
      }
    }));

    // Only render edges whose endpoints are present in the node set.
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    const edges = graph.edges
      .filter(r => nodeIds.has(r.source) && nodeIds.has(r.target))
      .map(r => ({
        data: {
          id: r.id,
          source: r.source,
          target: r.target,
          label: r.label
        }
      }));

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#06B6D4',
            'label': 'data(label)',
            'color': '#E2E8F0',
            'font-family': 'monospace',
            'font-size': '10px',
            'text-valign': 'center',
            'text-halign': 'center',
            'width': '50px',
            'height': '50px',
            'border-width': '2px',
            'border-color': '#1E2A3A'
          }
        },
        {
          selector: 'node[type="person"]',
          style: {
            'background-color': '#7C3AED',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node[type="organization"]',
          style: {
            'background-color': '#2563EB',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#475569',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'color': '#94A3B8',
            'text-rotation': 'autorotate'
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: false
      } as any
    });

    cy.on('tap', 'node', (evt) => {
      const node = evt.target;
      const entityId = node.id();
      setSelectedEntityId(entityId);
      const fullEntity = graph.nodes.find(e => e.id === entityId) ?? null;
      setActiveDetails(fullEntity);
    });

    setCyInstance(cy);

    return () => {
      cy.destroy();
    };
  }, [setSelectedEntityId, graph]);

  return (
    <div className="w-full h-full flex relative bg-[#07090F]">
      <div className="flex-1 h-full relative" ref={containerRef} />

      {usingFallback && (
        <div className="absolute top-4 right-4 z-10 px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[10px] font-mono">
          DEMO DATA (API offline / empty)
        </div>
      )}

      {/* Graph Floating controls */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
        <button onClick={() => cyInstance?.zoom(cyInstance.zoom() + 0.1)} className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all">
          <ZoomIn size={16} />
        </button>
        <button onClick={() => cyInstance?.zoom(cyInstance.zoom() - 0.1)} className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all">
          <ZoomOut size={16} />
        </button>
        <button onClick={() => cyInstance?.fit()} className="p-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-all">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Details Side Panel */}
      {activeDetails && (
        <div className="w-80 bg-[#0c0e17] border-l border-gray-800/80 p-5 space-y-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="text-[9px] font-bold font-mono text-cyan-400 uppercase tracking-widest">{activeDetails.type}</span>
              <h4 className="text-sm font-bold font-mono text-white leading-snug">{activeDetails.name}</h4>
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold font-mono uppercase text-yellow-500`}>
                <ShieldAlert size={10} />
                <span>{activeDetails.classification}</span>
              </span>
            </div>

            <div className="space-y-2 text-xxs font-mono bg-gray-950/40 p-4 border border-gray-800/55 rounded-xl">
              {Object.entries(activeDetails.properties).slice(0, 5).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-500 capitalize">{k.split('_').join(' ')}:</span>
                  <span className="text-gray-300 font-medium truncate max-w-[130px]">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/entity/${activeDetails.id}`}
            className="w-full text-center py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono transition-all block"
          >
            Open Profile
          </Link>
        </div>
      )}
    </div>
  );
}
