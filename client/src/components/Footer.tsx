import React from 'react';

const Footer: React.FC = () => {
  return (
    <>
      <div className="hidden md:block h-[345px]"></div>
      <div className="w-full absolute bottom-0">
        <footer className="bg-white w-full py-5 flex justify-center">
          <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center">
              <span className="mr-3">
                <img src="/images/direccion.svg" alt="Forum dirección" title="Forum dirección" />
              </span>
              <div>
                <small className="block text-sm">Dirección</small>
                <span className="text-base tracking-wide">
                  <a 
                    href="https://goo.gl/maps/61pyY167em2YuYUR7" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-800"
                  >
                    Apoquindo 2929, piso -1 zócalo, Las Condes, Región Metropolitana
                  </a>
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="mr-3">
                <img src="/images/call-center.svg" alt="Forum Call Center" title="Forum Call Center" />
              </span>
              <div>
                <small className="block text-sm">Contact Center</small>
                <span className="text-base tracking-wide">
                  <a href="tel:600 360 0077" title="Llamar contact center" className="text-gray-800">
                    600 360 0077
                  </a>
                </span>
                <br />
                <span className="text-base text-gray-800 tracking-wide">
                  Lun - Vier 9:00 a 19:00
                </span>
              </div>
            </div>
            
            <div className="flex items-center">
              <span className="mr-3">
                <img src="/images/time.svg" alt="Forum Horarios de atención" title="Forum Horarios de atención" />
              </span>
              <div>
                <small className="block text-sm">Atención presencial</small>
                <span className="text-base text-gray-800 tracking-wide">
                  Lun - Vier 9:00 a 17:00
                </span>
              </div>
            </div>
          </div>
        </footer>
        
        <footer className="bg-gray-900 py-5">
          <div className="container mx-auto">
            <div className="text-center">
              <small className="text-white text-sm">
                Forum {new Date().getFullYear()} todos los derechos reservados
              </small>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Footer;