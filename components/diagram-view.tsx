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

interface NodeLayout {
  doc: ReviewDocument;
  x: number;
  y: number;
  w: number;
  h: number;
  fieldDots: { fieldName: string; x: number; y: number; status: "match" | "mismatch" | "warning" }[];
}

function computeLayout(
  documents: ReviewDocument[],
  relations: FieldRelation[],
  centerX: number,
  centerY: number
): NodeLayout[] {
  const pedimento = documents.find((d) => d.isPedimento);
  const others = documents.filter((d) => !d.isPedimento);

  if (!pedimento) return [];

  // Pedimento node - larger, centered
  const pedW = 180;
  const pedH = 140;

  // Get unique field names per doc from relations
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

  const pedFields = getDocFields(pedimento.id);

  // Place field dots inside pedimento node
  const pedFieldDots = pedFields.map((f, i) => {
    const cols = Math.ceil(Math.sqrt(pedFields.length));
    const col = i % cols;
    const row = Math.floor(i / cols);
    const dotSpacingX = pedW / (cols + 1);
    const dotSpacingY = (pedH - 30) / (Math.ceil(pedFields.length / cols) + 1);
    return {
      fieldName: f.fieldName,
      x: centerX - pedW / 2 + dotSpacingX * (col + 1),
      y: centerY - pedH / 2 + 30 + dotSpacingY * (row + 1),
      status: f.status,
    };
  });

  const nodes: NodeLayout[] = [
    {
      doc: pedimento,
      x: centerX - pedW / 2,
      y: centerY - pedH / 2,
      w: pedW,
      h: pedH,
      fieldDots: pedFieldDots,
    },
  ];

  // Place other nodes in a ring
  const radius = Math.min(centerX, centerY) * 0.7;
  const nodeW = 140;
  const nodeH = 100;

  others.forEach((doc, i) => {
    const angle = (2 * Math.PI * i) / others.length - Math.PI / 2;
    const nx = centerX + radius * Math.cos(angle) - nodeW / 2;
    const ny = centerY + radius * Math.sin(angle) - nodeH / 2;

    const docFields = getDocFields(doc.id);
    const fieldDots = docFields.map((f, fi) => {
      const cols = Math.ceil(Math.sqrt(docFields.length));
      const col = fi % cols;
      const row = Math.floor(fi / cols);
      const dotSpacingX = nodeW / (cols + 1);
      const dotSpacingY = (nodeH - 24) / (Math.ceil(docFields.length / cols) + 1);
      return {
        fieldName: f.fieldName,
        x: nx + dotSpacingX * (col + 1),
        y: ny + 24 + dotSpacingY * (row + 1),
        status: f.status,
      };
    });

    nodes.push({ doc, x: nx, y: ny, w: nodeW, h: nodeH, fieldDots });
  });

  return nodes;
}

// Short document label
function shortLabel(name: string) {
  if (name.length <= 16) return name;
  // Remove common extensions
  const n = name.replace(/\.(pdf|jpg|png)$/i, "");
  if (n.length <= 14) return n;
  return n.slice(0, 12) + "...";
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
    () =>
      computeLayout(
        review.documents,
        relations,
        dimensions.width / 2,
        dimensions.height / 2
      ),
    [review.documents, relations, dimensions]
  );

  // Build node map for quick lookup
  const nodeMap = useMemo(() => {
    const m = new Map<string, NodeLayout>();
    for (const n of nodes) m.set(n.doc.id, n);
    return m;
  }, [nodes]);

  // Compute edges
  const edges = useMemo(() => {
    return relations.map((rel) => {
      const sourceNode = nodeMap.get(rel.sourceDocId);
      const targetNode = nodeMap.get(rel.targetDocId);
      if (!sourceNode || !targetNode) return null;

      // Find closest field dots for this relation's fieldName
      const sourceDot = sourceNode.fieldDots.find((d) => d.fieldName === rel.fieldName);
      const targetDot = targetNode.fieldDots.find((d) => d.fieldName === rel.fieldName);

      if (!sourceDot || !targetDot) return null;

      // Quadratic bezier control point (midpoint offset toward center)
      const mx = (sourceDot.x + targetDot.x) / 2;
      const my = (sourceDot.y + targetDot.y) / 2;
      const cx = dimensions.width / 2;
      const cy = dimensions.height / 2;
      const controlX = mx + (cx - mx) * 0.15;
      const controlY = my + (cy - my) * 0.15;

      return {
        relation: rel,
        x1: sourceDot.x,
        y1: sourceDot.y,
        x2: targetDot.x,
        y2: targetDot.y,
        cx: controlX,
        cy: controlY,
      };
    }).filter(Boolean) as {
      relation: FieldRelation;
      x1: number; y1: number;
      x2: number; y2: number;
      cx: number; cy: number;
    }[];
  }, [relations, nodeMap, dimensions]);

  const handleEdgeHover = useCallback(
    (rel: FieldRelation | null, e?: React.MouseEvent) => {
      setHoveredRelation(rel);
      if (e) {
        setTooltipPos({ x: e.clientX, y: e.clientY });
      }
    },
    []
  );

  // Determine if an edge should be dimmed (when hovering a node)
  function isEdgeDimmed(rel: FieldRelation) {
    if (!hoveredNodeId) return false;
    return rel.sourceDocId !== hoveredNodeId && rel.targetDocId !== hoveredNodeId;
  }

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-background">
      <svg
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0"
      >
        {/* Edges */}
        {edges.map((edge, i) => {
          const color = STATUS_COLORS[edge.relation.status];
          const dimmed = isEdgeDimmed(edge.relation);
          return (
            <path
              key={`edge-${i}`}
              d={`M ${edge.x1} ${edge.y1} Q ${edge.cx} ${edge.cy} ${edge.x2} ${edge.y2}`}
              stroke={color.stroke}
              strokeWidth={hoveredRelation?.id === edge.relation.id ? 2.5 : 1.2}
              strokeOpacity={dimmed ? 0.08 : hoveredRelation?.id === edge.relation.id ? 0.9 : 0.35}
              fill="none"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={(e) => handleEdgeHover(edge.relation, e)}
              onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
              onMouseLeave={() => handleEdgeHover(null)}
            />
          );
        })}
      </svg>

      {/* Nodes (rendered as positioned divs for easier text/interaction) */}
      {nodes.map((node) => {
        const isPed = node.doc.isPedimento;
        const isHovered = hoveredNodeId === node.doc.id;
        return (
          <div
            key={node.doc.id}
            className={cn(
              "absolute rounded-lg border transition-all duration-200 overflow-hidden",
              isPed ? "border-primary/30 bg-card" : "border-border bg-card/80",
              isHovered && "ring-1 ring-primary/40 shadow-lg",
              hoveredNodeId && !isHovered && "opacity-50"
            )}
            style={{
              left: node.x,
              top: node.y,
              width: node.w,
              height: node.h,
            }}
            onMouseEnter={() => setHoveredNodeId(node.doc.id)}
            onMouseLeave={() => setHoveredNodeId(null)}
          >
            {/* Folded corner effect */}
            <div className="absolute top-0 right-0 w-4 h-4">
              <div className="absolute top-0 right-0 w-0 h-0 border-t-[16px] border-t-background border-l-[16px] border-l-transparent" />
            </div>

            {/* Document label */}
            <div className={cn(
              "px-2 py-1.5 border-b text-[10px] font-medium truncate",
              isPed ? "border-primary/20 text-primary bg-primary/5" : "border-border text-foreground"
            )}>
              {shortLabel(node.doc.name)}
            </div>

            {/* Field dots */}
            <div className="relative flex-1 p-1.5">
              {node.fieldDots.map((dot, di) => {
                const dotColor = STATUS_COLORS[dot.status];
                return (
                  <div
                    key={di}
                    className="absolute w-2 h-2 rounded-full transition-transform hover:scale-150"
                    style={{
                      left: dot.x - node.x - 4,
                      top: dot.y - node.y - 4,
                      backgroundColor: dotColor.fill,
                      opacity: hoveredNodeId && hoveredNodeId !== node.doc.id ? 0.3 : 0.8,
                    }}
                    title={`${dot.fieldName}: ${dot.status}`}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Tooltip */}
      {hoveredRelation && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 10,
          }}
        >
          <div className="bg-card border border-border rounded-lg shadow-xl p-3 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[hoveredRelation.status].fill }}
              />
              <span className="text-xs font-semibold text-foreground">
                {hoveredRelation.fieldName}
              </span>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                STATUS_COLORS[hoveredRelation.status].bg,
                STATUS_COLORS[hoveredRelation.status].text
              )}>
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
      <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-card/90 border border-border rounded-lg px-4 py-2">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Legend</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[10px] text-muted-foreground">Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span className="text-[10px] text-muted-foreground">Mismatch</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-warning" />
          <span className="text-[10px] text-muted-foreground">Warning</span>
        </div>
      </div>
    </div>
  );
}
