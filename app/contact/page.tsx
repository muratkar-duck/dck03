export default function ContactPage() {
  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-3xl font-bold">İletişim</h1>
      <p>
        Bize ulaşmak için aşağıdaki formu doldurun. En kısa sürede sizinle
        iletişime geçeceğiz.
      </p>
      <form className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Adınız</label>
          <input
            type="text"
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">E-posta</label>
          <input
            type="email"
            className="w-full p-3 border rounded-lg"
            required
          />
        </div>
        <div>
          <label className="block font-semibold mb-1">Mesajınız</label>
          <textarea
            className="w-full p-3 border rounded-lg"
            rows={5}
            required
          ></textarea>
        </div>
        <button type="submit" className="btn btn-primary">
          Gönder
        </button>
      </form>
    </div>
  );
}
