import React, { useEffect, useRef, useState } from "react";

interface GraphNode {
  id: string;
  label: string;
  type: "mv-detail" | "bridge" | "cost-center";
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphViewProps {
  data: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  theme?: "light" | "dark";
}

const NODE_RADIUS = { "mv-detail": 12, bridge: 8, "cost-center": 16 };
const NODE_COLOR_LIGHT = { "mv-detail": "#ec4899", bridge: "#0284c7", "cost-center": "#f59e0b" };
const NODE_COLOR_DARK = { "mv-detail": "#f472b6", bridge: "#38bdf8", "cost-center": "#fbbf24" };

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function GraphView({ data, theme = "dark" }: GraphViewProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { nodes, links } = data;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const isLight = theme === "light";
  const NODE_COLOR = isLight ? NODE_COLOR_LIGHT : NODE_COLOR_DARK;
  const strokeColor = isLight ? "#94a3b8" : "#64748b";
  const textColor = isLight ? "#1e293b" : "#e2e8f0";
  const bgColor = isLight ? "#ffffff" : "#0f172a";

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = svgRef.current;
    const width = svg.clientWidth;
    const height = svg.clientHeight;

    while (svg.firstChild) {
      svg.removeChild(svg.firstChild);
    }

    const layoutNodes: LayoutNode[] = nodes.map((n) => ({
      ...n,
      x: n.x || Math.random() * width,
      y: n.y || Math.random() * height,
      vx: 0,
      vy: 0,
    }));
    const nodeById = new Map(layoutNodes.map((n) => [n.id, n]));

    // View transform for zoom/pan
    let transform = { x: 0, y: 0, k: 1 };
    let isDragging = false;
    let dragNode: LayoutNode | null = null;
    let panStart = { x: 0, y: 0 };

    const world = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svg.appendChild(world);

    const applyTransform = () => {
      world.setAttribute("transform", `translate(${transform.x}, ${transform.y}) scale(${transform.k})`);
    };
    applyTransform();

    // Draw links
    const linkElements: SVGLineElement[] = [];
    const linkGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    for (const link of links) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", strokeColor);
      line.setAttribute("stroke-width", "1");
      line.setAttribute("stroke-opacity", "0.6");
      linkGroup.appendChild(line);
      linkElements.push(line);
    }
    world.appendChild(linkGroup);

    // Draw nodes
    const nodeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodeEls: { group: SVGGElement; circle: SVGCircleElement; text: SVGTextElement; node: LayoutNode }[] = [];
    for (const n of layoutNodes) {
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.style.cursor = "grab";

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", String(NODE_RADIUS[n.type]));
      circle.setAttribute("fill", NODE_COLOR[n.type]);
      circle.setAttribute("stroke", isLight ? "#ffffff" : "#0f172a");
      circle.setAttribute("stroke-width", "2");
      group.appendChild(circle);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(NODE_RADIUS[n.type] + 5));
      text.setAttribute("y", "4");
      text.setAttribute("fill", textColor);
      text.setAttribute("font-size", "10");
      text.setAttribute("font-family", "sans-serif");
      text.setAttribute("pointer-events", "none");
      text.setAttribute("opacity", n.type === "cost-center" ? "1" : "0");
      text.textContent = n.label;
      group.appendChild(text);

      group.addEventListener("mouseenter", (e) => {
        text.setAttribute("opacity", "1");
        const rect = svg.getBoundingClientRect();
        setTooltip({ x: e.clientX - rect.left + 12, y: e.clientY - rect.top - 12, text: `${n.label} (${n.type})` });
      });
      group.addEventListener("mouseleave", () => {
        if (n.type !== "cost-center") text.setAttribute("opacity", "0");
        setTooltip(null);
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

    // Force simulation parameters - scale repulsion with node count
    const nodeCount = layoutNodes.length;
    const linkDistance = 140;
    const repulsionBase = 2500 + nodeCount * 40;
    const centerForce = 0.01;
    const damping = 0.92;
    const maxSpeed = 6;
    const alphaDecay = 0.015;
    const minAlpha = 0.003;
    const collisionPadding = 8;

    let alpha = 1;
    let rafId: number;
    let running = true;

    const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v));

    const simulate = () => {
      if (!running) return;
      alpha = Math.max(minAlpha, alpha - alphaDecay);
      const repulsion = repulsionBase * alpha;
      const attraction = 0.03 * alpha;
      const collision = 0.05 * alpha;

      // Repulsion
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

      // Link attraction
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const s = nodeById.get(link.source);
        const t = nodeById.get(link.target);
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

      // Collision detection
      for (let a = 0; a < layoutNodes.length; a++) {
        for (let b = a + 1; b < layoutNodes.length; b++) {
          const n1 = layoutNodes[a];
          const n2 = layoutNodes[b];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = NODE_RADIUS[n1.type] + NODE_RADIUS[n2.type] + collisionPadding;
          if (dist < minDist) {
            const overlap = minDist - dist;
            const fx = (dx / dist) * overlap * collision;
            const fy = (dy / dist) * overlap * collision;
            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        }
      }

      // Center gravity + damping + integration
      let totalMovement = 0;
      for (const n of layoutNodes) {
        if (n === dragNode) continue;
        n.vx += (width / 2 - n.x) * centerForce * alpha;
        n.vy += (height / 2 - n.y) * centerForce * alpha;
        n.vx = clamp(n.vx * damping, maxSpeed);
        n.vy = clamp(n.vy * damping, maxSpeed);
        n.x += n.vx;
        n.y += n.vy;
        totalMovement += Math.abs(n.vx) + Math.abs(n.vy);
      }

      // Update link positions
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        const s = nodeById.get(link.source);
        const t = nodeById.get(link.target);
        if (!s || !t) continue;
        const line = linkElements[i];
        line.setAttribute("x1", String(s.x));
        line.setAttribute("y1", String(s.y));
        line.setAttribute("x2", String(t.x));
        line.setAttribute("y2", String(t.y));
      }

      // Update node positions
      for (const el of nodeEls) {
        el.group.setAttribute("transform", `translate(${el.node.x}, ${el.node.y})`);
      }

      if (totalMovement > 0.5 || alpha > minAlpha) {
        rafId = requestAnimationFrame(simulate);
      } else {
        running = false;
      }
    };

    rafId = requestAnimationFrame(simulate);

    // Restart simulation on interaction
    const restart = () => {
      if (!running) {
        alpha = 0.3;
        running = true;
        rafId = requestAnimationFrame(simulate);
      }
    };

    // Drag + pan handlers
    const onMouseMove = (e: MouseEvent) => {
      if (dragNode) {
        const rect = svg.getBoundingClientRect();
        const x = (e.clientX - rect.left - transform.x) / transform.k;
        const y = (e.clientY - rect.top - transform.y) / transform.k;
        dragNode.x = x;
        dragNode.y = y;
        dragNode.vx = 0;
        dragNode.vy = 0;
      } else if (isDragging) {
        transform.x = e.clientX - panStart.x;
        transform.y = e.clientY - panStart.y;
        applyTransform();
      }
    };

    const onMouseUp = () => {
      if (dragNode) {
        dragNode = null;
        for (const el of nodeEls) el.group.style.cursor = "grab";
      }
      isDragging = false;
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
  }, [nodes, links]);

  if (nodes.length === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isLight ? "#f8fafc" : "#1e293b",
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
        border: "1px solid " + (isLight ? "#e2e8f0" : "#334155"),
        borderRadius: "8px",
        overflow: "hidden",
        backgroundColor: bgColor,
        position: "relative",
      }}
    >
      <svg ref={svgRef} width="100%" height="100%" style={{ display: "block" }} />
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            background: isLight ? "#ffffff" : "#0f172a",
            color: textColor,
            padding: "6px 10px",
            borderRadius: "4px",
            fontSize: "12px",
            pointerEvents: "none",
            border: "1px solid " + (isLight ? "#e2e8f0" : "#334155"),
            zIndex: 10,
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
