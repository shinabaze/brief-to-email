// An intro, a list of items, then one button. Items with an image sit side by side on
// desktop and stack on a phone. The page layout is shared with the announcement.
import { esc, paragraphs, eyebrow, headline, button, shell } from "./announcement.mjml.js";

function item(it, brief, isLast) {
  const text = `
        <mj-text font-size="18px" font-weight="700" line-height="1.35" color="#111827" padding="0 0 6px">
          <a href="${esc(it.url)}" style="color:#111827;text-decoration:none;">${esc(it.title)}</a>
        </mj-text>
        <mj-text font-size="15px" padding="0 0 8px">${esc(it.text)}</mj-text>
        <mj-text css-class="link" font-size="15px" padding="0">
          <a href="${esc(it.url)}" style="color:${brief.brand.primaryColor};">Read more &rarr;</a>
        </mj-text>`;

  const image = it.image
    ? `
        <mj-column width="34%" vertical-align="top" padding="0 18px 14px 0" css-class="item-img">
          <mj-image src="${esc(it.image)}" alt="${esc(it.imageAlt ?? it.title)}" href="${esc(it.url)}"
            padding="0" border-radius="8px" fluid-on-mobile="true" />
        </mj-column>`
    : "";

  return `
      <mj-section padding="0 32px">${image}
        <mj-column width="${it.image ? "66%" : "100%"}" vertical-align="top">${text}
        </mj-column>
      </mj-section>
      <mj-section padding="0 32px">
        <mj-column>
          <mj-divider border-width="1px" border-color="${isLast ? "#FFFFFF" : "#E5E7EB"}" padding="${isLast ? "12px 0" : "24px 0"}" />
        </mj-column>
      </mj-section>`;
}

export default function newsletter(brief) {
  return shell(brief, `
      <mj-section>
        <mj-column>
          ${eyebrow(brief)}
          ${headline(brief)}
          ${paragraphs(brief.body)}
          <mj-divider border-width="1px" border-color="#E5E7EB" padding="12px 32px 24px" />
        </mj-column>
      </mj-section>
      ${brief.items.map((it, i) => item(it, brief, i === brief.items.length - 1)).join("")}
      <mj-section>
        <mj-column>${button(brief)}
        </mj-column>
      </mj-section>`);
}
