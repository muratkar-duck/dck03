export default function NotFound() {
  return (
    <main className="max-w-2xl mx-auto p-6 text-center">
      <h1 className="text-2xl font-bold mb-2">Sayfa bulunamadı</h1>
      <p className="text-[#7a5c36]">
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <a href="/" className="btn btn-primary mt-4">
        🏠 Ana sayfaya dön
      </a>
    </main>
  );
}
