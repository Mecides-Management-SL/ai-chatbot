"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { AuthForm } from "@/components/auth-form";
import { SubmitButton } from "@/components/submit-button";
import { toast } from "@/components/toast";
import { type LoginActionState, login } from "../actions";

export default function Page() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [isSuccessful, setIsSuccessful] = useState(false);

  const [state, formAction] = useActionState<LoginActionState, FormData>(
    login,
    {
      status: "idle",
    }
  );

  const { update: updateSession } = useSession();

  useEffect(() => {
    if (state.status === "failed") {
      toast({
        type: "error",
        description: "Credenciales inválidas",
      });
    } else if (state.status === "invalid_data") {
      toast({
        type: "error",
        description: "Error al validar tu información",
      });
    } else if (state.status === "success") {
      setIsSuccessful(true);
      // Prevent multiple session updates by using a single call
      updateSession().then(() => {
        // Navigate after session is updated
        router.push('/');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const handleSubmit = (formData: FormData) => {
    setEmail(formData.get("email") as string);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start justify-center bg-background pt-12 md:items-center md:pt-0">
      <div className="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="font-semibold text-xl dark:text-zinc-50">Iniciar sesión</h3>
          <p className="text-gray-500 text-sm dark:text-zinc-400">
            Use tu email y contraseña para iniciar sesión
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton isSuccessful={isSuccessful}>Iniciar sesión</SubmitButton>
          {/* <p className="mt-4 text-center text-gray-600 text-sm dark:text-zinc-400">
            {"No tienes una cuenta? "}
            <Link
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              href="/register"
            >
              Registrarse
            </Link>
            {" gratis."}
          </p> */}
        </AuthForm>
      </div>
    </div>
  );
}
