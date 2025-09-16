export default function EmptyState({
  title,
  desc,
}: {
  title: string;
  desc?: string;
}) {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
      <p className="font-medium">{title}</p>
      {desc ? <p className="text-sm text-yellow-700 mt-1">{desc}</p> : null}
    </div>
  );
}
