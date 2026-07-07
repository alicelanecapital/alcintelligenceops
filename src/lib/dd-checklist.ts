export const DD_CHECKLIST_DEFAULT = [
  "Pitch Deck",
  "Executive Summary",
  "Business Plan",
  "Company Registration Documents",
  "Shareholding Structure / Cap Table",
  "Financial Statements",
  "Management Accounts",
  "Financial Forecasts",
  "Bank Statements",
  "Customer List",
  "Major Contracts",
  "Intellectual Property Information",
  "Product Documentation",
  "Technology Architecture",
  "Compliance Certificates",
  "Licences",
  "Insurance Documentation",
  "Organisational Structure",
  "Key Team Profiles",
  "Existing Investors",
  "Current Funding Round Information",
  "References",
];

export function buildDefaultRequestEmail(contactName: string, senderName?: string) {
  const first = contactName.split(" ")[0] ?? contactName;
  const sender = senderName ?? "Alice Lane Capital";
  return {
    subject: `Due diligence next steps · ${sender}`,
    body: `Hi ${first},

Thank you for taking the time to meet with us. It was great to learn more about the business and to explore how we might work together.

Following our conversation, we would like to progress the opportunity to the due diligence stage. To do this, please could you share the items ticked below so we can begin our review.

Please reply to this email with the documents attached, or share a secure folder link. If any items are not yet available, let us know and we will work around it.

Warm regards,
${sender}
`,
  };
}
