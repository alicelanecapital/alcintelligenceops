import jsQR from "jsqr";

export type QRContactFields = {
  name?: string;
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  website?: string;
  linkedin?: string;
  notes?: string;
};

/** Decode a QR from a data URL. Returns raw string or null. */
export async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      resolve(code?.data ?? null);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

/** Parse a QR string into contact fields. Supports vCard, MECARD, URL, mailto, tel, plain. */
export function parseQrToContact(raw: string): QRContactFields {
  const s = raw.trim();
  const out: QRContactFields = {};
  if (/^BEGIN:VCARD/i.test(s)) {
    const lines = s.split(/\r?\n/);
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const keyPart = line.slice(0, idx).toUpperCase();
      const value = line.slice(idx + 1).trim();
      if (!value) continue;
      const key = keyPart.split(";")[0];
      if (key === "FN") out.name = value;
      else if (key === "N" && !out.name) out.name = value.split(";").filter(Boolean).reverse().join(" ").trim();
      else if (key === "ORG") out.company = value.replace(/;+$/, "").replace(/;/g, " – ");
      else if (key === "TITLE") out.position = value;
      else if (key === "EMAIL" && !out.email) out.email = value;
      else if (key === "TEL" && !out.phone) out.phone = value;
      else if (key === "URL" && !out.website) out.website = value;
      else if (key === "X-SOCIALPROFILE" && /linkedin/i.test(value)) out.linkedin = value;
      else if (key === "NOTE") out.notes = value;
    }
    if (out.website && /linkedin\.com/i.test(out.website) && !out.linkedin) {
      out.linkedin = out.website;
    }
    return out;
  }
  if (/^MECARD:/i.test(s)) {
    const body = s.replace(/^MECARD:/i, "").replace(/;;$/, "");
    for (const seg of body.split(";")) {
      const idx = seg.indexOf(":");
      if (idx === -1) continue;
      const k = seg.slice(0, idx).toUpperCase();
      const v = seg.slice(idx + 1).trim();
      if (!v) continue;
      if (k === "N") out.name = v.split(",").reverse().join(" ").trim();
      else if (k === "ORG") out.company = v;
      else if (k === "TITLE") out.position = v;
      else if (k === "EMAIL" && !out.email) out.email = v;
      else if (k === "TEL" && !out.phone) out.phone = v;
      else if (k === "URL" && !out.website) out.website = v;
      else if (k === "NOTE") out.notes = v;
    }
    return out;
  }
  if (/^mailto:/i.test(s)) { out.email = s.replace(/^mailto:/i, ""); return out; }
  if (/^tel:/i.test(s)) { out.phone = s.replace(/^tel:/i, ""); return out; }
  if (/^https?:\/\//i.test(s)) {
    if (/linkedin\.com/i.test(s)) out.linkedin = s;
    else out.website = s;
    return out;
  }
  out.notes = s;
  return out;
}
