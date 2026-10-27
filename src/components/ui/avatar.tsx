import { cn, initials } from "@/lib/utils";

const palette = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
];

function colorFor(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) % 997;
  }
  return palette[hash % palette.length];
}

export function Avatar({
  firstName,
  lastName,
  src,
  size = "md",
  className,
}: {
  firstName?: string | null;
  lastName?: string | null;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim() || "?";
  const sizes = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-white", sizes[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        colorFor(name),
        sizes[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
