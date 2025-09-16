export default function Loader({
  label = 'Yükleniyor...',
}: {
  label?: string;
}) {
  return <div className="text-sm text-[#a38d6d] animate-pulse">{label}</div>;
}
