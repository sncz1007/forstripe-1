import RutInput from "@/components/RutInput";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F1F1] overflow-x-hidden">
      <Header />
      
      <div className="container mx-auto">
        <div className="row pt-4">
          <div className="flex flex-col md:flex-row h-full bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Left side: Payment Form */}
            <div className="w-full md:w-1/2 pt-8 pb-8 bg-white flex justify-center items-center">
              <div className="w-full px-10">
                <RutInput />
              </div>
            </div>
            
            {/* Right side: Image */}
            <div className="w-full md:w-1/2 h-auto">
              <img 
                src="/images/caratula.png" 
                alt="Consulta tu pago" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Los estilos están en index.css */}
      
      <Footer />
    </div>
  );
}
