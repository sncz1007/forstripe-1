import React, { useState } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { validateRut, formatRut } from "@/lib/rutValidator";
import { LoadingSpinner } from "./LoadingSpinner";

// Form schema with validation
const formSchema = z.object({
  rut: z.string()
    .min(1, "El RUT es obligatorio")
    .refine(validateRut, "RUT inválido. Revisa el formato y dígito verificador"),
});

type FormValues = z.infer<typeof formSchema>;

export default function RutInput() {
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rut: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      console.log("Enviando solicitud con RUT:", data.rut);
      
      // Send payment request to server
      const response = await fetch("/api/payment-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rut: data.rut }),
      });
      
      if (!response.ok) {
        throw new Error("Error al procesar la solicitud");
      }
      
      const result = await response.json();
      console.log("Solicitud creada exitosamente, ID:", result.requestId);
      
      // Verificar que se ha creado correctamente
      const verifyResponse = await fetch(`/api/payment-request/${result.requestId}`);
      if (!verifyResponse.ok) {
        throw new Error("Error al verificar la solicitud");
      }
      const verifyResult = await verifyResponse.json();
      console.log("Solicitud verificada:", verifyResult);
      
      // Redirect to loading page with request ID
      setLocation(`/payment/${result.requestId}`);
    } catch (error) {
      console.error("Error al enviar la solicitud:", error);
      setIsSubmitting(false);
    }
  };

  // Format RUT as user types
  const handleRutChange = (e: React.ChangeEvent<HTMLInputElement>, onChange: (...event: any[]) => void) => {
    const formatted = formatRut(e.target.value);
    onChange(formatted);
  };

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-primary font-bold text-[20px]">Pagar es rápido y fácil</h2>
        <p className="text-[16px] mb-4 tracking-wide">
          Ahora el pago de tu crédito es <br /> totalmente en línea.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="mt-3 mb-3">
            <small className="mb-1 w-full text-[14px] text-gray-800 block">Rut</small>
            <FormField
              control={form.control}
              name="rut"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <Input 
                        placeholder="RUT" 
                        {...field} 
                        onChange={(e) => handleRutChange(e, field.onChange)}
                        className="border-gray-800 border-r-0 rounded-l text-[16px] py-2"
                        minLength={8}
                        maxLength={12}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-red-500 mt-1 mb-1 w-full" />
                </FormItem>
              )}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full py-3 mt-5 tracking-widest"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="small" color="white" />
                <span className="ml-2">Procesando...</span>
              </div>
            ) : (
              "Ir a Pagar"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}