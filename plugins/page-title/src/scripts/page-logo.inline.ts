/*
 * The brain mark as a small spring graph.
 *
 * Settles into the logo's rest shape on load, flexes when you drag a node,
 * springs back on release. Hover lights a node's 1-ring and dims the rest.
 * The loop sleeps the moment the mesh is still — no perpetual motion.
 *
 * Positions live in the SVG's own viewBox units. The markup is the source of
 * truth: each node carries its rest point in data-x/data-y, each edge names its
 * two endpoints. Nothing here re-declares the logo's geometry.
 */

type NodeState = { x: number; y: number; vx: number; vy: number }

const SPRING = 0.1
const ANCHOR = 0.03
const REPULSE = 0.06
const DAMPING = 0.88
const IMPULSE = 3
const SLEEP_SPEED = 0.015
const DRAG_SLOP = 4
const NODE_HIT_RADIUS = 6.5
const EDGE_HIT_RADIUS = 4
const STEM_OFFSET = { x: -4.589, y: 9.248 }

// d3-force's alphaTarget, in miniature: a hand on the mesh keeps the whole
// simulation hot so it drifts and reconfigures; let go and it cools home.
const HEAT_RISE = 0.16
const HEAT_DECAY = 0.945
const HEAT_JITTER = 0.32
const HEAT_ANCHOR_RELIEF = 0.75

// The mark's own box is the play area: nodes may be dragged anywhere inside
// it, never out. The site title sits just under the logo and its box overlaps
// ours (the logo has a negative bottom margin), so the lower bound is set from
// where the name actually starts rather than from the frame.
const CLAMP_MIN = 5
const CLAMP_MAX = 95
const NAME_TOP = 85.8
const CLEARANCE = 6

const readNumber = (el: Element, name: string) => Number(el.getAttribute(name) ?? "0")

const localPoint = (svg: SVGSVGElement, e: PointerEvent) => {
  const rect = svg.getBoundingClientRect()
  const box = svg.viewBox.baseVal
  return {
    x: box.x + ((e.clientX - rect.left) / rect.width) * box.width,
    y: box.y + ((e.clientY - rect.top) / rect.height) * box.height,
  }
}

const boot = (svg: SVGSVGElement) => {
  const nodeEls = Array.from(svg.querySelectorAll<SVGGElement>("g.logo-node"))
  const edgeEls = Array.from(svg.querySelectorAll<SVGLineElement>("line.logo-edge"))
  const stemEls = Array.from(svg.querySelectorAll<SVGLineElement>("line.logo-stem"))
  if (nodeEls.length === 0) return

  const nodes: NodeState[] = nodeEls.map((el) => ({
    x: readNumber(el, "data-x"),
    y: readNumber(el, "data-y"),
    vx: 0,
    vy: 0,
  }))
  const edges = edgeEls.map((el) => {
    const a = readNumber(el, "data-a")
    const b = readNumber(el, "data-b")
    const dx = nodes[b].x - nodes[a].x
    const dy = nodes[b].y - nodes[a].y
    return { el, a, b, rest: Math.hypot(dx, dy) }
  })
  const stems = stemEls.map((el) => ({ el, from: readNumber(el, "data-stem") }))

  // Each node has its own lower bound: the brainstem hangs further down than
  // its node, so that node has less room to travel than the others.
  const stemFrom = new Set(stems.map((s) => s.from))
  const nodeRadius = nodeEls.map((el) => Number(el.querySelector("circle")?.getAttribute("r") ?? 3))
  const bottomLimit = nodeEls.map((_, index) => {
    const reach = stemFrom.has(index) ? Math.abs(STEM_OFFSET.y) : nodeRadius[index]
    return NAME_TOP - CLEARANCE - reach
  })
  const clampX = (value: number) => Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, value))
  const clampY = (index: number, value: number) =>
    Math.max(CLAMP_MIN, Math.min(bottomLimit[index], value))

  const rest = nodes.map((n) => ({ x: n.x, y: n.y }))
  // Rest spacing between every pair — the mesh keeps this much air, and only
  // this much, so the mark never inflates past its own silhouette.
  const restDistance: number[][] = nodes.map((_, i) =>
    nodes.map((_, j) => Math.hypot(rest[j].x - rest[i].x, rest[j].y - rest[i].y)),
  )
  const adjacency: number[][] = nodes.map(() => [])
  for (const { a, b } of edges) {
    adjacency[a].push(b)
    adjacency[b].push(a)
  }

  let frame = 0
  let dragging = -1
  let pressed = false
  let heat = 0
  let moved = 0
  let downAt = { x: 0, y: 0 }

  const paint = () => {
    for (let i = 0; i < nodeEls.length; i++) {
      nodeEls[i].setAttribute("transform", `translate(${nodes[i].x} ${nodes[i].y})`)
    }
    for (const { el, a, b } of edges) {
      el.setAttribute("x1", String(nodes[a].x))
      el.setAttribute("y1", String(nodes[a].y))
      el.setAttribute("x2", String(nodes[b].x))
      el.setAttribute("y2", String(nodes[b].y))
    }
    for (const { el, from } of stems) {
      el.setAttribute("x1", String(nodes[from].x))
      el.setAttribute("y1", String(nodes[from].y))
      el.setAttribute("x2", String(nodes[from].x + STEM_OFFSET.x))
      el.setAttribute("y2", String(nodes[from].y + STEM_OFFSET.y))
    }
  }

  const settleToRest = () => {
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].x = rest[i].x
      nodes[i].y = rest[i].y
      nodes[i].vx = 0
      nodes[i].vy = 0
    }
    paint()
  }

  const step = () => {
    frame = 0
    let energy = 0

    for (const { a, b, rest: length } of edges) {
      const dx = nodes[b].x - nodes[a].x
      const dy = nodes[b].y - nodes[a].y
      const dist = Math.hypot(dx, dy) || 1e-6
      const pull = (SPRING * (dist - length)) / dist
      const fx = pull * dx
      const fy = pull * dy
      nodes[a].vx += fx
      nodes[a].vy += fy
      nodes[b].vx -= fx
      nodes[b].vy -= fy
    }

    // forceManyBody, in miniature: nodes resist being crowded closer together
    // than they sit at rest. Purely compressive, so at rest it contributes
    // nothing and the mark can settle exactly home.
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x
        const dy = nodes[j].y - nodes[i].y
        const dist = Math.hypot(dx, dy) || 1e-6
        const ideal = restDistance[i][j]
        if (dist >= ideal) continue
        const push = (REPULSE * (ideal - dist)) / dist
        const fx = push * dx
        const fy = push * dy
        nodes[i].vx -= fx
        nodes[i].vy -= fy
        nodes[j].vx += fx
        nodes[j].vy += fy
      }
    }

    // A hand on the mesh keeps the whole simulation hot (d3's alphaTarget);
    // released, it cools back down and the springs take it home.
    heat = pressed ? Math.min(1, heat + HEAT_RISE) : heat * HEAT_DECAY
    const anchor = ANCHOR * (1 - HEAT_ANCHOR_RELIEF * heat)

    for (let i = 0; i < nodes.length; i++) {
      if (i === dragging) {
        nodes[i].vx = 0
        nodes[i].vy = 0
        continue
      }
      const n = nodes[i]
      n.vx += (rest[i].x - n.x) * anchor
      n.vy += (rest[i].y - n.y) * anchor
      if (heat > 0.001) {
        n.vx += (Math.random() - 0.5) * heat * HEAT_JITTER
        n.vy += (Math.random() - 0.5) * heat * HEAT_JITTER
      }
      n.vx *= DAMPING
      n.vy *= DAMPING
      n.x = clampX(n.x + n.vx)
      n.y = clampY(i, n.y + n.vy)
      energy += Math.abs(n.vx) + Math.abs(n.vy)
    }

    paint()
    if (heat > 0.01 || energy > SLEEP_SPEED * nodes.length) {
      wake()
      return
    }
    // Asleep: land exactly on the logo's rest shape so the mark is always the mark.
    settleToRest()
  }

  const wake = () => {
    if (!frame) frame = requestAnimationFrame(step)
  }

  const light = (focus: number) => {
    const ring = new Set<number>([focus])
    for (const n of adjacency[focus]) ring.add(n)
    for (let i = 0; i < nodeEls.length; i++) {
      nodeEls[i].classList.toggle("is-lit", ring.has(i))
      nodeEls[i].classList.toggle("is-focus", i === focus)
      nodeEls[i].classList.toggle("is-ring", ring.has(i) && i !== focus)
    }
    for (const { el, a, b } of edges) {
      el.classList.toggle("is-lit", a === focus || b === focus)
    }
    for (const { el, from } of stems) {
      el.classList.toggle("is-lit", from === focus)
    }
    svg.classList.add("is-focusing")
  }

  const dim = () => {
    svg.classList.remove("is-focusing")
    for (const el of svg.querySelectorAll(".is-lit, .is-focus, .is-ring")) {
      el.classList.remove("is-lit")
      el.classList.remove("is-focus")
      el.classList.remove("is-ring")
    }
  }

  // The visual dots are only a few pixels across, so hit-test the mesh geometry:
  // grab a node, or grab a bar and take whichever end is closer.
  const pick = (point: { x: number; y: number }) => {
    let best = -1
    let bestDist = NODE_HIT_RADIUS
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(nodes[i].x - point.x, nodes[i].y - point.y)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    if (best >= 0) return best

    for (const { a, b } of edges) {
      const dx = nodes[b].x - nodes[a].x
      const dy = nodes[b].y - nodes[a].y
      const lengthSquared = dx * dx + dy * dy || 1e-6
      const t = Math.max(
        0,
        Math.min(1, ((point.x - nodes[a].x) * dx + (point.y - nodes[a].y) * dy) / lengthSquared),
      )
      const px = nodes[a].x + dx * t
      const py = nodes[a].y + dy * t
      if (Math.hypot(px - point.x, py - point.y) >= EDGE_HIT_RADIUS) continue
      return Math.hypot(nodes[a].x - point.x, nodes[a].y - point.y) <=
        Math.hypot(nodes[b].x - point.x, nodes[b].y - point.y)
        ? a
        : b
    }
    return -1
  }

  const hitNode = (e: PointerEvent) => {
    const target = e.target as Element | null
    return target?.closest("g.logo-node")
      ? nodeEls.indexOf(target.closest("g.logo-node") as SVGGElement)
      : -1
  }

  // A release can land outside the mark — on the page, outside the window, or
  // be swallowed when pointer capture is lost. Clearing state must not depend
  // on that event reaching this svg, or the mesh stays pinned and the heat never
  // decays, so the sim never sleeps and never snaps back to the logo.
  const release = () => {
    pressed = false
    dragging = -1
    wake()
  }

  const onPointerDown = (e: PointerEvent) => {
    if (!e.isPrimary) return
    // Track travel on every press on the mark, mesh hit or not — a drag anywhere
    // must not turn into a click on the home link underneath.
    pressed = true
    moved = 0
    downAt = { x: e.clientX, y: e.clientY }
    const index = hitNode(e) >= 0 ? hitNode(e) : pick(localPoint(svg, e))
    if (index < 0) return
    dragging = index
    try {
      svg.setPointerCapture(e.pointerId)
    } catch {
      // Capture is best-effort; the window-level pointerup still releases us.
    }
    wake()
  }

  const onPointerMove = (e: PointerEvent) => {
    // Self-heal: a release we never saw would otherwise hold the mesh forever.
    if (pressed && e.buttons === 0) {
      release()
      return
    }
    if (!pressed) return
    moved = Math.max(moved, Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y))
    if (dragging < 0) return
    const point = localPoint(svg, e)
    nodes[dragging].x = clampX(point.x)
    nodes[dragging].y = clampY(dragging, point.y)
    wake()
  }

  const onPointerUp = (e: PointerEvent) => {
    release()
    if (svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId)
  }

  const onClick = (e: MouseEvent) => {
    if (moved > DRAG_SLOP) {
      e.preventDefault()
      e.stopPropagation()
    }
    moved = 0
  }

  const onEnter = (e: PointerEvent) => {
    const index = hitNode(e)
    if (index >= 0) light(index)
  }

  const onLeave = (e: PointerEvent) => {
    // Moving straight onto another node is not a leave — onEnter re-lights it.
    const onto = e.relatedTarget as Element | null
    if (onto?.closest?.("g.logo-node")) return
    dim()
  }

  nodeEls.forEach((el) => {
    el.addEventListener("pointerenter", onEnter)
    el.addEventListener("pointerleave", onLeave)
  })
  svg.addEventListener("pointerleave", dim)
  svg.addEventListener("pointerdown", onPointerDown)
  svg.addEventListener("pointermove", onPointerMove)
  svg.addEventListener("pointerup", onPointerUp)
  svg.addEventListener("pointercancel", onPointerUp)
  svg.addEventListener("lostpointercapture", release)
  svg.addEventListener("click", onClick, true)
  // Window-level: the release that happens off the mark is the one that used to
  // strand the mesh.
  window.addEventListener("pointerup", release)
  window.addEventListener("pointercancel", release)
  window.addEventListener("blur", release)
  // The mark sits inside the home link, which is HTML5-draggable by default. A
  // browser link-drag fires pointercancel and would kill the mesh drag outright.
  const swallowDrag = (e: Event) => e.preventDefault()
  svg.addEventListener("dragstart", swallowDrag)
  svg.closest("a")?.addEventListener("dragstart", swallowDrag)

  for (let i = 0; i < nodes.length; i++) {
    nodes[i].vx = (Math.random() - 0.5) * IMPULSE
    nodes[i].vy = (Math.random() - 0.5) * IMPULSE
  }
  wake()
}

document.addEventListener("nav", () => {
  const prefersStill = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const canPoint = window.matchMedia("(hover: hover) and (min-width: 801px)").matches
  for (const svg of document.querySelectorAll<SVGSVGElement>("svg.page-title-logo")) {
    if (svg.dataset.logoGraph) continue
    if (prefersStill || !canPoint) {
      svg.dataset.logoGraph = "still"
      continue
    }
    svg.dataset.logoGraph = "live"
    boot(svg)
  }
})
