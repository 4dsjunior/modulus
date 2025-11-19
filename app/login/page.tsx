import { login } from './actions'
import Image from 'next/image'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full p-10 bg-white rounded-2xl shadow-xl border border-slate-100">
        
        {/* Logo Baseado na sua imagem */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-2">
            <Image src="/logo.png" alt="Modulus" fill className="object-contain" />
          </div>
          <h2 className="text-3xl font-bold text-[#0F263E]">Modulus</h2>
        </div>

        <form action={login} className="space-y-6">
          <div>
            <input name="email" type="email" placeholder="Email corporativo" required 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4690A8] outline-none" />
          </div>
          <div>
            <input name="password" type="password" placeholder="Senha" required 
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#4690A8] outline-none" />
          </div>
          <button type="submit" 
            className="w-full py-3 bg-[#0F263E] text-white font-bold rounded-lg hover:bg- transition shadow-lg">
            Entrar
          </button>
        </form>
      </div>
    </div>
  )
}