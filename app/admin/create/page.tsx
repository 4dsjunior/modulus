import { createTenant } from './actions'

export default function AdminCreatePage() {
  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-6 text-white">
          <h1 className="text-2xl font-bold">Painel Master Modulus</h1>
          <p className="text-slate-400 text-sm">Provisionamento de novos clientes</p>
        </div>
        
        <form action={createTenant} className="p-8 space-y-6">
          {/* Dados da Empresa */}
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome da Empresa</label>
              <input 
                type="text" 
                name="companyName" 
                className="w-full p-3 border border-slate-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Ex: Titans Combate" 
                required 
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Slug (URL)</label>
              <input 
                type="text" 
                name="slug" 
                className="w-full p-3 border border-slate-300 rounded-lg text-gray-900 bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="titans" 
                required 
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Módulo</label>
              <select name="module" className="w-full p-3 border border-slate-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="academia">Academia</option>
                <option value="varejo">Varejo</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* Dados do Usuário Admin */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Email do Proprietário</label>
            <input 
              type="email" 
              name="email" 
              className="w-full p-3 border border-slate-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="admin@empresa.com"
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Senha Inicial</label>
            <input 
              type="password" 
              name="password" 
              className="w-full p-3 border border-slate-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none" 
              placeholder="••••••••"
              required 
            />
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md">
            Criar Cliente
          </button>
        </form>
      </div>
    </div>
  )
}