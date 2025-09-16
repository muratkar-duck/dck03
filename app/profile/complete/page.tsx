export default function CompleteProfilePage() {
  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">Profilini Tamamla</h1>
      <p className="text-sm text-[#7a5c36]">
        Kayıt işlemin tamamlandı! Şimdi biraz kendinden bahsederek profilini
        tamamla.
      </p>

      <form className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Biyografi</label>
          <textarea
            className="w-full p-3 border rounded-lg"
            rows={4}
            placeholder="Senaryo geçmişin, ilgi alanların, hedeflerin..."
            required
          ></textarea>
        </div>

        <div>
          <label className="block font-semibold mb-1">
            Senaryo Deneyimi (yıl)
          </label>
          <input
            type="number"
            className="w-full p-3 border rounded-lg"
            placeholder="Örn: 3"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Portfolyo Linki</label>
          <input
            type="url"
            className="w-full p-3 border rounded-lg"
            placeholder="https://..."
          />
        </div>

        <button type="submit" className="btn btn-primary w-full">
          Kaydet ve Devam Et
        </button>
      </form>
    </div>
  );
}
