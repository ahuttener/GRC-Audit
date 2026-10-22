/**
 * Print a standalone HTML report; the browser's print dialog saves it as a PDF.
 * A hidden iframe avoids pop-up blockers and keeps the user on the page. Printing waits for the
 * first image (the CyberSecInfo emblem) so the logo is never missing from the PDF.
 */
export function printHtml(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    win.focus();
    win.print();
    setTimeout(() => frame.remove(), 1000);
  };
  const img = doc.images[0];
  if (img && !img.complete) {
    img.addEventListener("load", go, { once: true });
    img.addEventListener("error", go, { once: true });
  } else {
    go();
  }
}

/** Absolute URL of the CyberSecInfo emblem used in the report header. */
export function emblemUrl(): string {
  return `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/emblem.png`;
}
