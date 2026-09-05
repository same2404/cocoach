export const fixOklchForHtml2Canvas = (clonedDoc: Document) => {
  try {
    // 1. Sanitize all <style> elements in clonedDoc to prevent html2canvas CSS parser from failing on oklch
    const styleElements = clonedDoc.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
        styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/gi, '#1e293b');
      }
    });

    // 2. Sanitize inline style attributes
    const allElements = clonedDoc.querySelectorAll('*');
    allElements.forEach((el) => {
      if (el instanceof HTMLElement) {
        const styleAttr = el.getAttribute('style');
        if (styleAttr && styleAttr.includes('oklch')) {
          el.setAttribute('style', styleAttr.replace(/oklch\([^)]+\)/gi, '#1e293b'));
        }
      }
    });
  } catch (err) {
    console.warn("Could not sanitize oklch for html2canvas:", err);
  }
};
