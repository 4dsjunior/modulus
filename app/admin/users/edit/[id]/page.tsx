"use client";

import { useState, useTransition, useEffect } from "react";
import { updateUser, getUserById } from "../../actions";
import Link from "next/link";
import ValidatedInput from "../../../../components/ValidatedInput";

// Definindo a interface para os dados do usuário para maior clareza
interface UserData {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
  };
}

export default function EditUserPage({ params }: { params: { id: string } }) {
  const [isPending, startTransition] = useTransition();
  const [user, setUser] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    fullName: { isValid: false, value: "" },
    email: { isValid: false, value: "" },
    password: { isValid: true, value: "" }, // Valid by default as it's optional
  });

  useEffect(() => {
    async function fetchUser() {
      const { data, error: fetchError } = await getUserById(params.id);
      if (fetchError || !data) {
        setError(fetchError?.message || "Usuário não encontrado.");
      } else {
        setUser(data);
        // Initialize form state with user data
        setFormState({
          fullName: { isValid: true, value: data.user_metadata.full_name },
          email: { isValid: true, value: data.email ?? "" },
          password: { isValid: true, value: "" },
        });
      }
    }
    fetchUser();
  }, [params.id]);

  const handleValidationChange = (id: string, isValid: boolean, value: string) => {
    setFormState((prevState) => ({
      ...prevState,
      [id]: { isValid, value },
    }));
  };

  // Name and Email are required, password is not (unless filled)
  const isFormValid = formState.fullName.isValid && formState.email.isValid && formState.password.isValid;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isFormValid && user) {
      startTransition(() => {
        const formData = new FormData();
        formData.append("fullName", formState.fullName.value);
        formData.append("email", formState.email.value);
        if (formState.password.value) { // Only include password if it was changed
          formData.append("password", formState.password.value);
        }
        updateUser(user.id, formData);
      });
    }
  };

  if (error) {
    return <div>Erro ao carregar: {error}</div>;
  }
  
  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Editar Usuário</h2>
        <Link href="/admin/users" className="text-blue-600 hover:underline">
          Voltar
        </Link>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">
        <form onSubmit={handleSubmit} className="space-y-6">
          <ValidatedInput
            id="fullName"
            label="Nome Completo"
            type="text"
            initialValue={user.user_metadata.full_name}
            validationRegex={/^([a-zA-Zà-úÀ-Ú]+)\s+([a-zA-Zà-úÀ-Ú\s]+)$/}
            errorMessage="Digite nome e sobrenome."
            onValidationChange={handleValidationChange}
          />
          <ValidatedInput
            id="email"
            label="Email"
            type="email"
            initialValue={user.email}
            validationRegex={/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/}
            errorMessage="Insira um e-mail válido."
            onValidationChange={handleValidationChange}
          />
          <p className="text-sm text-slate-500">
            Deixe a senha em branco para não a alterar.
          </p>
          <ValidatedInput
            id="password"
            label="Nova Senha"
            type="password"
            validationRegex={/(^$)|(.{6,})/} // Allows empty string OR min 6 chars
            errorMessage="A senha deve ter no mínimo 6 caracteres."
            onValidationChange={handleValidationChange}
          />
          <button
            type="submit"
            disabled={!isFormValid || isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isPending ? "Atualizando..." : "Atualizar Usuário"}
          </button>
        </form>
      </div>
    </div>
  );
}
