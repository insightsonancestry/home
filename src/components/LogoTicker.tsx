"use client";
import Image from 'next/image';
import admixturemodeling from '../assets/images/admixture_modeling.png';
import PCA from '../assets/images/pca.png';
import YDNA from '../assets/images/ydna.png';
import customdataset from '../assets/images/customdataset.png';
import rawfileconversion from '../assets/images/rawfile.png';
import { motion } from "framer-motion";

const images = [
  { src: admixturemodeling, alt: 'admixture modeling' },
  { src: PCA, alt: 'Principal Component Analysis' },
  { src: YDNA, alt: 'Y-chromosome haplogroup' },
  { src: customdataset, alt: 'curating custom dataset' },
  { src: rawfileconversion, alt: 'converting raw file format to 23andme' },
];

export const LogoTicker = () => {
  return (
    <div className="relative py-12 sm:py-16">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <h2 className="text-[10px] text-center uppercase tracking-[3px] mb-8" style={{ color: 'var(--text-faint)' }}>Services that we offer</h2>
        <div className="flex overflow-hidden before:content-[''] before:z-10 after:content-[''] before:absolute after:absolute before:h-full after:h-full before:w-10 after:w-10 sm:before:w-20 sm:after:w-20 relative after:right-0 before:left-0 before:top-0 after:top-0 before:bg-[linear-gradient(to_right,#0a0a0a,transparent)] after:bg-[linear-gradient(to_left,#0a0a0a,transparent)]">
          <motion.div
            transition={{ duration: 10, ease: "linear", repeat: Infinity }}
            initial={{ translateX: 0 }}
            animate={{ translateX: "-50%" }}
            className="flex gap-10 sm:gap-16 lg:gap-24 flex-none pr-10 sm:pr-16 lg:pr-24"
          >
            {images.map(({ src, alt }) => (
              <Image key={alt} src={src} alt={alt} className="flex-none h-8 sm:h-10 lg:h-12 w-auto opacity-40 hover:opacity-80 transition-opacity duration-300" />
            ))}
            {images.map(({ src, alt }) => (
              <Image key={`${alt}-dup`} src={src} alt={alt} className="flex-none h-8 sm:h-10 lg:h-12 w-auto opacity-40 hover:opacity-80 transition-opacity duration-300" />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};