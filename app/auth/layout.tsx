export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="flex min-h-screen h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#faf3e0] px-4 py-10">
      <div className="w-full max-w-lg space-y-6 rounded-2xl border border-[#f5d9a6] bg-white/95 p-10 shadow-xl">
        {children}
      </div>
    </section>
  );
}
