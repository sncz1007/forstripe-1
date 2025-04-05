import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto">
        <div className="flex items-center h-[48px] pl-6">
          <a href="/" className="mr-4">
            <img src="/images/forum.png" width="60" alt="Forum" title="Forum" />
          </a>
          <a href="/" className="mr-4 border-r border-gray-300 pr-3">
            <img src="/images/salvum-logo.png" width="80" alt="Salvum" title="Salvum" />
          </a>
          <h1 className="text-xl text-[#00AEEF] font-light m-0">
            Pago Express
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;