"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Review, ReviewDocument, FieldRelation } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DiagramViewProps {
  review: Review;
}

const STATUS_COLORS = {
  match: { stroke: "#22c55e", fill: "#22c55e", bg: "bg-success/10", text: "text-success" },
  mismatch: { stroke: "#ef4444", fill: "#ef4444", bg: "bg-destructive/10", text: "text-destructive" },
  warning: { stroke: "#eab308", fill: "#eab308", bg: "bg-warning/10", text: "text-warning" },
};

interface NodePos {
  doc: ReviewDocument;
  x: number;
  y: number;
  w: number;
  h: number;
  fieldDots: { fieldName: string; localX: number; localY: number; status: "match" | "mismatch" | "warning" }[];
  connectionCount: number;
}

/* ---------- Force-directed layout ---------- */
function computeForceLayout(
  documents: ReviewDocument[],
  relations: FieldRelation[],
  width: number,
  height: number
): NodePos[] {
  const pedimento = documents.find((d) => d.isPedimento);
  const others = documents.filter((d) => !d.isPedimento);
  if (!pedimento) return [];

  // Count connections per document
  const connCount = new Map<string, number>();
  for (const d of documents) connCount.set(d.id, 0);
  for (const r of relations) {
    connCount.set(r.sourceDocId, (connCount.get(r.sourceDocId) || 0) + 1);
    connCount.set(r.targetDocId, (connCount.get(r.targetDocId) || 0) + 1);
  }

  // Get unique fields per doc from relations
  function getDocFields(docId: string) {
    const fieldMap = new Map<string, "match" | "mismatch" | "warning">();
    for (const r of relations) {
      if (r.sourceDocId === docId || r.targetDocId === docId) {
        const existing = fieldMap.get(r.fieldName);
        if (!existing || r.status === "mismatch" || (r.status === "warning" && existing === "match")) {
          fieldMap.set(r.fieldName, r.status);
        }
      }
    }
    return Array.from(fieldMap.entries()).map(([name, status]) => ({ fieldName: name, status }));
  }

  // Sort non-pedimento docs: most connected first, then group by classification
  const sorted = [...others].sort((a, b) => {
    const ca = connCount.get(a.id) || 0;
    const cb = connCount.get(b.id) || 0;
    if (cb !== ca) return cb - ca;
    return a.classification.localeCompare(b.classification);
  });

  // Node sizes
  const pedW = 200;
  const pedH = 160;
  const nodeW = 150;
  const nodeH = 110;

  // Center pedimento
  const cx = width / 2;
  const cy = height / 2;

  // Place nodes in elliptical tiers to avoid overlapping
  // Tier 1: Highly connected docs (>3 connections) in inner ring
  // Tier 2: Moderately connected (1-3) in outer ring
  // Tier 3: Zero connections furthest out
  const tier1: ReviewDocument[] = [];
  const tier2: ReviewDocument[] = [];
  const tier3: ReviewDocument[] = [];

  for (const doc of sorted) {
    const c = connCount.get(doc.id) || 0;
    if (c > 3) tier1.push(doc);
    else if (c > 0) tier2.push(doc);
    else tier3.push(doc);
  }

  // Radii for each tier - spread wider horizontally since screens are typically landscape
  const baseRx = Math.max(width * 0.28, 220);
  const baseRy = Math.max(height * 0.26, 180);
  const tierRadii = [
    { rx: baseRx, ry: baseRy },
    { rx: baseRx * 1.6, ry: baseRy * 1.5 },
    { rx: baseRx * 2.1, ry: baseRy * 1.9 },
  ];

  // Build field dots for a node
  function buildFieldDots(docId: string, nw: number, nh: number) {
    const fields = getDocFields(docId);
    const headerH = 28;
    const padding = 8;
    const usableW = nw - padding * 2;
    const usableH = nh - headerH - padding * 2;
    const cols = Math.max(1, Math.ceil(Math.sqrt(fields.length)));
    const rows = Math.max(1, Math.ceil(fields.length / cols));
    const spacingX = usableW / (cols + 1);
    const spacingY = usableH / (rows + 1);

    return fields.map((f, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      return {
        fieldName: f.fieldName,
        localX: padding + spacingX * (col + 1),
        localY: headerH + padding + spacingY * (row + 1),
        status: f.status,
      };
    });
  }

  // Pedimento node
  const nodes: NodePos[] = [
    {
      doc: pedimento,
      x: cx - pedW / 2,
      y: cy - pedH / 2,
      w: pedW,
      h: pedH,
      fieldDots: buildFieldDots(pedimento.id, pedW, pedH),
      connectionCount: connCount.get(pedimento.id) || 0,
    },
  ];

  // Place each tier
  const tiers = [tier1, tier2, tier3];
  tiers.forEach((tierDocs, tierIdx) => {
    if (tierDocs.length === 0) return;
    const { rx, ry } = tierRadii[tierIdx];
    const startAngle = -Math.PI / 2; // top
    const n = tierDocs.length;

    tierDocs.forEach((doc, i) => {
      // Spread evenly around the ellipse with offset per tier
      const angle = startAngle + (2 * Math.PI * i) / n + (tierIdx * Math.PI) / (n + 3);
      const nx = cx + rx * Math.cos(angle) - nodeW / 2;
      const ny = cy + ry * Math.sin(angle) - nodeH / 2;

      nodes.push({
        doc,
        x: nx,
        y: ny,
        w: nodeW,
        h: nodeH,
        fieldDots: buildFieldDots(doc.id, nodeW, nodeH),
        connectionCount: connCount.get(doc.id) || 0,
      });
    });
  });

  // Simple collision resolution: push overlapping nodes apart
  for (let iter = 0; iter < 20; iter++) {
    let moved = false;
    for (let i = 1; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const aCx = a.x + a.w / 2;
        const aCy = a.y + a.h / 2;
        const bCx = b.x + b.w / 2;
        const bCy = b.y + b.h / 2;
        const dx = bCx - aCx;
        const dy = bCy - aCy;
        const minDistX = (a.w + b.w) / 2 + 20;
        const minDistY = (a.h + b.h) / 2 + 16;

        if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
          // Push apart
          const pushX = (minDistX - Math.abs(dx)) * 0.5 * Math.sign(dx || 1);
          const pushY = (minDistY - Math.abs(dy)) * 0.5 * Math.sign(dy || 1);
          a.x -= pushX;
          a.y -= pushY;
          b.x += pushX;
          b.y += pushY;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  return nodes;
}

function shortLabel(name: string) {
  const n = name.replace(/\.(pdf|jpg|png)$/i, "");
  if (n.length <= 18) return n;
  return n.slice(0, 16) + "...";
}

export function DiagramView({ review }: DiagramViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [hoveredRelation, setHoveredRelation] = useState<FieldRelation | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const relations = review.fieldRelations || [];

  const nodes = useMemo(
    () => computeForceLayout(review.documents, relations, dimensions.width, dimensions.height),
    [review.documents, relations, dimensions]
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, NodePos>();
    for (const n of nodes) m.set(n.doc.id, n);
    return m;
  }, [nodes]);

  // Compute edges with absolute dot positions
  const edges = useMemo(() => {
    return relations
      .map((rel) => {
        const sourceNode = nodeMap.get(rel.sourceDocId);
        const targetNode = nodeMap.get(rel.targetDocId);
        if (!sourceNode || !targetNode) return null;

        const sourceDot = sourceNode.fieldDots.find((d) => d.fieldName === rel.fieldName);
        const targetDot = targetNode.fieldDots.find((d) => d.fieldName === rel.fieldName);
        if (!sourceDot || !targetDot) return null;

        const sx = sourceNode.x + sourceDot.localX;
        const sy = sourceNode.y + sourceDot.localY;
        const tx = targetNode.x + targetDot.localX;
        const ty = targetNode.y + targetDot.localY;

        // Curved control point: offset perpendicular to the line
        const mx = (sx + tx) / 2;
        const my = (sy + ty) / 2;
        const dx = tx - sx;
        const dy = ty - sy;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Perpendicular offset for curve, proportional to length
        const offsetMag = Math.min(len * 0.15, 40);
        const controlX = mx + (-dy / len) * offsetMag;
        const controlY = my + (dx / len) * offsetMag;

        return { relation: rel, x1: sx, y1: sy, x2: tx, y2: ty, cx: controlX, cy: controlY };
      })
      .filter(Boolean) as {
      relation: FieldRelation;
      x1: number; y1: number;
      x2: number; y2: number;
      cx: number; cy: number;
    }[];
  }, [relations, nodeMap]);

  const handleEdgeHover = useCallback(
    (rel: FieldRelation | null, e?: React.MouseEvent) => {
      setHoveredRelation(rel);
      if (e) setTooltipPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  function isEdgeDimmed(rel: FieldRelation) {
    if (!hoveredNodeId) return false;
    return rel.sourceDocId !== hoveredNodeId && rel.targetDocId !== hoveredNodeId;
  }

  // Compute SVG viewBox to contain all nodes with padding
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return `0 0 ${dimensions.width} ${dimensions.height}`;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 60;
    return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
  }, [nodes, dimensions]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto bg-background">
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        className="absolute inset-0"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const color = STATUS_COLORS[edge.relation.status];
          const dimmed = isEdgeDimmed(edge.relation);
          const isHovered = hoveredRelation?.id === edge.relation.id;
          return (
            <path
              key={`edge-${i}`}
              d={`M ${edge.x1} ${edge.y1} Q ${edge.cx} ${edge.cy} ${edge.x2} ${edge.y2}`}
              stroke={color.stroke}
              strokeWidth={isHovered ? 3 : 1.5}
              strokeOpacity={dimmed ? 0.06 : isHovered ? 1 : 0.4}
              fill="none"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={(e) => handleEdgeHover(edge.relation, e)}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => handleEdgeHover(null)}
            />
          );
        })}

        {/* Nodes (SVG foreignObject for HTML content) */}
        {nodes.map((node) => {
          const isPed = node.doc.isPedimento;
          const isHovered = hoveredNodeId === node.doc.id;
          const isDimmed = hoveredNodeId !== null && !isHovered;

          return (
            <foreignObject
              key={node.doc.id}
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
              onMouseEnter={() => setHoveredNodeId(node.doc.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
            >
              <div
                className={cn(
                  "w-full h-full rounded-lg border overflow-hidden transition-all duration-200",
                  isPed ? "border-primary/40 bg-card shadow-md" : "border-border bg-card/90",
                  isHovered && "ring-1 ring-primary/50 shadow-lg",
                  isDimmed && "opacity-40"
                )}
              >
                {/* Folded corner */}
                <div className="absolute top-0 right-0 w-4 h-4">
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-t-background border-l-[16px] border-l-transparent" />
                </div>

                {/* Label */}
                <div
                  className={cn(
                    "px-2 py-1.5 border-b text-[10px] font-medium truncate",
                    isPed ? "border-primary/20 text-primary bg-primary/5" : "border-border text-foreground"
                  )}
                >
                  {shortLabel(node.doc.name)}
                  {isPed && <span className="ml-1 text-[8px] text-primary/60">(Pedimento)</span>}
                </div>

                {/* Field dots */}
                <div className="relative w-full" style={{ height: node.h - 28 }}>
                  {node.fieldDots.map((dot, di) => {
                    const dotColor = STATUS_COLORS[dot.status];
                    return (
                      <div
                        key={di}
                        className="absolute w-2.5 h-2.5 rounded-full transition-transform hover:scale-150"
                        style={{
                          left: dot.localX - 5,
                          top: dot.localY - 28 - 5,
                          backgroundColor: dotColor.fill,
                          opacity: isDimmed ? 0.3 : 0.85,
                        }}
                        title={`${dot.fieldName}: ${dot.status}`}
                      />
                    );
                  })}
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredRelation && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x + 14, top: tooltipPos.y - 12 }}
        >
          <div className="bg-card border border-border rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[hoveredRelation.status].fill }} />
              <span className="text-xs font-semibold text-foreground">{hoveredRelation.fieldName}</span>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", STATUS_COLORS[hoveredRelation.status].bg, STATUS_COLORS[hoveredRelation.status].text)}>
                {hoveredRelation.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Source</span>
                <span className="font-mono text-foreground">{hoveredRelation.sourceValue}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Target</span>
                <span className="font-mono text-foreground">{hoveredRelation.targetValue}</span>
              </div>
            </div>
            {hoveredRelation.note && (
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                {hoveredRelation.note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-card/95 border border-border rounded-lg px-4 py-2.5 backdrop-blur-sm">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Legend</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-[10px] text-muted-foreground">Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
          <span className="text-[10px] text-muted-foreground">Mismatch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="text-[10px] text-muted-foreground">Warning</span>
        </div>
      </div>
    </div>
  );
}
