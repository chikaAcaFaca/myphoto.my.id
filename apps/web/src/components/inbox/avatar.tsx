/** Initial-letter avatar used in the Inbox and chat. */
export function Avatar({ name, size = 48 }: { name?: string; size?: number }) {
  return (
    <span
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full bg-primary-50 font-extrabold text-primary-500 dark:bg-primary-500/15 dark:text-[#7B98FF]"
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}
