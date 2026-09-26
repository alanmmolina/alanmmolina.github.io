import { JSX } from "preact"
// @ts-ignore
import darkmodeScript from "./scripts/darkmode.inline"
// @ts-ignore
import readermodeScript from "./scripts/readermode.inline"
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
  Email: (
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
      <title>Email</title>
      <path d="M17 20h3.75a1.25 1 0 0 0 1.25-1V5a1.25 1 0 0 0-1.25-1h-3.75z" />
      <path d="M3.25 20h3.75V4H3.25a1.25 1 0 0 0-1.25 1v14a1.25 1 0 0 0 1.25 1" />
      <path d="M17 4l-5 4l-5-4" />
      <path d="m2 6.5l10 7.5l10-7.5" />
    </svg>
  ),
}

const PageTitlePlugin = ((opts?: Options) => {
  const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
    const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
    const baseDir = pathToRoot(fileData.slug!)
    const links = opts?.links ?? {}
    return (
      <h2 class={classNames(displayClass, "page-title")}>
        <a href={baseDir}>
          <svg
            class="page-title-logo"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <g transform="translate(15, 15) scale(0.75)">
              <path
                d="M91,51c-0.5,0-0.9,0.1-1.3,0.2l-6-9.2c0.5-0.7,0.8-1.6,0.8-2.5c0-2.5-2-4.5-4.5-4.5c-0.4,0-0.8,0.1-1.2,0.2l-5.9-7.5c0.3-0.6,0.6-1.4,0.6-2.1c0-2.5-2-4.5-4.5-4.5c-1.5,0-2.8,0.7-3.6,1.8l-18.1-3.6C46.7,17.4,45,16,43,16c-2.3,0-4.2,1.8-4.5,4.1l-17,5.7C20.7,24.7,19.5,24,18,24c-2.5,0-4.5,2-4.5,4.5c0,1.2,0.5,2.4,1.3,3.2L8.1,54.1c-2.1,0.4-3.6,2.2-3.6,4.4C4.5,61,6.5,63,9,63c0.6,0,1.1-0.1,1.7-0.3l10.9,7.1c0,0.2-0.1,0.5-0.1,0.7c0,2.5,2,4.5,4.5,4.5c1.8,0,3.4-1.1,4.1-2.7l10.8,0.9c0.7,1.6,2.3,2.8,4.1,2.8c1.9,0,3.5-1.2,4.2-2.8l9.7-0.9c0.2,0.4,0.4,0.7,0.7,1.1l-3.9,8.6c-0.3,0.8,0,1.6,0.7,2C56.6,84,56.8,84,57,84c0.6,0,1.1-0.3,1.4-0.9l3.8-8.3c0.3,0.1,0.6,0.1,0.9,0.1c2,0,3.6-1.3,4.2-3.1h8.5C76.4,73.7,78,75,80,75c2.5,0,4.5-2,4.5-4.5c0-0.8-0.2-1.5-0.6-2.2l6-8.4c0.4,0.1,0.7,0.2,1.1,0.2c2.5,0,4.5-2,4.5-4.5S93.5,51,91,51z M80,66c-1.9,0-3.6,1.2-4.2,2.9h-8.6c-0.5-1.3-1.5-2.3-2.9-2.7l0.7-8.7c1.5-0.7,2.5-2.2,2.5-4c0-0.2,0-0.4-0.1-0.7l10.7-9.3c0.6,0.3,1.2,0.4,1.8,0.4c0.4,0,0.9-0.1,1.3-0.2l6,9.3c-0.5,0.7-0.7,1.6-0.7,2.5c0,1,0.3,1.9,0.9,2.7l-5.8,8.1C81.1,66.1,80.6,66,80,66z M26,66c-1.1,0-2.2,0.4-3,1.2L13,60.6c0.3-0.6,0.5-1.3,0.5-2.1c0-0.3,0-0.5-0.1-0.8l23.1-14.4c0.6,0.8,1.5,1.4,2.6,1.6l3.5,22.8c-0.9,0.6-1.6,1.5-1.9,2.5l-10.4-0.9C29.8,67.4,28.1,66,26,66z M18,33c2.4,0,4.4-1.9,4.5-4.4L39.3,23c0.4,0.7,1.1,1.2,1.8,1.6l-2.2,11.6c-1.9,0.5-3.4,2.2-3.4,4.3L11.9,55.1c-0.3-0.2-0.5-0.4-0.8-0.6l6.5-21.6C17.7,32.9,17.8,33,18,33z M69,30c0.6,0,1.2-0.1,1.7-0.3l5.6,7.2c-0.5,0.7-0.8,1.6-0.8,2.6c0,0.7,0.2,1.4,0.5,2l-10,8.7c-0.8-0.7-1.8-1.1-3-1.1c-1.1,0-2.1,0.4-2.9,1.1l-15.7-9.4c0,0,0-0.1,0-0.1c0-1.8-1.1-3.4-2.6-4.1L44,24.9c1.4-0.3,2.5-1.3,3.1-2.6l17.4,3.4C64.6,28.1,66.6,30,69,30z M45.5,67l-3.4-22.5c0.5-0.3,0.9-0.6,1.3-1l15.2,9.2c-0.1,0.3-0.1,0.6-0.1,0.9c0,2.1,1.5,3.9,3.5,4.4l-0.7,8.4c-1.3,0.5-2.2,1.6-2.6,3l-9.4,0.9C48.7,68.4,47.3,67.2,45.5,67z"
                fill="currentColor"
              />
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

/* Focus mode fades both sidebars until hovered (was readermode.scss) */
:root[reader-mode="on"] .sidebar.left,
:root[reader-mode="on"] .sidebar.right {
  opacity: 0;
  transition: opacity 0.2s ease;
}

:root[reader-mode="on"] .sidebar.left:hover,
:root[reader-mode="on"] .sidebar.right:hover {
  opacity: 1;
}
`

  PageTitle.beforeDOMLoaded = [darkmodeScript, readermodeScript]

  return PageTitle
}) satisfies QuartzComponentConstructor

export default PageTitlePlugin
export { PageTitlePlugin as PageTitle }
