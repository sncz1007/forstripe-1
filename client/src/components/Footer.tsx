import React from 'react';

const Footer: React.FC = () => {
  return (
    <div className="w-full mt-auto">
      <footer className="bg-white w-full py-6 border-t border-gray-200">
        <div className="container mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-center">
            <span className="mr-3">
              <img src="/images/direccion.png" alt="Dirección" width="24" />
            </span>
            <div>
              <small className="block text-xs font-semibold text-gray-600">Dirección</small>
              <span className="text-sm text-gray-700">
                Apoquindo 2929, piso -1 zócalo, Las Condes, Región Metropolitana
              </span>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="mr-3">
              <img src="/images/call-center.png" alt="Contact Center" width="24" />
            </span>
            <div>
              <small className="block text-xs font-semibold text-gray-600">Contact Center</small>
              <span className="text-sm text-gray-700">600 360 0077</span>
              <br />
              <span className="text-sm text-gray-700">
                Lun - Vier 9:00 a 19:00
              </span>
            </div>
          </div>
          
          <div className="flex items-center">
            <span className="mr-3">
              <img src="/images/time.png" alt="Atención presencial" width="24" />
            </span>
            <div>
              <small className="block text-xs font-semibold text-gray-600">Atención presencial</small>
              <span className="text-sm text-gray-700">
                Lun - Vier 9:00 a 17:00
              </span>
            </div>
          </div>
        </div>
      </footer>
      
      <footer className="bg-gray-500 py-2">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <small className="text-white text-xs">
              Forum {new Date().getFullYear()} todos los derechos reservados
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;