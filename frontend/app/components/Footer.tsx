import React from "react";
import {
  FaFacebook,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import FeedbackFooterForm from "./FeedbackFooterForm";

const Footer = () => {
  return (
    <footer className="bg-[#0B0D17] text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-10 lg:grid lg:grid-cols-4 lg:gap-12 lg:space-y-0">
        {/* Logo */}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-white mb-2">ARC•READ</h2>
          <p className="text-sm text-gray-400">
            Монгол уншигчдад зориулсан манхуа унших платформ.
          </p>
        </div>

        {/* Support */}
        <div className="text-center sm:text-left">
          <h3 className="text-white font-semibold mb-3 text-lg">Тусламж</h3>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-white cursor-pointer">Бидний тухай</li>
            <li className="hover:text-white cursor-pointer">Холбоо барих</li>
          </ul>
        </div>

        {/* Social Icons */}
        <div className="text-center sm:text-left">
          <h3 className="text-white font-semibold mb-3 text-lg">Биднийг дагах</h3>

          <div className="flex justify-center sm:justify-start gap-6 text-3xl">
            <a
              href="https://facebook.com"
              target="_blank"
              className="hover:text-white transition"
            >
              <FaFacebook />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              className="hover:text-white transition"
            >
              <FaInstagram />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              className="hover:text-white transition"
            >
              <FaXTwitter />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              className="hover:text-white transition"
            >
              <FaYoutube />
            </a>
          </div>
        </div>

        {/* Feedback */}
        <div className="text-center sm:text-left">
          <h3 className="text-white font-semibold mb-3 text-lg">Санал хүсэлт</h3>
          <FeedbackFooterForm />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-zinc-800 py-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
