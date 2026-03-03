export default function DashboardLoading() {
  return (
    <div className="space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="h-4 w-72 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-6 space-y-3">
        <div className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-12 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
