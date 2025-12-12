
"use client";



import { useState, useTransition, useEffect } from "react";

import { updateUser, getUserForEditing } from "../../actions"; // getUserForEditing importada

import ValidatedInput from "../../../../components/ValidatedInput";



interface UserData {

  id: string;

  email?: string;

  full_name?: string;

}



export default function EditUserPage({ params }: { params: { id: string } }) {

  const [isPending, startTransition] = useTransition();

  const [error, setError] = useState<string | null>(null);



  const [formState, setFormState] = useState({

    fullName: { isValid: false, value: "" },

    email: { isValid: false, value: "" },

    password: { isValid: true, value: "" },

  });



  useEffect(() => {

    async function fetchUser() {

      const result = await getUserForEditing(params.id);

      if (result.error) {

        setError(result.error);

      } else {

        // Inicializa o estado do formulário com os dados do usuário

        setFormState({

          fullName: { isValid: true, value: result.full_name || "" },

          email: { isValid: true, value: result.email || "" },

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



  const isFormValid = formState.fullName.isValid && formState.email.isValid && formState.password.isValid;



  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {

    event.preventDefault();

    if (isFormValid && params.id) {

      startTransition(() => {

        const formData = new FormData();

        formData.append("fullName", formState.fullName.value);

        formData.append("email", formState.email.value);

        if (formState.password.value) {

          formData.append("password", formState.password.value);

        }

        updateUser(params.id, formData);

      });

    }

  };



  if (error) {

    return <div className="text-red-600 font-bold p-8">{error}</div>;

  }

  

  // Mostra um estado de carregamento enquanto os dados não chegam

  if (!formState.email.value && !formState.fullName.value) {

    return <div className="p-8">Carregando...</div>;

  }



  return (

    <div className="max-w-xl mx-auto">

      <h2 className="text-2xl font-bold text-slate-800 mb-6">Editar Usuário</h2>

      <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-100">

        <form onSubmit={handleSubmit} className="space-y-6">

          <ValidatedInput

            id="fullName"

            label="Nome Completo"

            type="text"

            initialValue={formState.fullName.value}

            validationRegex={/^([a-zA-Zà-úÀ-Ú]+)\s+([a-zA-Zà-úÀ-Ú\s]+)$/}

            errorMessage="Digite nome e sobrenome."

            onValidationChange={handleValidationChange}

          />

          <ValidatedInput

            id="email"

            label="Email"

            type="email"

            initialValue={formState.email.value}

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

            validationRegex={/(^$)|(.{6,})/}

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
