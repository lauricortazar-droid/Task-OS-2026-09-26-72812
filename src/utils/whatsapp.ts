/**
 * Utility for WhatsApp direct link opening in a new browser tab.
 * Example target: https://wa.me/19999011852
 */

export function cleanPhoneNumber(phone: string): string {
  if (!phone) return "";
  // Strip spaces, dashes, parentheses, plus signs, and any non-numeric character
  let cleaned = phone.replace(/[^0-9]/g, "");

  // Common MX fix: if phone is 10 digits starting with 55, 33, 81, etc., ensure country code 52 (or 521)
  // If phone is already international e.g. 19999011852 or 52155..., keep as is.
  if (cleaned.length === 10) {
    cleaned = `52${cleaned}`;
  }

  return cleaned;
}

export function buildWhatsAppUrl(phone: string, message?: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone) return "";
  if (message && message.trim()) {
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message.trim())}`;
  }
  return `https://wa.me/${cleanPhone}`;
}

export function openWhatsAppInNewTab(phone: string, message?: string): boolean {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;

  try {
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      // Fallback if popup blocker intercepted
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return true;
  } catch (err) {
    console.error("Error opening WhatsApp url:", err);
    window.location.href = url;
    return false;
  }
}
