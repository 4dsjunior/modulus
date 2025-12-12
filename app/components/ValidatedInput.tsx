"use client";

import { useState, ChangeEvent, FocusEvent } from "react";

// 1. Tipagem para as Props do Componente
interface ValidatedInputProps {
  id: string;
  label: string;
  type: "text" | "email" | "password" | "tel";
  validationRegex: RegExp;
  errorMessage: string;
  initialValue?: string;
  onValidationChange: (id: string, isValid: boolean, value: string) => void;
  className?: string;
  autoComplete?: string;
}

// 2. Definição do Componente
export default function ValidatedInput({
  id,
  label,
  type,
  validationRegex,
  errorMessage,
  initialValue = "",
  onValidationChange,
  className = "",
  autoComplete,
}: ValidatedInputProps) {
  // 3. Estados para Controle Interno
  const [value, setValue] = useState(initialValue);
  const [isTouched, setIsTouched] = useState(false);
  const [error, setError] = useState("");

  const validate = (currentValue: string) => {
    if (!validationRegex.test(currentValue)) {
      setError(errorMessage);
      onValidationChange(id, false, currentValue);
      return false;
    }
    setError("");
    onValidationChange(id, true, currentValue);
    return true;
  };

  // 4. Handlers de Eventos
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    // Valida em tempo real se o campo já foi tocado e está em estado de erro
    if (isTouched && error) {
      validate(newValue);
    } else if (isTouched) {
      // Limpa o erro ao digitar, mas revalida para manter o estado do form atualizado
      onValidationChange(id, validationRegex.test(newValue), newValue);
    }
  };

  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsTouched(true);
    validate(e.target.value);
  };

  // 5. Lógica para Estilos Condicionais (Tailwind CSS)
  const isError = isTouched && error !== "";
  const isValid = isTouched && error === "";

  const baseClasses = "w-full rounded-lg p-3 text-sm outline-none transition-all";
  
  const defaultClasses = "border border-gray-200 bg-[#fbfbfb] text-gray-700 placeholder-[#cecece] placeholder:opacity-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";
  
  // Para erros, vou manter as cores de erro para texto e fundo, mas aplicar o placeholder consistente
  const errorClasses = "border border-red-500 bg-red-50 text-red-900 placeholder-[#cecece] placeholder:opacity-100 focus:border-red-500 focus:ring-1 focus:ring-red-200"; // Mantendo o foco vermelho para erro
  
  // Para sucesso, vou manter as cores de sucesso para texto e fundo, mas aplicar o placeholder consistente
  const successClasses = "border border-green-500 bg-green-50 text-green-900 placeholder-[#cecece] placeholder:opacity-100 focus:border-green-500 focus:ring-1 focus:ring-green-200"; // Mantendo o foco verde para sucesso

  const inputClassName = `
    ${baseClasses}
    ${isError ? errorClasses : (isValid ? successClasses : defaultClasses)}
    ${className}
  `;

  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={inputClassName.trim()}
          autoComplete={autoComplete}
          aria-invalid={isError}
          aria-describedby={isError ? `${id}-error` : undefined}
        />
        {/* Ícone de Sucesso (Opcional) */}
        {isValid && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
      {/* Mensagem de Erro */}
      {isError && (
        <p id={`${id}-error`} className="text-red-600 text-sm mt-1 font-medium animate-pulse" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
