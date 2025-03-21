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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { validateRut, formatRut } from "@/lib/rutValidator";
import { LoadingSpinner } from "./LoadingSpinner";
import { apiRequest } from "@/lib/queryClient";

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
    <Card className="w-full max-w-md p-6 shadow-lg rounded-xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-center text-primary">Pago en Línea</h2>
        <p className="text-gray-500 text-center mt-2">
          Ingrese su RUT para continuar con el pago
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="rut"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">RUT</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="12.345.678-9" 
                    {...field} 
                    onChange={(e) => handleRutChange(e, field.onChange)}
                    className="text-lg py-6"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full py-6 text-lg"
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
    </Card>
  );
}