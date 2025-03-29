import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white h-[60px] shadow-sm">
      <div className="container mx-auto h-full flex items-center">
        <div className="flex items-center">
          <a href="/" className="pr-2">
            <img src="/images/forum.svg" width="110" alt="Forum" title="Forum" />
          </a>
          <a href="/" className="pl-2">
            <img src="/images/salvum-logo.svg" width="110" alt="Salvum" title="Salvum" />
          </a>
        </div>
        <div className="flex-grow">
          <h1 className="text-3xl text-primary font-medium tracking-wide m-0 truncate text-center">
            Pago Express
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;