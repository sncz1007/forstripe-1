import React from 'react';

const Footer: React.FC = () => {
  return (
    <div className="w-full mt-auto">
      <footer className="bg-white w-full pt-10 pb-8 flex justify-center border-t border-gray-200">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="flex items-center justify-center">
            <span className="mr-4">
              <img src="/images/direccion.png" alt="Forum dirección" title="Forum dirección" width="32" />
            </span>
            <div>
              <small className="block text-sm text-gray-600">Dirección</small>
              <span className="text-[15px] text-gray-700">
                <a 
                  href="https://goo.gl/maps/61pyY167em2YuYUR7" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                >
                  Apoquindo 2929, piso -1 zócalo, Las Condes, Región Metropolitana
                </a>
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <span className="mr-4">
              <img src="/images/call-center.png" alt="Forum Call Center" title="Forum Call Center" width="32" />
            </span>
            <div>
              <small className="block text-sm text-gray-600">Contact Center</small>
              <span className="text-[15px] text-gray-700">
                <a href="tel:600 360 0077" title="Llamar contact center">
                  600 360 0077
                </a>
              </span>
              <br />
              <span className="text-[15px] text-gray-700">
                Lun - Vier 9:00 a 19:00
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <span className="mr-4">
              <img src="/images/time.png" alt="Forum Horarios de atención" title="Forum Horarios de atención" width="32" />
            </span>
            <div>
              <small className="block text-sm text-gray-600">Atención presencial</small>
              <span className="text-[15px] text-gray-700">
                Lun - Vier 9:00 a 17:00
              </span>
            </div>
          </div>
        </div>
      </footer>
      
      <footer className="bg-gray-600 py-4">
        <div className="container mx-auto">
          <div className="text-center">
            <small className="text-white text-sm">
              Forum {new Date().getFullYear()} todos los derechos reservados
            </small>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;