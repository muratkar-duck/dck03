export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Şifre Sıfırlama</h1>
      <p className="text-sm text-[#7a5c36]">
        Kayıtlı e-posta adresinizi girin. Size şifre sıfırlama bağlantısı
        göndereceğiz.
      </p>

      <form className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">E-posta Adresi</label>
          <input
            type="email"
            className="w-full p-3 border rounded-lg"
            placeholder="ornek@eposta.com"
            required
          />
        </div>

        <button type="submit" className="btn btn-primary w-full">
          Bağlantı Gönder
        </button>
      </form>

      <div className="text-sm text-right">
        <a href="/auth/sign-in" className="text-[#0e5b4a] hover:underline">
          Giriş sayfasına dön
        </a>
      </div>
    </div>
  );
}
