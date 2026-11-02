export const siteConfig = {
  name: "ShopNest",
  description:
    "Quality everyday products with simple bank-transfer checkout. Browse by category, pick your variant and order in minutes.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  // Shown to customers on the order page. Edit to match your real account.
  payment: {
    method: "Bank transfer",
    bankName: "Your Bank Name",
    accountName: "Your Business Name",
    accountNumber: "0000 0000 0000",
    instructions:
      "Transfer the exact order total, then upload a clear photo or screenshot of the transfer slip below. Use your order number as the payment reference.",
  },
  support: {
    email: "support@example.com",
  },
} as const;
