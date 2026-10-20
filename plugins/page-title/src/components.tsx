import { JSX } from "preact"
// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"
// @ts-ignore
import readermodeScript from "./scripts/readermode.inline"
// @ts-ignore
import pageLogoScript from "./scripts/page-logo.inline"
import { pathToRoot, classNames } from "@quartz-community/utils"
import type {
  QuartzComponent,
  QuartzComponentConstructor,
  QuartzComponentProps,
} from "@quartz-community/types"

const i18n = (_locale: string) => ({
  propertyDefaults: { title: "Untitled" },
  components: {
    themeToggle: {
      darkMode: "Enable dark mode",
      lightMode: "Don't click. Light attracts bugs!",
    },
  },
})

interface Options {
  links: Record<string, string>
}

const icons: Record<string, JSX.Element> = {
  GitHub: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20px"
      height="20px"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
    >
      <title>GitHub</title>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2c2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2a4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6c-.6.6-.6 1.2-.5 2V21" />
    </svg>
  ),
  LinkedIn: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="20px"
      height="20px"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      role="img"
    >
      <title>LinkedIn</title>
      <path d="M8 11v5m0-8v.01M12 16v-5m4 5v-3a2 2 0 1 0-4 0" />
      <path d="M5 21H19a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
    </svg>
  ),
}

// The brain mark's own graph — the same nodes and bars as the solid logo path,
// at the Graph of Contents weight. Rest points live in the SVG viewBox so the
// spring script can read them straight off the markup.
const logoNodes: { x: number; y: number }[] = [
  { x: 47.244, y: 30.383 }, // 0
  { x: 66.751, y: 34.161 }, // 1
  { x: 28.487, y: 36.37 }, // 2
  { x: 74.996, y: 44.589 }, // 3
  { x: 44.964, y: 45.437 }, // 4
  { x: 62.246, y: 55.183 }, // 5
  { x: 83.196, y: 56.684 }, // 6
  { x: 21.745, y: 58.883 }, // 7
  { x: 62.264, y: 67.852 }, // 8
  { x: 75.012, y: 67.867 }, // 9
  { x: 48.765, y: 68.615 }, // 10
  { x: 34.502, y: 67.876 }, // 11
]

const logoEdges: [number, number][] = [
  [0, 1],
  [0, 2],
  [0, 4],
  [1, 3],
  [2, 7],
  [3, 5],
  [3, 6],
  [4, 5],
  [4, 7],
  [4, 10],
  [5, 8],
  [6, 9],
  [7, 11],
  [8, 9],
  [8, 10],
  [10, 11],
]

// The short brainstem hanging off node 8 — a bare round-capped stroke, no node at the tip.
const logoStemFrom = 8

// The original mark's own mass: a uniform node at r = 4.5 in path space, which
// is 3.375 once the path's scale(0.75) is applied. Drawn as a circle on top of
// its bars rather than fused into one silhouette, a touch under that reads as
// the same proportion at 6rem.
const NODE_RADIUS = 3

const PageTitlePlugin = ((opts?: Options) => {
  const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
    const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
    const baseDir = pathToRoot(fileData.slug!)
    const links = opts?.links ?? {}
    return (
      <h2 class={classNames(displayClass, "page-title")}>
        <a href={baseDir} draggable="false">
          <svg
            class="page-title-logo"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <g class="logo-edges">
              {logoEdges.map(([a, b]) => (
                <line
                  key={`${a}-${b}`}
                  class="logo-edge"
                  data-a={a}
                  data-b={b}
                  x1={logoNodes[a].x}
                  y1={logoNodes[a].y}
                  x2={logoNodes[b].x}
                  y2={logoNodes[b].y}
                />
              ))}
              <line
                class="logo-stem"
                data-stem={logoStemFrom}
                x1={logoNodes[logoStemFrom].x}
                y1={logoNodes[logoStemFrom].y}
                x2={logoNodes[logoStemFrom].x - 4.589}
                y2={logoNodes[logoStemFrom].y + 9.248}
              />
            </g>
            <g class="logo-nodes">
              {logoNodes.map((node, index) => (
                <g
                  key={index}
                  class="logo-node"
                  data-index={index}
                  data-x={node.x}
                  data-y={node.y}
                  transform={`translate(${node.x} ${node.y})`}
                >
                  <circle r={NODE_RADIUS} />
                </g>
              ))}
            </g>
          </svg>
          <span>{title}</span>
        </a>
        <span class="page-title-divider" aria-hidden="true"></span>
        <ul class="page-title-socials">
          {Object.entries(links).map(([name, url]) => (
            <li key={name}>
              <a href={url} aria-label={name}>
                {icons[name] ?? name}
              </a>
            </li>
          ))}
          <li class="page-title-socials-divider" aria-hidden="true"></li>
          <li>
            <button class="darkmode" type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="lightOnIcon"
                viewBox="0 0 24 24"
                width="20px"
                height="20px"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label={i18n(cfg.locale).components.themeToggle.darkMode}
              >
                <title>{i18n(cfg.locale).components.themeToggle.darkMode}</title>
                <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="lightOffIcon"
                viewBox="0 0 24 24"
                width="20px"
                height="20px"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label={i18n(cfg.locale).components.themeToggle.lightMode}
              >
                <title>{i18n(cfg.locale).components.themeToggle.lightMode}</title>
                <path d="M16.8 11.2c.8-.9 1.2-2 1.2-3.2a6 6 0 0 0-9.3-5" />
                <path d="m2 2 20 20" />
                <path d="M6.3 6.3a4.67 4.67 0 0 0 1.2 5.2c.7.7 1.3 1.5 1.5 2.5" />
                <path d="M9 18h6" />
                <path d="M10 22h4" />
              </svg>
            </button>
          </li>
          <li>
            <button class="readermode" type="button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="readerOffIcon"
                viewBox="0 0 24 24"
                width="20px"
                height="20px"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label="Enable focus mode"
              >
                <title>Enable focus mode</title>
                <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
                <path d="m2 2 20 20" />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="readerOnIcon"
                viewBox="0 0 24 24"
                width="20px"
                height="20px"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                role="img"
                aria-label="Disable focus mode"
              >
                <title>Disable focus mode</title>
                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </li>
        </ul>
        <span class="page-title-divider" aria-hidden="true"></span>
      </h2>
    )
  }

  PageTitle.css = `
.page-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.75rem;
  margin: 0;
  font-family: var(--titleFont);
}

.page-title > a {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.page-title-logo {
  display: block;
  width: 6rem;
  height: 6rem;
  margin-top: -1.25rem;
  margin-bottom: -1rem;
  overflow: hidden;
  user-select: none;
  -webkit-user-drag: none;
  cursor: grab;
}

.page-title-logo:active {
  cursor: grabbing;
}

/* The mark keeps the original logo's mass — bars at their path weight, nodes
   solid and even — while the Graph of Contents supplies the behaviour: on
   focus everything outside the 1-ring fades to 0.2, and the linked nodes open
   into hollow rings. */
.page-title-logo .logo-edge,
.page-title-logo .logo-stem {
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  fill: none;
  opacity: 1;
  transition: opacity 0.3s ease, stroke-width 0.3s ease;
}

.page-title-logo .logo-node circle {
  fill: currentColor;
  fill-opacity: 1;
  stroke: currentColor;
  stroke-width: 0;
  /* The circle sits at 0,0 inside its translated group, so scale about that
     origin. transform-origin: center would resolve against the viewBox and
     throw the node out from under the cursor. */
  transform-origin: 0 0;
  transition:
    opacity 0.3s ease,
    transform 0.2s ease,
    fill-opacity 0.3s ease,
    stroke-width 0.3s ease;
}

.page-title-logo.is-focusing .logo-edge,
.page-title-logo.is-focusing .logo-stem {
  opacity: 0.15;
}

.page-title-logo.is-focusing .logo-node circle {
  opacity: 0.2;
}

.page-title-logo.is-focusing .logo-edge.is-lit,
.page-title-logo.is-focusing .logo-stem.is-lit {
  opacity: 0.5;
}

.page-title-logo.is-focusing .logo-node.is-lit circle {
  opacity: 1;
}

/* Linked nodes open into the graph's hollow rings. */
.page-title-logo.is-focusing .logo-node.is-ring circle {
  fill-opacity: 0;
  stroke-width: 1.5;
}

/* The focused node scales up 1.1x — the graph does exactly this to its label. */
.page-title-logo.is-focusing .logo-node.is-focus circle {
  transform: scale(1.1);
}

@media (prefers-reduced-motion: reduce) {
  .page-title-logo .logo-edge,
  .page-title-logo .logo-stem,
  .page-title-logo .logo-node circle {
    transition: none;
  }
}

.page-title-divider {
  background-color: var(--lightgray);
  border: none;
  width: 100%;
  height: 1px;
  margin: 2rem auto;
}

.page-title-divider:last-child {
  margin-bottom: 0;
}

.page-title-socials {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin: -1.5rem 0;
  padding: 0;
  list-style: none;
}

.page-title-socials > li {
  display: flex;
}

.page-title-socials-divider {
  width: 1px;
  height: 1rem;
  background-color: var(--lightgray);
}

.page-title-socials svg {
  display: block;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: var(--darkgray);
  transition: stroke 0.2s ease;
}

.page-title-socials a:hover svg {
  stroke: var(--tertiary);
}

.page-title-socials .darkmode,
.page-title-socials .readermode {
  display: flex;
  padding: 0;
  margin: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
}

.page-title-socials .darkmode:hover svg,
.page-title-socials .readermode:hover svg {
  stroke: var(--tertiary);
}

/* Phone: the left sidebar is a single horizontal strip (explorer + title + search),
   so drop the tall column furniture — hairlines, negative margins, 6rem logo. */
@media (max-width: 800px) {
  .page-title {
    flex-direction: row;
    flex-wrap: wrap;
    /* flex-start: centering overflowed and clipped the logo off the left edge */
    justify-content: flex-start;
    align-items: center;
    gap: 0.5rem 0.5rem;
    font-size: 1.25rem;
    /* flex-basis 0 so it shares the row with the explorer hamburger */
    flex: 1 1 0;
    min-width: 0;
  }

  .page-title > a {
    flex-direction: row;
    gap: 0.5rem;
    min-width: 0;
  }

  .page-title-logo {
    width: 2.25rem;
    height: 2.25rem;
    margin: 0;
    flex-shrink: 0;
  }

  .page-title-divider {
    display: none;
  }

  .page-title-socials {
    margin: 0;
    gap: 0.5rem;
    /* one row of icons — wrap the group, never the icons */
    flex-wrap: nowrap;
  }
}

:root[saved-theme="dark"] {
  color-scheme: dark;
}

:root[saved-theme="light"] {
  color-scheme: light;
}

:root[saved-theme="dark"] .page-title-socials .darkmode .lightOnIcon {
  display: none;
}

:root[saved-theme="dark"] .page-title-socials .darkmode .lightOffIcon {
  display: block;
}

:root .page-title-socials .darkmode .lightOnIcon {
  display: block;
}

:root .page-title-socials .darkmode .lightOffIcon {
  display: none;
}

:root[reader-mode="on"] .page-title-socials .readermode .readerOffIcon {
  display: none;
}

:root[reader-mode="on"] .page-title-socials .readermode .readerOnIcon {
  display: block;
}

:root .page-title-socials .readermode .readerOffIcon {
  display: block;
}

:root .page-title-socials .readermode .readerOnIcon {
  display: none;
}

/* Focus mode fades both sidebars until hovered (was readermode.scss).
   Hover-only reveal: on touch there is no way back, so keep sidebars visible there. */
@media (hover: hover) {
  :root[reader-mode="on"] .sidebar.left,
  :root[reader-mode="on"] .sidebar.right {
    opacity: 0;
    transition: opacity 0.2s ease;
  }

  :root[reader-mode="on"] .sidebar.left:hover,
  :root[reader-mode="on"] .sidebar.right:hover {
    opacity: 1;
  }
}
`

  PageTitle.beforeDOMLoaded = [darkmodeScript, readermodeScript]
  PageTitle.afterDOMLoaded = [pageLogoScript]

  return PageTitle
}) satisfies QuartzComponentConstructor

export default PageTitlePlugin
export { PageTitlePlugin as PageTitle }
