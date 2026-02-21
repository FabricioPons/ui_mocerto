"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Review, ReviewDocument, FieldRelation, DocumentClassification } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  FileText,
  Ship,
  Receipt,
  Package,
  FileCheck,
  Shield,
  Scale,
  Award,
  Bell,
  Truck,
  FolderOpen,
  ArrowLeftRight,
  ScanLine,
  Umbrella,
  FlaskConical,
  File,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";

/* ─────── Constants ─────── */

const CLASSIFICATION_META: Record<
  DocumentClassification,
  { label: string; shortLabel: string; color: string; borderColor: string; bgColor: string; icon: typeof FileText }
> = {
  pedimento: { label: "Pedimento", shortLabel: "PED", color: "text-foreground", borderColor: "border-primary/50", bgColor: "bg-primary/5", icon: FileText },
  commercial_invoice: { label: "Invoice", shortLabel: "INV", color: "text-blue-400", borderColor: "border-blue-500/30", bgColor: "bg-blue-500/8", icon: Receipt },
  bill_of_lading: { label: "Bill of Lading", shortLabel: "B/L", color: "text-cyan-400", borderColor: "border-cyan-500/30", bgColor: "bg-cyan-500/8", icon: Ship },
  packing_list: { label: "Packing List", shortLabel: "PKG", color: "text-amber-400", borderColor: "border-amber-500/30", bgColor: "bg-amber-500/8", icon: Package },
  carta_encomienda: { label: "Carta Encomienda", shortLabel: "C/E", color: "text-emerald-400", borderColor: "border-emerald-500/30", bgColor: "bg-emerald-500/8", icon: FileCheck },
  carta_3_1_8: { label: "Carta 3.1.8", shortLabel: "3.1.8", color: "text-rose-400", borderColor: "border-rose-500/30", bgColor: "bg-rose-500/8", icon: Shield },
  manifestacion_de_valor: { label: "Manif. Valor", shortLabel: "M/V", color: "text-violet-400", borderColor: "border-violet-500/30", bgColor: "bg-violet-500/8", icon: Scale },
  certificado_produccion: { label: "Cert. Produccion", shortLabel: "C/P", color: "text-lime-400", borderColor: "border-lime-500/30", bgColor: "bg-lime-500/8", icon: Award },
  aviso_automatico: { label: "Aviso Automatico", shortLabel: "A/A", color: "text-orange-400", borderColor: "border-orange-500/30", bgColor: "bg-orange-500/8", icon: Bell },
  delivery_order: { label: "Delivery Order", shortLabel: "D/O", color: "text-teal-400", borderColor: "border-teal-500/30", bgColor: "bg-teal-500/8", icon: Truck },
  document_compilation: { label: "Doc. Compilation", shortLabel: "DOC", color: "text-indigo-400", borderColor: "border-indigo-500/30", bgColor: "bg-indigo-500/8", icon: FolderOpen },
  equipment_interchange_receipt: { label: "EIR", shortLabel: "EIR", color: "text-pink-400", borderColor: "border-pink-500/30", bgColor: "bg-pink-500/8", icon: ArrowLeftRight },
  vucem_acuse: { label: "VUCEM Acuse", shortLabel: "VCM", color: "text-sky-400", borderColor: "border-sky-500/30", bgColor: "bg-sky-500/8", icon: ScanLine },
  cargo_insurance: { label: "Cargo Insurance", shortLabel: "INS", color: "text-yellow-400", borderColor: "border-yellow-500/30", bgColor: "bg-yellow-500/8", icon: Umbrella },
  certificate_of_analysis: { label: "COA", shortLabel: "COA", color: "text-fuchsia-400", borderColor: "border-fuchsia-500/30", bgColor: "bg-fuchsia-500/8", icon: FlaskConical },
  scanned_docs: { label: "Scanned Docs", shortLabel: "SCN", color: "text-stone-400", borderColor: "border-stone-500/30", bgColor: "bg-stone-500/8", icon: ScanLine },
  other: { label: "Other", shortLabel: "OTH", color: "text-muted-foreground", borderColor: "border-border", bgColor: "bg-muted/10", icon: File },
};

const STATUS_COLORS = {
  match: { stroke: "#22c55e", label: "Match", badgeBg: "bg-emerald-500/15", badgeText: "text-emerald-500", darkBadgeText: "dark:text-emerald-400" },
  mismatch: { stroke: "#ef4444", label: "Mismatch", badgeBg: "bg-red-500/15", badgeText: "text-red-600", darkBadgeText: "dark:text-red-400" },
  warning: { stroke: "#eab308", label: "Warning", badgeBg: "bg-amber-500/15", badgeText: "text-amber-600", darkBadgeText: "dark:text-amber-400" },
};

/* ─────── Layout types ─────── */

interface NodeLayout {
  doc: ReviewDocument;
  x: number;
  y: number;
  w: number;
  h: number;
  connectionCount: number;
  fieldSummary: { match: number; mismatch: number; warning: number };
  connectedFields: string[];
}

interface EdgeLayout {
  relation: FieldRelation;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
}

/* ─────── Layout computation ─────── */

function computeLayout(
  documents: ReviewDocument[],
  relations: FieldRelation[],
  width: number,
  height: number
): NodeLayout[] {
  const pedimento = documents.find((d) => d.isPedimento);
  const others = documents.filter((d) => !d.isPedimento);
  if (!pedimento) return [];

  // Count connections and field summary per document
  const connCount = new Map<string, number>();
  const fieldSummary = new Map<string, { match: number; mismatch: number; warning: number }>();
  const connectedFields = new Map<string, Set<string>>();

  for (const d of documents) {
    connCount.set(d.id, 0);
    fieldSummary.set(d.id, { match: 0, mismatch: 0, warning: 0 });
    connectedFields.set(d.id, new Set());
  }

  for (const r of relations) {
    connCount.set(r.sourceDocId, (connCount.get(r.sourceDocId) || 0) + 1);
    connCount.set(r.targetDocId, (connCount.get(r.targetDocId) || 0) + 1);

    const srcFields = connectedFields.get(r.sourceDocId);
    const tgtFields = connectedFields.get(r.targetDocId);
    if (srcFields) srcFields.add(r.fieldName);
    if (tgtFields) tgtFields.add(r.fieldName);

    // Count unique field+status per doc (deduplicate by fieldName for summary)
    for (const docId of [r.sourceDocId, r.targetDocId]) {
      const summary = fieldSummary.get(docId);
      if (summary) {
        summary[r.status]++;
      }
    }
  }

  // Sort by connections
  const sorted = [...others].sort((a, b) => {
    const ca = connCount.get(a.id) || 0;
    const cb = connCount.get(b.id) || 0;
    if (cb !== ca) return cb - ca;
    return a.classification.localeCompare(b.classification);
  });

  const pedW = 220;
  const pedH = 120;
  const nodeW = 190;
  const nodeH = 100;

  const cx = width / 2;
  const cy = height / 2;

  // Tier system
  const tier1: ReviewDocument[] = [];
  const tier2: ReviewDocument[] = [];
  const tier3: ReviewDocument[] = [];

  for (const doc of sorted) {
    const c = connCount.get(doc.id) || 0;
    if (c > 3) tier1.push(doc);
    else if (c > 0) tier2.push(doc);
    else tier3.push(doc);
  }

  const baseRx = Math.max(width * 0.26, 240);
  const baseRy = Math.max(height * 0.24, 190);
  const tierRadii = [
    { rx: baseRx, ry: baseRy },
    { rx: baseRx * 1.55, ry: baseRy * 1.45 },
    { rx: baseRx * 2.0, ry: baseRy * 1.85 },
  ];

  const buildNode = (doc: ReviewDocument, x: number, y: number, w: number, h: number): NodeLayout => ({
    doc,
    x,
    y,
    w,
    h,
    connectionCount: connCount.get(doc.id) || 0,
    fieldSummary: fieldSummary.get(doc.id) || { match: 0, mismatch: 0, warning: 0 },
    connectedFields: Array.from(connectedFields.get(doc.id) || []),
  });

  const nodes: NodeLayout[] = [buildNode(pedimento, cx - pedW / 2, cy - pedH / 2, pedW, pedH)];

  const tiers = [tier1, tier2, tier3];
  tiers.forEach((tierDocs, tierIdx) => {
    if (tierDocs.length === 0) return;
    const { rx, ry } = tierRadii[tierIdx];
    const startAngle = -Math.PI / 2;
    const n = tierDocs.length;

    tierDocs.forEach((doc, i) => {
      const angle = startAngle + (2 * Math.PI * i) / n + (tierIdx * Math.PI) / (n + 3);
      const nx = cx + rx * Math.cos(angle) - nodeW / 2;
      const ny = cy + ry * Math.sin(angle) - nodeH / 2;
      nodes.push(buildNode(doc, nx, ny, nodeW, nodeH));
    });
  });

  // Collision resolution
  for (let iter = 0; iter < 25; iter++) {
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
        const minDistX = (a.w + b.w) / 2 + 24;
        const minDistY = (a.h + b.h) / 2 + 20;

        if (Math.abs(dx) < minDistX && Math.abs(dy) < minDistY) {
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

function shortLabel(name: string, maxLen = 22) {
  const n = name.replace(/\.(pdf|jpg|png)$/i, "");
  if (n.length <= maxLen) return n;
  return n.slice(0, maxLen - 1) + "\u2026";
}

/* ─────── Edge computation ─────── */

function computeEdges(
  relations: FieldRelation[],
  nodeMap: Map<string, NodeLayout>
): EdgeLayout[] {
  // Group relations by source-target pair to offset overlapping edges
  const pairGroups = new Map<string, FieldRelation[]>();
  for (const rel of relations) {
    const key = [rel.sourceDocId, rel.targetDocId].sort().join("::");
    const arr = pairGroups.get(key) || [];
    arr.push(rel);
    pairGroups.set(key, arr);
  }

  const edges: EdgeLayout[] = [];

  for (const [, group] of pairGroups) {
    group.forEach((rel, idx) => {
      const sourceNode = nodeMap.get(rel.sourceDocId);
      const targetNode = nodeMap.get(rel.targetDocId);
      if (!sourceNode || !targetNode) return;

      // Connect from center of each node
      const sx = sourceNode.x + sourceNode.w / 2;
      const sy = sourceNode.y + sourceNode.h / 2;
      const tx = targetNode.x + targetNode.w / 2;
      const ty = targetNode.y + targetNode.h / 2;

      const mx = (sx + tx) / 2;
      const my = (sy + ty) / 2;
      const dx = tx - sx;
      const dy = ty - sy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      // Spread multiple edges between same pair with increasing perpendicular offset
      const spreadIndex = idx - (group.length - 1) / 2;
      const spreadMag = Math.min(len * 0.12, 35) * spreadIndex;
      const baseCurveMag = Math.min(len * 0.08, 25);

      const controlX = mx + (-dy / len) * (baseCurveMag + spreadMag);
      const controlY = my + (dx / len) * (baseCurveMag + spreadMag);

      edges.push({ relation: rel, x1: sx, y1: sy, x2: tx, y2: ty, cx: controlX, cy: controlY });
    });
  }

  return edges;
}

/* ─────── Document Node Component ─────── */

function DocumentNode({
  node,
  isHovered,
  isDimmed,
  isConnectedToHovered,
  onHover,
  onLeave,
}: {
  node: NodeLayout;
  isHovered: boolean;
  isDimmed: boolean;
  isConnectedToHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
}) {
  const isPed = node.doc.isPedimento;
  const meta = CLASSIFICATION_META[node.doc.classification];
  const Icon = meta.icon;
  const { match: m, mismatch: mm, warning: w } = node.fieldSummary;
  const total = m + mm + w;

  return (
    <foreignObject x={node.x} y={node.y} width={node.w} height={node.h} onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div
        className={cn(
          "w-full h-full rounded-lg border-2 overflow-hidden transition-all duration-200 flex flex-col",
          isPed
            ? "border-primary/60 bg-card shadow-lg shadow-primary/5"
            : cn("bg-card", meta.borderColor),
          isHovered && "ring-2 ring-primary/40 shadow-xl scale-[1.03]",
          isConnectedToHovered && !isHovered && "ring-1 ring-primary/20 shadow-md",
          isDimmed && "opacity-25 scale-[0.98]"
        )}
        style={{ transition: "all 0.2s ease" }}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 border-b",
            isPed ? "border-primary/20 bg-primary/5" : cn("border-border/50", meta.bgColor)
          )}
        >
          <Icon className={cn("h-3.5 w-3.5 shrink-0", isPed ? "text-foreground" : meta.color)} />
          <span className={cn("text-[11px] font-semibold truncate flex-1", isPed ? "text-foreground" : "text-foreground")}>
            {shortLabel(node.doc.name)}
          </span>
          <span
            className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider",
              isPed ? "bg-primary/10 text-primary" : cn(meta.bgColor, meta.color)
            )}
          >
            {meta.shortLabel}
          </span>
        </div>

        {/* Body: field status summary */}
        <div className="flex-1 flex items-center px-3 py-1.5">
          {total > 0 ? (
            <div className="flex items-center gap-2 w-full">
              {/* Mini status bar */}
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-muted/50">
                  {m > 0 && (
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(m / total) * 100}%` }} />
                  )}
                  {w > 0 && (
                    <div className="bg-amber-500 transition-all" style={{ width: `${(w / total) * 100}%` }} />
                  )}
                  {mm > 0 && (
                    <div className="bg-red-500 transition-all" style={{ width: `${(mm / total) * 100}%` }} />
                  )}
                </div>
                <div className="flex items-center gap-2.5 text-[10px]">
                  {m > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      <span className="text-muted-foreground">{m}</span>
                    </span>
                  )}
                  {w > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                      <span className="text-muted-foreground">{w}</span>
                    </span>
                  )}
                  {mm > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                      <span className="text-muted-foreground">{mm}</span>
                    </span>
                  )}
                </div>
              </div>
              {/* Total count badge */}
              <div className="flex flex-col items-center shrink-0">
                <span className="text-lg font-bold text-foreground leading-none">{total}</span>
                <span className="text-[9px] text-muted-foreground">fields</span>
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-muted-foreground/60 italic">No connections</span>
          )}
        </div>

        {/* Pedimento decoration */}
        {isPed && (
          <div className="h-0.5 w-full gradient-accent opacity-60" />
        )}
      </div>
    </foreignObject>
  );
}

/* ─────── Main Component ─────── */

export function DiagramView({ review }: { review: Review }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [hoveredRelation, setHoveredRelation] = useState<FieldRelation | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [activeFilter, setActiveFilter] = useState<"all" | "match" | "mismatch" | "warning">("all");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const relations = review.fieldRelations || [];

  const nodes = useMemo(
    () => computeLayout(review.documents, relations, dimensions.width, dimensions.height),
    [review.documents, relations, dimensions]
  );

  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeLayout>();
    for (const n of nodes) m.set(n.doc.id, n);
    return m;
  }, [nodes]);

  const edges = useMemo(() => computeEdges(relations, nodeMap), [relations, nodeMap]);

  const filteredEdges = useMemo(() => {
    if (activeFilter === "all") return edges;
    return edges.filter((e) => e.relation.status === activeFilter);
  }, [edges, activeFilter]);

  const handleEdgeHover = useCallback((rel: FieldRelation | null, e?: React.MouseEvent) => {
    setHoveredRelation(rel);
    if (e) setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  // Determine connected nodes when hovering a node
  const connectedNodeIds = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const ids = new Set<string>();
    ids.add(hoveredNodeId);
    for (const r of relations) {
      if (r.sourceDocId === hoveredNodeId) ids.add(r.targetDocId);
      if (r.targetDocId === hoveredNodeId) ids.add(r.sourceDocId);
    }
    return ids;
  }, [hoveredNodeId, relations]);

  // ViewBox
  const viewBox = useMemo(() => {
    if (nodes.length === 0) return `0 0 ${dimensions.width} ${dimensions.height}`;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    const pad = 80;
    const vw = maxX - minX + pad * 2;
    const vh = maxY - minY + pad * 2;
    const cx = minX - pad + vw / 2;
    const cy = minY - pad + vh / 2;
    const scaledW = vw / zoom;
    const scaledH = vh / zoom;
    return `${cx - scaledW / 2} ${cy - scaledH / 2} ${scaledW} ${scaledH}`;
  }, [nodes, dimensions, zoom]);

  // Summary counts
  const summary = useMemo(() => {
    const s = { match: 0, mismatch: 0, warning: 0 };
    for (const r of relations) s[r.status]++;
    return s;
  }, [relations]);

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-background">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        className="absolute inset-0"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Arrowheads for each status */}
          {(["match", "mismatch", "warning"] as const).map((status) => (
            <marker
              key={status}
              id={`arrow-${status}`}
              viewBox="0 0 10 6"
              refX="10"
              refY="3"
              markerWidth="8"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 3 L 0 6 z" fill={STATUS_COLORS[status].stroke} />
            </marker>
          ))}
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Edges */}
        {filteredEdges.map((edge, i) => {
          const color = STATUS_COLORS[edge.relation.status];
          const isEdgeHovered = hoveredRelation?.id === edge.relation.id;
          const isNodeDimming = hoveredNodeId !== null;
          const isEdgeConnected =
            !isNodeDimming ||
            edge.relation.sourceDocId === hoveredNodeId ||
            edge.relation.targetDocId === hoveredNodeId;

          return (
            <g key={`edge-${i}`}>
              {/* Hit area (wider invisible stroke for easier hover) */}
              <path
                d={`M ${edge.x1} ${edge.y1} Q ${edge.cx} ${edge.cy} ${edge.x2} ${edge.y2}`}
                stroke="transparent"
                strokeWidth={16}
                fill="none"
                className="cursor-pointer"
                onMouseEnter={(e) => handleEdgeHover(edge.relation, e)}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => handleEdgeHover(null)}
              />
              {/* Visible edge */}
              <path
                d={`M ${edge.x1} ${edge.y1} Q ${edge.cx} ${edge.cy} ${edge.x2} ${edge.y2}`}
                stroke={color.stroke}
                strokeWidth={isEdgeHovered ? 3 : 2}
                strokeOpacity={!isEdgeConnected ? 0.07 : isEdgeHovered ? 1 : 0.5}
                strokeDasharray={edge.relation.status === "warning" ? "6 4" : undefined}
                fill="none"
                markerEnd={`url(#arrow-${edge.relation.status})`}
                filter={isEdgeHovered ? "url(#glow)" : undefined}
                className="transition-all duration-200 pointer-events-none"
              />
              {/* Field name label on hovered edge */}
              {isEdgeHovered && (
                <text
                  x={edge.cx}
                  y={edge.cy - 8}
                  textAnchor="middle"
                  className="text-[9px] font-semibold fill-foreground pointer-events-none"
                >
                  {edge.relation.fieldName}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node) => {
          const isHovered = hoveredNodeId === node.doc.id;
          const isDimmed = hoveredNodeId !== null && !connectedNodeIds.has(node.doc.id);
          const isConnectedToHovered = hoveredNodeId !== null && connectedNodeIds.has(node.doc.id) && !isHovered;

          return (
            <DocumentNode
              key={node.doc.id}
              node={node}
              isHovered={isHovered}
              isDimmed={isDimmed}
              isConnectedToHovered={isConnectedToHovered}
              onHover={() => setHoveredNodeId(node.doc.id)}
              onLeave={() => setHoveredNodeId(null)}
            />
          );
        })}
      </svg>

      {/* Edge Tooltip */}
      {hoveredRelation && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: tooltipPos.x + 16, top: tooltipPos.y - 14 }}
        >
          <div className="bg-card border border-border rounded-xl shadow-2xl p-3.5 max-w-xs animate-slide-up">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[hoveredRelation.status].stroke }} />
              <span className="text-xs font-bold text-foreground">{hoveredRelation.fieldName}</span>
              <span
                className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  STATUS_COLORS[hoveredRelation.status].badgeBg,
                  STATUS_COLORS[hoveredRelation.status].badgeText,
                  STATUS_COLORS[hoveredRelation.status].darkBadgeText
                )}
              >
                {STATUS_COLORS[hoveredRelation.status].label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="flex flex-col gap-0.5 p-2 rounded-md bg-secondary/60">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Source</span>
                <span className="font-mono text-foreground font-medium">{hoveredRelation.sourceValue}</span>
              </div>
              <div className="flex flex-col gap-0.5 p-2 rounded-md bg-secondary/60">
                <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">Target</span>
                <span className="font-mono text-foreground font-medium">{hoveredRelation.targetValue}</span>
              </div>
            </div>
            {hoveredRelation.note && (
              <p className="text-[10px] text-muted-foreground mt-2.5 leading-relaxed border-t border-border pt-2">
                {hoveredRelation.note}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top bar: summary stats + filter */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        {(["all", "match", "mismatch", "warning"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          const count = filter === "all" ? relations.length : summary[filter];
          return (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border",
                isActive
                  ? "bg-card border-border shadow-sm text-foreground"
                  : "bg-card/60 border-transparent text-muted-foreground hover:bg-card hover:border-border"
              )}
            >
              {filter !== "all" && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_COLORS[filter].stroke }} />
              )}
              <span className="capitalize">{filter}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", isActive ? "bg-secondary text-foreground" : "bg-secondary/50 text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-card/95 border border-border rounded-lg p-1 backdrop-blur-sm">
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.15, 2.5))}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="text-[10px] font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          onClick={() => setZoom(1)}
          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Reset zoom"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-card/95 border border-border rounded-lg px-4 py-2.5 backdrop-blur-sm">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Legend</span>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-emerald-500 rounded-full" />
          <span className="text-[10px] text-muted-foreground">Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-red-500 rounded-full" />
          <span className="text-[10px] text-muted-foreground">Mismatch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-0.5 bg-amber-500 rounded-full border-dashed" style={{ borderTop: "2px dashed #eab308", height: 0, backgroundColor: "transparent" }} />
          <span className="text-[10px] text-muted-foreground">Warning</span>
        </div>
        <div className="w-px h-3.5 bg-border" />
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border-2 border-primary/50 bg-primary/5" />
          <span className="text-[10px] text-muted-foreground">Pedimento</span>
        </div>
      </div>
    </div>
  );
}
