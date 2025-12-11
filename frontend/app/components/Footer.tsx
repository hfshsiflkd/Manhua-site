import React from "react";

const Footer = () => {
  return (
    <footer className="bg-[#0B0D17] text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10">
        {/* Logo / About */}
        <div>
          <h2 className="text-xl font-bold text-white mb-3">Manhua.mn</h2>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-white font-semibold mb-3">Support</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-white cursor-pointer">About Us</li>
            <li className="hover:text-white cursor-pointer">Contact</li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800 py-4 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
