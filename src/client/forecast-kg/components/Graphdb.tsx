import React, { useEffect, useRef, useState } from "react";
import { GraphDbData, GraphNode, GraphRelationship } from "../utils/graphModel";

interface GraphDbViewProps {
  data: GraphDbData;
  theme?: "light" | "dark";
}

const LABEL_COLORS: Record<string, string> = {
  CostCenter: "#f59e0b",
  MVDetail: "#ec4899",
  Record: "#0284c7",
  CostCenterBridge: "#0284c7",
};

function getNodeColor(labels: string[]): string {
  for (const label of labels) {
    if (LABEL_COLORS[label]) return LABEL_COLORS[label];
  }
  return "#6366f1";
}

export function GraphDbView({ data, theme = "light" }: GraphDbViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, relationships } = data;
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; node: GraphNode } | null>(null);

  const isLight = theme === "light";
  const bgColor = isLight ? "#ffffff" : "#1e293b";
  const borderColor = isLight ? "#e2e8f0" : "#334155";
  const textColor = isLight ? "#1e293b" : "#e2e8f0";
  const relColor = isLight ? "#94a3b8" : "#64748b";

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const layoutNodes: Required<GraphNode>[] = nodes.map((n: GraphNode) => ({
      ...n,
      x: n.x || Math.random() * width,
      y: n.y || Math.random() * height,
      vx: 0,
      vy: 0,
    }));

    const nodeById = new Map(layoutNodes.map((n: Required<GraphNode>) => [n.id, n]));

    let transform = { x: 0, y: 0, k: 1 };
    let isDragging = false;
    let dragNode: GraphNode | null = null;
    let panStart = { x: 0, y: 0 };

    const world = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(world);

    const applyTransform = () => {
      world.setAttribute("transform", `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
    };
    applyTransform();

    // Relationship arrows
    const arrowGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const relEls: {
      line: SVGLineElement;
      label: SVGTextElement;
      labelBg: SVGRectElement;
      path: SVGPathElement;
      rel: GraphRelationship;
    }[] = [];

    for (const rel of relationships) {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", relColor);
      line.setAttribute("stroke-width", "1.5");
      g.appendChild(line);

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("fill", relColor);
      g.appendChild(path);

      const labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      labelBg.setAttribute("fill", bgColor);
      labelBg.setAttribute("stroke", borderColor);
      labelBg.setAttribute("stroke-width", "0.5");
      labelBg.setAttribute("rx", "2");
      g.appendChild(labelBg);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("fill", textColor);
      label.setAttribute("font-size", "8");
      label.setAttribute("font-family", "sans-serif");
      label.setAttribute("font-weight", "600");
      label.setAttribute("text-anchor", "middle");
      label.setAttribute("dy", "3");
      label.setAttribute("pointer-events", "none");
      label.textContent = rel.type;
      g.appendChild(label);

      arrowGroup.appendChild(g);
      relEls.push({ line, label, labelBg, path, rel });
    }
    world.appendChild(arrowGroup);

    // Nodes
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodeEls: {
      group: SVGGElement;
      circle: SVGCircleElement;
      text: SVGTextElement;
      node: GraphNode;
    }[] = [];

    const NODE_RADIUS = 22;

    for (const n of layoutNodes) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.style.cursor = "pointer";
      const color = getNodeColor(n.labels);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", String(NODE_RADIUS));
      circle.setAttribute("fill", color);
      circle.setAttribute("stroke", isLight ? "#ffffff" : "#0f172a");
      circle.setAttribute("stroke-width", "2");
      group.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("fill", "#ffffff");
      text.setAttribute("font-size", "11");
      text.setAttribute("font-family", "sans-serif");
      text.setAttribute("font-weight", "700");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dy", "4");
      text.setAttribute("pointer-events", "none");
      const initial = n.labels[0]?.slice(0, 2).toUpperCase() || "N";
      text.textContent = initial;
      group.appendChild(text);

      group.addEventListener("mouseenter", (e) => {
        const rect = svg.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12, node: n });
      });
      group.addEventListener("mouseleave", () => setTooltip(null));
      group.addEventListener("click", (e) => {
        e.stopPropagation();
        setSelected(n);
      });
      group.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        isDragging = true;
        dragNode = n;
        group.style.cursor = "grabbing";
        restart();
      });

      nodeGroup.appendChild(group);
      nodeEls.push({ group, circle, text, node: n });
    }
    world.appendChild(nodeGroup);

    // Force simulation
    const nodeCount = layoutNodes.length;
    const linkDistance = 160;
    const repulsionBase = 8000 + nodeCount * 120;
    const centerForce = 0.015;
    const damping = 0.92;
    const maxSpeed = 8;
    const alphaDecay = 0.015;
    const minAlpha = 0.002;
    const collisionPadding = 12;

    let alpha = 1;
    let rafId: number;
    let running = true;

    const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

    const update = () => {
      alpha = Math.max(minAlpha, alpha - alphaDecay);
      const repulsion = repulsionBase * alpha;
      const attraction = 0.05 * alpha;
      const collision = 0.08 * alpha;

      for (let a = 0; a < layoutNodes.length; a++) {
        for (let b = a + 1; b < layoutNodes.length; b++) {
          const n1 = layoutNodes[a];
          const n2 = layoutNodes[b];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          n1.vx += fx;
          n1.vy += fy;
          n2.vx -= fx;
          n2.vy -= fy;
        }
      }

      for (const rel of relationships) {
        const s = nodeById.get(rel.source);
        const t = nodeById.get(rel.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - linkDistance) * attraction;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        s.vx += fx;
        s.vy += fy;
        t.vx -= fx;
        t.vy -= fy;
      }

      for (const n of layoutNodes) {
        n.vx += (width / 2 - n.x) * centerForce * alpha;
        n.vy += (height / 2 - n.y) * centerForce * alpha;
        for (const other of layoutNodes) {
          if (n === other) continue;
          const dx = n.x - other.x;
          const dy = n.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = NODE_RADIUS * 2 + collisionPadding;
          if (dist < minDist) {
            const force = (minDist - dist) * collision;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            n.vx += fx;
            n.vy += fy;
          }
        }
        n.vx = clamp(n.vx, maxSpeed) * damping;
        n.vy = clamp(n.vy, maxSpeed) * damping;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(NODE_RADIUS, Math.min(width - NODE_RADIUS, n.x));
        n.y = Math.max(NODE_RADIUS, Math.min(height - NODE_RADIUS, n.y));
      }

      for (let i = 0; i < relEls.length; i++) {
        const { line, label, labelBg, path, rel } = relEls[i];
        const s = nodeById.get(rel.source);
        const t = nodeById.get(rel.target);
        if (!s || !t) continue;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = dx / dist;
        const ny = dy / dist;
        const sx = s.x + nx * NODE_RADIUS;
        const sy = s.y + ny * NODE_RADIUS;
        const tx = t.x - nx * NODE_RADIUS;
        const ty = t.y - ny * NODE_RADIUS;
        line.setAttribute("x1", String(sx));
        line.setAttribute("y1", String(sy));
        line.setAttribute("x2", String(tx));
        line.setAttribute("y2", String(ty));

        const arrowSize = 6;
        const angle = Math.atan2(dy, dx);
        const pathD = `M ${tx} ${ty} L ${tx - arrowSize * Math.cos(angle - Math.PI / 6)} ${ty - arrowSize * Math.sin(angle - Math.PI / 6)} L ${tx - arrowSize * Math.cos(angle + Math.PI / 6)} ${ty - arrowSize * Math.sin(angle + Math.PI / 6)} Z`;
        path.setAttribute("d", pathD);

        const midX = (s.x + t.x) / 2;
        const midY = (s.y + t.y) / 2;
        // Offset label perpendicular to edge, alternating sides based on index
        const offset = 14 + (i % 3) * 6;
        const side = i % 2 === 0 ? 1 : -1;
        const labelX = midX + (-ny) * offset * side;
        const labelY = midY + (nx) * offset * side;
        const labelWidth = rel.type.length * 5 + 8;
        const labelHeight = 12;
        labelBg.setAttribute("x", String(labelX - labelWidth / 2));
        labelBg.setAttribute("y", String(labelY - labelHeight / 2 - 2));
        labelBg.setAttribute("width", String(labelWidth));
        labelBg.setAttribute("height", String(labelHeight));
        label.setAttribute("x", String(labelX));
        label.setAttribute("y", String(labelY));
      }

      for (const { group, node } of nodeEls) {
        group.setAttribute("transform", `translate(${node.x}, ${node.y})`);
      }
    };

    const loop = () => {
      if (!running) return;
      update();
      rafId = requestAnimationFrame(loop);
    };
    const restart = () => {
      alpha = 1;
      if (!running) {
        running = true;
        loop();
      }
    };
    loop();

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging && dragNode) {
        const rect = svg.getBoundingClientRect();
        const mx = (e.clientX - rect.left - transform.x) / transform.k;
        const my = (e.clientY - rect.top - transform.y) / transform.k;
        dragNode.x = mx;
        dragNode.y = my;
        dragNode.vx = 0;
        dragNode.vy = 0;
        alpha = Math.max(alpha, 0.3);
      } else if (isDragging && !dragNode) {
        transform.x = e.clientX - panStart.x;
        transform.y = e.clientY - panStart.y;
        applyTransform();
      }
    };
    const onMouseUp = () => {
      isDragging = false;
      dragNode = null;
      for (const { group } of nodeEls) {
        group.style.cursor = "pointer";
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newK = Math.min(Math.max(transform.k * scaleFactor, 0.2), 4);
      transform.x = mx - (mx - transform.x) * (newK / transform.k);
      transform.y = my - (my - transform.y) * (newK / transform.k);
      transform.k = newK;
      applyTransform();
    };

    svg.addEventListener("mousedown", (e) => {
      if (e.target === svg || e.target === world) {
        isDragging = true;
        panStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
        setSelected(null);
      }
    });
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    svg.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      svg.removeEventListener("wheel", onWheel);
    };
  }, [nodes, relationships, isLight, textColor, relColor]);

  if (nodes.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: bgColor,
          borderRadius: "8px",
          color: isLight ? "#64748b" : "#94a3b8",
        }}
      >
        No graph data to display. Run a query first.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        height: "100%",
        border: "1px solid " + borderColor,
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: bgColor,
        position: "relative",
        display: "flex",
      }}
    >
      <svg ref={svgRef} width="100%" height="100%" style={{ display: "block", flex: 1 }} />
      <div
        style={{
          width: "220px",
          borderLeft: "1px solid " + borderColor,
          backgroundColor: bgColor,
          padding: "12px",
          overflow: "auto",
          fontSize: "12px",
          color: textColor,
          display: selected ? "block" : "none",
        }}
      >
        {selected && (
          <>
            <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
              {selected.labels.map((l) => `:${l}`).join(" ")}
            </div>
            <div style={{ marginBottom: "8px", color: isLight ? "#64748b" : "#94a3b8" }}>{selected.displayName}</div>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Properties</div>
            {selected.properties.map((p) => (
              <div key={p.key} style={{ marginBottom: "4px" }}>
                <span style={{ color: isLight ? "#0284c7" : "#38bdf8" }}>{p.key}</span>:{" "}
                {String(p.value ?? "")}
              </div>
            ))}
          </>
        )}
      </div>
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            background: isLight ? "#ffffff" : "#0f172a",
            color: textColor,
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            border: "1px solid " + borderColor,
            zIndex: 10,
            maxWidth: "220px",
          }}
        >
          <div style={{ fontWeight: 600 }}>
            {tooltip.node.labels.map((l) => `:${l}`).join(" ")}
          </div>
          <div style={{ marginTop: "2px" }}>{tooltip.node.displayName}</div>
          <div style={{ color: isLight ? "#64748b" : "#94a3b8", marginTop: "4px" }}>
            {tooltip.node.properties.length} properties
          </div>
        </div>
      )}
      <div
        style={{
          position: "absolute",
          top: "12px",
          left: "12px",
          background: isLight ? "rgba(255,255,255,0.95)" : "rgba(15,23,42,0.95)",
          border: "1px solid " + borderColor,
          borderRadius: "6px",
          padding: "10px",
          fontSize: "11px",
          color: textColor,
          maxWidth: "160px",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "4px" }}>Legend</div>
        {Array.from(new Set(nodes.flatMap((n: GraphNode) => n.labels))).map((label: string) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
            <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: getNodeColor([label]) }} />
            <span>:{label}</span>
          </div>
        ))}
        <div style={{ marginTop: "8px", borderTop: "1px solid " + borderColor, paddingTop: "6px", color: isLight ? "#64748b" : "#94a3b8" }}>
          Showing sample of {nodes.length} nodes
        </div>
      </div>
    </div>
  );
}
