const Skeleton = ({ className }: { className: string }) => (
  <div className={`animate-pulse rounded-xl bg-skeleton ${className}`} />
);

export default function ProfileSkeleton() {
  return (
    <div
      className="min-h-screen w-full overflow-hidden bg-background"
      role="status"
      aria-label="Loading profile"
      aria-busy="true"
    >
      <span className="sr-only">Loading profile</span>
      <div className="relative h-[25vh] min-h-44 w-full overflow-hidden bg-muted/70">
        <div className="absolute inset-0 animate-pulse bg-linear-to-r from-skeleton via-skeleton-highlight to-skeleton" />
      </div>

      <div className="relative mx-auto w-full px-6 pb-8 sm:px-10">
        <div className="absolute -top-16 left-8 sm:-top-20 sm:left-24">
          <div className="h-32 w-32 animate-pulse rounded-full border-4 border-background bg-skeleton sm:h-40 sm:w-40" />
        </div>

        <div className="flex min-h-52 flex-col gap-5 pt-20 sm:min-h-70 sm:pt-7">
          <div className="flex justify-end">
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-3 w-24" />
              <Skeleton className="ml-auto h-8 w-32 rounded-full" />
            </div>
          </div>

          <div className="space-y-2 sm:ml-17">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-3 w-28" />
          </div>

          <div className="flex flex-col justify-between gap-4 sm:ml-17 sm:flex-row sm:items-end">
            <div className="space-y-3">
              <Skeleton className="h-3 w-72 max-w-[70vw]" />
              <Skeleton className="h-3 w-36" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-10 w-32 rounded-full" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-3 gap-1 p-1 sm:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div
            key={index}
            className="aspect-4/5 animate-pulse rounded-lg bg-skeleton"
            style={{ animationDelay: `${index * 45}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
