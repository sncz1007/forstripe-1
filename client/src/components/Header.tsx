import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white h-[70px] shadow-sm">
      <div className="container mx-auto h-full">
        <div className="flex items-center h-full justify-start pl-12">
          <a href="/" className="mr-8">
            <img src="/images/forum.png" width="120" alt="Forum" title="Forum" />
          </a>
          <a href="/" className="mr-8">
            <img src="/images/salvum-logo.png" width="120" alt="Salvum" title="Salvum" />
          </a>
          <h1 className="text-3xl text-[#00AEEF] font-light tracking-wide m-0 ml-4">
            Pago Express
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;