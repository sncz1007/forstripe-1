import RutInput from "@/components/RutInput";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function PaymentPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F1F1] overflow-x-hidden">
      <Header />
      
      <div className="container mx-auto">
        <div className="row pt-4">
          <div className="flex flex-col md:flex-row">
            {/* Left side: Payment Form */}
            <div className="w-full md:w-7/12 pt-5 pb-5 bg-white flex justify-center items-center">
              <div className="w-full max-w-md pt-5 pb-5">
                <RutInput />
              </div>
            </div>
            
            {/* Right side: Image Background */}
            <div className="w-full md:w-5/12 mb-5 md:mb-0 img-home">
              {/* This div uses the background image from CSS */}
            </div>
          </div>
        </div>
      </div>
      
      {/* Los estilos están en index.css */}
      
      <Footer />
    </div>
  );
}
