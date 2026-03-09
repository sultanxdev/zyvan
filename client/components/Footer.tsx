'use client';

import React from 'react';
import { TextHoverEffect } from './ui/text-hover-effect';
import Container from './Container';

const footerConfig = {
  text: "Design & Developed by",
  developer: "sultanxdev",
  links: [
    { label: "GitHub", href: "https://github.com/sultanxdev/zyvan" },
    { label: "LinkedIn", href: "#" },
    { label: "Email", href: "mailto:contact@example.com" },
  ],
  copyright: "All rights reserved.",
};

export default function Footer() {
  return (
    <footer className="bg-[#050505] border-t border-white/5 relative z-10 overflow-hidden">
      <Container className="py-16 pb-0">
        <div className="border-t border-white/10 pt-10">
          <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
            <p className="text-gray-400 text-xs">
              {footerConfig.text}{' '}
              <strong className="text-white font-medium">
                {footerConfig.developer}
              </strong>
            </p>
            <div className="text-gray-500 flex flex-wrap justify-center items-center gap-5 text-xs">
              {footerConfig.links.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith('mailto') ? undefined : '_blank'}
                  rel={
                    link.href.startsWith('mailto')
                      ? undefined
                      : 'noopener noreferrer'
                  }
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <span>
                &copy; {new Date().getFullYear()}. {footerConfig.copyright}
              </span>
            </div>
          </div>
        </div>
      </Container>


      <Container className="pb-8 mt-12">
        <div className="relative h-[8rem] sm:h-[12rem] md:h-[16rem] w-full flex items-center justify-center">
            <TextHoverEffect text="ZYVAN" duration={0.5} />
        </div>
      </Container>
    </footer>
  );
}
