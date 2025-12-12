"use client";

import { useState, useTransition } from "react";
import { createUser } from "../actions";
import ValidatedInput from "../../../components/ValidatedInput";

export default function CreateUserPage() {
  const [isPending, startTransition] = useTransition();

  const [formState, setFormState] = useState({
    fullName: { isValid: false, value: "" },
    email: { isValid: false, value: "" },
    password: { isValid: false, value: "" },
  });

  const handleValidationChange = (id: string, isValid: boolean, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [id]: { isValid, value },
    }));
  };

  const isFormValid =
    formState.fullName.isValid &&
    formState.email.isValid &&
    formState.password.isValid;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormValid) {
      startTransition(() => {
        const formData = new FormData();
        formData.append("fullName", formState.fullName.value);
        formData.append("email", formState.email.value);
        formData.append("password", formState.password.value);
        createUser(formData);
      });
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">
        Criar Novo Usuário
      </h2>
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <ValidatedInput
            id="fullName"
            label="Nome Completo"
            type="text"
            validationRegex={/^([a-zA-Zà-úÀ-Ú]+)\s+([a-zA-Zà-úÀ-Ú\s]+)$/}
            errorMessage="Digite nome e sobrenome (sem números)."
            onValidationChange={handleValidationChange}
          />
          <ValidatedInput
            id="email"
            label="Email"
            type="email"
            validationRegex={/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/}
            errorMessage="Insira um e-mail válido."
            onValidationChange={handleValidationChange}
          />
          <ValidatedInput
            id="password"
            label="Senha"
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
            {isPending ? "Salvando..." : "Salvar Usuário"}
          </button>
        </form>
      </div>
    </div>
  );
}
