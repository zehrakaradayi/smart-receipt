const ICON_PATHS: Record<string, string> = {
  Grocery: "M4 8h16l-1.4 9.3A2 2 0 0 1 16.6 19H7.4a2 2 0 0 1-2-1.7L4 8Zm4 0V6a4 4 0 0 1 8 0v2",
  Food: "M7 2v7a2 2 0 1 1-4 0V2M5 2v20M18.5 2c-1.7 0-3 2.24-3 5s1.3 5 3 5M18.5 2v18",
  Transport:
    "M5 17h14M6 17l1.4-5.1A2 2 0 0 1 9.2 10.5h5.6a2 2 0 0 1 1.9 1.4L18 17M7.5 17a1.5 1.5 0 1 0 3 0M13.5 17a1.5 1.5 0 1 0 3 0",
  Shopping: "M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2",
  Health: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 5v8m-4-4h8",
  Education: "M12 3 2 8l10 5 10-5-10-5Zm-6 7.5V16c0 1.5 2.5 3 6 3s6-1.5 6-3v-5.5",
  Entertainment:
    "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Zm6-2v12",
  Bills: "M7 3h7l4 4v14H7V3Zm2 7h6m-6 3h6m-6 3h4",
  Other: "M6 12h.01M12 12h.01M18 12h.01",
};

export function CategoryIcon({ category, className }: { category: string; className?: string }) {
  const path = ICON_PATHS[category];
  if (!path) return null;

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
