/** Short, safe display for long URLs — shows host + first path segment, links to the full URL. */
export function SmartLink({ href, className }: { href: string; className?: string }) {
  let label = href;
  try {
    const u = new URL(href.startsWith("http") ? href : `https://${href}`);
    const path = u.pathname.replace(/\/$/, "");
    const short = path && path !== "/" ? `${u.hostname}${path.split("/").slice(0, 2).join("/")}` : u.hostname;
    label = short.length > 40 ? `${short.slice(0, 38)}…` : short;
  } catch { /* keep raw */ }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className ?? "text-primary hover:underline break-all"}
      title={href}
    >
      {label}
    </a>
  );
}
