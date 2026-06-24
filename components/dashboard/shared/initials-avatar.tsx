import { cn } from "@/lib/utils"

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function InitialsAvatar({
  name,
  size = "sm",
  className,
}: {
  name: string
  size?: "sm" | "lg"
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#00b2de] font-semibold text-white select-none",
        size === "lg" ? "size-11 text-base" : "size-8 text-xs",
        className,
      )}
    >
      {getInitials(name)}
    </span>
  )
}
