let excalidrawLib: any = undefined

async function loadExcalidrawLib() {
  if (!excalidrawLib) {
    excalidrawLib = await import(
      "https://esm.sh/@excalidraw/excalidraw@0.18.0"
    )
  }
  return excalidrawLib
}

function findExportToSvg(lib: any) {
  for (const key of Object.keys(lib)) {
    if (key.includes("exportToSvg") || key.includes("ToSvg")) {
      return lib[key]
    }
  }
  throw new Error("exportToSvg not found in Excalidraw exports")
}

function resolveSrc(baseSrc: string): string {
  const isDark = document.documentElement.getAttribute("saved-theme") === "dark"
  const suffix = isDark ? ".dark" : ".light"
  const extIdx = baseSrc.lastIndexOf(".excalidraw")
  if (extIdx === -1) return baseSrc
  return baseSrc.slice(0, extIdx) + suffix + ".excalidraw"
}

async function renderExcalidraw(element: HTMLElement) {
  const baseSrc = element.dataset.excalidrawSrc
  if (!baseSrc) return

  // Save current viewBox for continuity across re-renders
  const svgEl = element.querySelector("svg")
  const savedVB = svgEl?.getAttribute("viewBox")

  try {
    // Try theme-specific variant first, fall back to base
    let src = resolveSrc(baseSrc)
    let response = await fetch(src)
    if (!response.ok) {
      response = await fetch(baseSrc)
      if (!response.ok) throw new Error(`Failed to fetch ${baseSrc}: ${response.status}`)
    }
    const data = await response.json()

    const lib = await loadExcalidrawLib()
    const exportToSvg = findExportToSvg(lib)

    const rawElements = data.elements || []
    const elements = rawElements.map((el: any) => {
      if (el.type === "text") return { ...el, fontFamily: 2 }
      return el
    })

    const svg = await exportToSvg({
      elements,
      appState: {
        viewBackgroundColor: "transparent",
      },
      files: null,
      exportPadding: 20,
    })

    svg.removeAttribute("width")
    svg.removeAttribute("height")
    svg.style.width = "100%"
    svg.style.height = "100%"
    svg.style.display = "block"
    svg.style.pointerEvents = "none"
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet")

    // Inject Excalifont via CSS
    const styleEl = svg.querySelector("style")
    if (styleEl) {
      styleEl.textContent = `
        @font-face {
          font-family: "Excalifont";
          src: url("https://excalidraw.nyc3.cdn.digitaloceanspaces.com/fonts/Excalifont-Regular.woff2") format("woff2");
          font-display: swap;
        }
        text { font-family: "Excalifont", "Comic Sans MS", cursive; }
      `
    }

    const viewBox = svg.getAttribute("viewBox")?.split(" ").map(parseFloat)
    const initialVB = viewBox && viewBox.length === 4
      ? [...viewBox] as [number, number, number, number]
      : [0, 0, 800, 600] as [number, number, number, number]

    let currentVB: [number, number, number, number] = [...initialVB]
    let isPanning = false
    let panStart = { x: 0, y: 0 }
    let vbStart: [number, number, number, number] = [...initialVB]

    // Restore previous viewBox if re-rendering
    if (savedVB) {
      const parts = savedVB.split(" ").map(parseFloat)
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const newVB = parts as [number, number, number, number]
        // Keep the same center and scale, but use new diagram dimensions
        const oldW = newVB[2]
        const newW = initialVB[2]
        const scale = newW / oldW
        currentVB = [
          initialVB[0] + (newVB[0] - initialVB[0]) / scale,
          initialVB[1] + (newVB[1] - initialVB[1]) / scale,
          initialVB[2],
          initialVB[3],
        ]
      }
    }

    const container = document.createElement("div")
    container.style.cssText = `
      position: relative;
      width: 100%;
      aspect-ratio: ${initialVB[2]} / ${initialVB[3]};
      min-height: 200px;
      max-height: 90vh;
      overflow: hidden;
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      border-radius: 8px;
    `

    const svgWrapper = document.createElement("div")
    svgWrapper.style.cssText = `
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    `
    svgWrapper.appendChild(svg)
    container.appendChild(svgWrapper)

    function applyViewBox(vb: [number, number, number, number]) {
      svg.setAttribute("viewBox", vb.join(" "))
    }

    applyViewBox(currentVB)

    // Pointer-based pan (skip if clicking controls)
    container.addEventListener("pointerdown", (e) => {
      if (!e.isPrimary) return
      if ((e.target as Element).closest(".excalidraw-controls")) return
      isPanning = true
      container.setPointerCapture(e.pointerId)
      panStart = { x: e.clientX, y: e.clientY }
      vbStart = [...currentVB]
      container.style.cursor = "grabbing"
    })

    container.addEventListener("pointermove", (e) => {
      if (!isPanning) return
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      const rect = container.getBoundingClientRect()
      const scaleX = currentVB[2] / rect.width
      const scaleY = currentVB[3] / rect.height
      currentVB = [
        vbStart[0] - dx * scaleX,
        vbStart[1] - dy * scaleY,
        currentVB[2],
        currentVB[3],
      ]
      applyViewBox(currentVB)
    })

    const endPan = () => {
      isPanning = false
      container.style.cursor = "grab"
    }

    container.addEventListener("pointerup", endPan)
    container.addEventListener("pointercancel", endPan)
    container.addEventListener("pointerleave", endPan)

    // Zoom controls
    const zoomLabel = document.createElement("span")
    zoomLabel.style.cssText = `
      font-size: 11px;
      font-weight: 600;
      color: var(--dark);
      opacity: 0.6;
      min-width: 36px;
      text-align: center;
      user-select: none;
    `
    const updateZoomLabel = () => {
      const pct = Math.round((initialVB[2] / currentVB[2]) * 100)
      zoomLabel.textContent = `${pct}%`
    }
    updateZoomLabel()

    const zoomStep = (factor: number) => {
      const newW = currentVB[2] * factor
      const newH = currentVB[3] * factor
      if (newW < 100 || newW > 10000) return
      currentVB = [
        currentVB[0] + currentVB[2] * 0.5 * (1 - factor),
        currentVB[1] + currentVB[3] * 0.5 * (1 - factor),
        newW,
        newH,
      ]
      applyViewBox(currentVB)
      updateZoomLabel()
    }

    const btnStyle = `
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border: none; border-radius: 4px;
      background: transparent; color: var(--dark);
      opacity: 0.5; cursor: pointer;
      font-size: 14px; line-height: 1; padding: 0;
      transition: background-color 0.5s ease, opacity 0.3s ease;
    `
    const btnHoverStyle = `
      background: var(--lightgray); opacity: 1;
    `

    const zoomOutBtn = document.createElement("button")
    zoomOutBtn.innerHTML = "\u2212"
    zoomOutBtn.style.cssText = btnStyle
    zoomOutBtn.title = "Zoom out"
    zoomOutBtn.addEventListener("mouseenter", () => zoomOutBtn.style.cssText = btnStyle + btnHoverStyle)
    zoomOutBtn.addEventListener("mouseleave", () => zoomOutBtn.style.cssText = btnStyle)
    zoomOutBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      zoomStep(1.22)
    })

    const zoomInBtn = document.createElement("button")
    zoomInBtn.innerHTML = "+"
    zoomInBtn.style.cssText = btnStyle
    zoomInBtn.title = "Zoom in"
    zoomInBtn.addEventListener("mouseenter", () => zoomInBtn.style.cssText = btnStyle + btnHoverStyle)
    zoomInBtn.addEventListener("mouseleave", () => zoomInBtn.style.cssText = btnStyle)
    zoomInBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      zoomStep(0.82)
    })

    const resetBtn = document.createElement("button")
    resetBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`
    resetBtn.style.cssText = btnStyle
    resetBtn.title = "Reset view"
    resetBtn.addEventListener("mouseenter", () => resetBtn.style.cssText = btnStyle + btnHoverStyle)
    resetBtn.addEventListener("mouseleave", () => resetBtn.style.cssText = btnStyle)
    resetBtn.addEventListener("click", (e) => {
      e.stopPropagation()
      currentVB = [...initialVB]
      applyViewBox(currentVB)
      updateZoomLabel()
    })

    const controls = document.createElement("div")
    controls.className = "excalidraw-controls"
    controls.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px 4px;
      background: var(--light);
      border: 1px solid var(--lightgray);
      border-radius: 5px;
      z-index: 10;
      pointer-events: all;
    `
    controls.appendChild(zoomOutBtn)
    controls.appendChild(zoomLabel)
    controls.appendChild(zoomInBtn)
    controls.appendChild(resetBtn)
    container.appendChild(controls)

    container.tabIndex = 0

    element.innerHTML = ""
    element.appendChild(container)
  } catch (err) {
    console.error("Excalidraw render failed:", err, "src:", baseSrc)
    element.innerHTML = `<p class="excalidraw-error">Failed to render diagram</p>`
  }
}

function setupExcalidraw() {
  const nodes = document.querySelectorAll(
    ".excalidraw[data-excalidraw-src]",
  ) as NodeListOf<HTMLElement>
  if (nodes.length === 0) return

  nodes.forEach((node) => {
    node.style.width = "100%"
    renderExcalidraw(node)
  })
}

document.addEventListener("nav", setupExcalidraw)
document.addEventListener("themechange", setupExcalidraw)
window.addCleanup?.(() => {
  document.removeEventListener("nav", setupExcalidraw)
  document.removeEventListener("themechange", setupExcalidraw)
})
