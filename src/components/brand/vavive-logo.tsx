export function VaviveLogo({
  className = "h-12 w-12",
}: {
  className?: string;
}) {
  return (
    <img
      src="/logo-vavive.png"
      alt="Logo VAVIVÊ"
      className={`object-contain ${className}`}
      draggable={false}
    />
  );
}
