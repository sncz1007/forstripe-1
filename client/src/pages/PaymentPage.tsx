import RutInput from "@/components/RutInput";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F1F1] overflow-x-hidden">
      <Header />
      
      <div className="flex justify-center items-center py-8">
        <div style={{ width: '1395px', height: '911px' }} className="mx-auto">
          <div className="flex flex-col md:flex-row h-full bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Left side: Payment Form */}
            <div className="w-full md:w-1/2 pt-8 pb-8 bg-white flex justify-center items-center">
              <div className="w-full px-16">
                <RutInput />
              </div>
            </div>
            
            {/* Right side: Image */}
            <div className="w-full md:w-1/2 h-full">
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
