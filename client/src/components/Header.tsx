import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white h-[60px] shadow-sm">
      <div className="container mx-auto h-full flex items-center justify-start">
        <div className="flex items-center">
          <a href="/" className="mr-4">
            <img src="/images/forum.png" width="110" alt="Forum" title="Forum" />
          </a>
          <a href="/" className="mx-4">
            <img src="/images/salvum-logo.png" width="110" alt="Salvum" title="Salvum" />
          </a>
          <h1 className="text-3xl text-[#00C2CB] font-light tracking-wide m-0 ml-4">
            Pago Express
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;