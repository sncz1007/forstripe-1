import { Card } from "@/components/ui/card";
import RutInput from "@/components/RutInput";

export default function PaymentPage() {
  return (
    <div className="flex justify-center items-center min-h-screen p-4 bg-white">
      <Card className="max-w-[1000px] w-full shadow-lg rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side: Payment Form */}
          <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
            <div className="mb-8">
              <h1 className="text-primary text-2xl font-medium mb-2">
                Pagar es rápido y fácil
              </h1>
              <p className="text-gray-600">
                Ahora el pago de tu crédito es totalmente en línea.
              </p>
            </div>
            
            <RutInput />
          </div>
          
          {/* Right side: Image */}
          <div className="w-full md:w-1/2">
            <img 
              src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80" 
              alt="Pareja revisando información en una tablet" 
              className="object-cover w-full h-full"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
