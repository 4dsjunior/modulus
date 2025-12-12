"use client";

import { useState, useTransition } from "react";
import { createTenant } from "./actions";
import Link from "next/link";
import ValidatedInput from "../../components/ValidatedInput";

export default function AdminCreatePage() {
  const [isPending, startTransition] = useTransition();

  const [formState, setFormState] = useState({
    companyName: { isValid: false, value: "" },
    slug: { isValid: false, value: "" },
    email: { isValid: false, value: "" },
    password: { isValid: false, value: "" },
    module: { isValid: true, value: "academia" }, // Default value
  });

  const handleValidationChange = (id: string, isValid: boolean, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [id]: { isValid, value },
    }));
  };

  const handleModuleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormState((prevState) => ({
      ...prevState,
      [name]: { isValid: true, value },
    }));
  };
  
  const isFormValid =
    formState.companyName.isValid &&
    formState.slug.isValid &&
    formState.email.isValid &&
    formState.password.isValid;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormValid) {
      startTransition(() => {
        const formData = new FormData();
        formData.append("companyName", formState.companyName.value);
        formData.append("slug", formState.slug.value);
        formData.append("email", formState.email.value);
        formData.append("password", formState.password.value);
        formData.append("module", formState.module.value);
        createTenant(formData);
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Painel Master Modulus</h1>
          <Link href="/admin/users" className="text-blue-600 hover:underline">
            Voltar
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 p-6 text-white">
            <h1 className="text-2xl font-bold">
              Provisionamento de novos clientes
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <ValidatedInput
                  id="companyName"
                  label="Nome da Empresa"
                  type="text"
                  validationRegex={/.{3,}/}
                  errorMessage="O nome da empresa deve ter no mínimo 3 caracteres."
                  onValidationChange={handleValidationChange}
                />
              </div>

              <div>
                <ValidatedInput
                  id="slug"
                  label="Slug (URL)"
                  type="text"
                  validationRegex={/^[a-z0-9-]+$/}
                  errorMessage="Use apenas letras minúsculas, números e hifens."
                  onValidationChange={handleValidationChange}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Módulo</label>
                <select
                  name="module"
                  onChange={handleModuleChange}
                  className="w-full p-3 border border-slate-300 rounded-lg text-black bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="academia">Academia</option>
                  <option value="varejo">Varejo</option>
                </select>
              </div>
            </div>

            <hr className="border-slate-200" />

            <ValidatedInput
              id="email"
              label="Email do Proprietário"
              type="email"
              validationRegex={/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/}
              errorMessage="Insira um e-mail válido."
              onValidationChange={handleValidationChange}
            />
            
            <ValidatedInput
              id="password"
              label="Senha Inicial"
              type="password"
              validationRegex={/.{6,}/}
              errorMessage="A senha deve ter no mínimo 6 caracteres."
              onValidationChange={handleValidationChange}
            />

            <button
              type="submit"
              disabled={!isFormValid || isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              {isPending ? "Criando..." : "Criar Cliente"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
