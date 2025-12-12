"use client";

import { useState, useTransition } from "react";
import { login } from "./actions";
import Image from "next/image";
import ValidatedInput from "../components/ValidatedInput";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  
  // Estado para controlar a validade geral do formulário
  const [formState, setFormState] = useState({
    email: { isValid: false, value: "" },
    password: { isValid: false, value: "" },
  });

  const handleValidationChange = (id: string, isValid: boolean, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [id]: { isValid, value },
    }));
  };

  const isFormValid = formState.email.isValid && formState.password.isValid;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormValid) {
      startTransition(() => {
        const formData = new FormData();
        formData.append("email", formState.email.value);
        formData.append("password", formState.password.value);
        login(formData);
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full p-10 bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-20 h-20 mb-2">
            <Image
              src="/logo.png"
              alt="Modulus"
              fill
              className="object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-[#0F263E]">Modulus</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ValidatedInput
            id="email"
            label="Email corporativo"
            type="email"
            validationRegex={/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/}
            errorMessage="Insira um e-mail válido (ex: abc@dominio.com)."
            onValidationChange={handleValidationChange}
            autoComplete="email"
          />
          
          <ValidatedInput
            id="password"
            label="Senha"
            type="password"
            validationRegex={/.{6,}/}
            errorMessage="A senha deve ter no mínimo 6 caracteres."
            onValidationChange={handleValidationChange}
            autoComplete="current-password"
          />

          <button
            type="submit"
            disabled={!isFormValid || isPending}
            className="w-full py-3 bg-[#0F263E] text-white font-bold rounded-lg transition-colors duration-300 hover:bg-[#1c4a79] disabled:bg-slate-400 disabled:cursor-not-allowed shadow-lg"
          >
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}