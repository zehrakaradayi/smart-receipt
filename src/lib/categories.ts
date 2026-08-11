export const CATEGORIES = [
  "Grocery",
  "Food",
  "Transport",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];
