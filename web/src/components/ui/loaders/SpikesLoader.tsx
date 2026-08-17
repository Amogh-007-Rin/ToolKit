import Spokes from "./Spokes";

export default function SpikesLoader({
  className = "size-5",
}: {
  className?: string;
}) {
  return <Spokes className={className} aria-hidden="true" />;
}
