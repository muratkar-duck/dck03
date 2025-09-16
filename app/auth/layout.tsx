export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section className="min-h-screen flex items-center justify-center bg-[#faf3e0] p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md border-l-4 border-[#f9c74f]">
        {children}
      </div>
    </section>
  );
}
