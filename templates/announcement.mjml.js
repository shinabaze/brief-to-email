// One message, one hero image, one button. Also exports the shared layout (head, card,
// header, button, footer) that newsletter.mjml.js reuses, so both emails look like one brand.

// Brief text goes into markup, so escape it. A "<" in a headline must not become a tag.
export const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// White or near-black button text, whichever reads better on the brand colour (WCAG luminance).
export function textOn(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#111827" : "#FFFFFF";
}

// Blank lines in "body" start a new paragraph.
export const paragraphs = (body) =>
  String(body).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<mj-text padding="0 32px 16px">${esc(p)}</mj-text>`).join("\n");

// Optional small label above the headline, e.g. "New feature" or "Issue 42".
export const eyebrow = (brief) => brief.eyebrow
  ? `<mj-text font-size="12px" font-weight="700" letter-spacing="1.2px" text-transform="uppercase"
          color="${brief.brand.primaryColor}" padding="0 32px 10px">${esc(brief.eyebrow)}</mj-text>`
  : "";

export const headline = (brief) =>
  `<mj-text css-class="headline" font-size="30px" font-weight="700" line-height="1.25"
          color="#111827" padding="0 32px 16px">${esc(brief.headline)}</mj-text>`;

function head(brief) {
  return `
  <mj-head>
    <mj-title>${esc(brief.subject)}</mj-title>
    <mj-preview>${esc(brief.preheader)}</mj-preview>
    <mj-font name="Inter" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" />
    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="1.6" color="#374151" />
      <mj-section padding="0" />
    </mj-attributes>
    <mj-style inline="inline">
      .link a { color: ${brief.brand.primaryColor}; font-weight: 600; text-decoration: none; }
    </mj-style>
    <mj-style>
      @media (max-width: 480px) {
        .headline div { font-size: 26px !important; }
        .item-img td { padding-right: 0 !important; }
      }
    </mj-style>
  </mj-head>`;
}

function header(brief) {
  return `
    <mj-section padding="28px 0 0">
      <mj-column>
        <mj-image src="${esc(brief.brand.logoUrl)}" alt="${esc(brief.brand.name)}"
          width="160px" align="center" padding="0 32px 20px" />
        <mj-divider border-width="1px" border-color="#E5E7EB" padding="0 32px 28px" />
      </mj-column>
    </mj-section>`;
}

export function button(brief) {
  const color = brief.brand.primaryColor;
  // mj-button renders as a table cell with a background colour, so it still shows as a
  // button in Outlook and in clients that strip CSS. That is what "bulletproof" means here.
  return `
        <mj-button href="${esc(brief.cta.url)}" background-color="${color}" color="${textOn(color)}"
          font-size="16px" font-weight="600" border-radius="8px" inner-padding="15px 30px"
          align="left" padding="8px 32px 36px">${esc(brief.cta.text)}</mj-button>`;
}

function footer(brief) {
  // #4B5563 on the grey background keeps small footer text above WCAG AA contrast.
  return `
    <mj-section padding="24px 0 32px">
      <mj-column>
        <mj-text align="center" font-size="13px" font-weight="600" color="#374151" padding="0 32px 6px">
          ${esc(brief.brand.name)}
        </mj-text>
        <mj-text align="center" font-size="12px" line-height="1.7" color="#4B5563" padding="0 32px">
          You are getting this email because you signed up at ${esc(brief.brand.name)}.<br />
          {{company_address}}<br />
          <a href="{{unsubscribe_url}}" style="color:#4B5563;text-decoration:underline;">Unsubscribe</a>
          &nbsp;&middot;&nbsp;
          <a href="{{preferences_url}}" style="color:#4B5563;text-decoration:underline;">Email preferences</a>
        </mj-text>
      </mj-column>
    </mj-section>`;
}

// The page every template uses: grey background, a rounded white card, footer below it.
export function shell(brief, content) {
  return `<mjml lang="en">${head(brief)}
  <mj-body background-color="#EEF0F3" width="600px">
    <mj-section padding="20px 0 12px">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#4B5563" padding="0 32px">
          <a href="{{view_in_browser_url}}" style="color:#4B5563;text-decoration:underline;">View this email in your browser</a>
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-wrapper background-color="#FFFFFF" border-radius="12px" padding="0">
      ${header(brief)}
      ${content}
    </mj-wrapper>
    ${footer(brief)}
  </mj-body>
</mjml>`;
}

// Hero image from the brief, or a placeholder in the brand colour.
function hero(brief) {
  const color = brief.brand.primaryColor;
  const src = brief.image?.url ??
    `https://placehold.co/1200x600/${color.slice(1)}/${textOn(color).slice(1)}/png?text=${encodeURIComponent(brief.brand.name)}`;
  const alt = brief.image?.alt ?? brief.headline;
  return `<mj-image src="${esc(src)}" alt="${esc(alt)}" padding="0 32px 28px" border-radius="8px" />`;
}

export default function announcement(brief) {
  return shell(brief, `
      <mj-section>
        <mj-column>
          ${hero(brief)}
          ${eyebrow(brief)}
          ${headline(brief)}
          ${paragraphs(brief.body)}
          ${button(brief)}
        </mj-column>
      </mj-section>`);
}
