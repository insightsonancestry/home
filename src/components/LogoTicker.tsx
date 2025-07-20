"use client";
import Image from 'next/image';
import admixturemodelling from '../assets/images/admixture_modelling.png';
import PCA from '../assets/images/pca.png';
import YDNA from '../assets/images/ydna.png';
import customdataset from '../assets/images/customdataset.png';
import rawfileconversion from '../assets/images/rawfile.png';
import {motion} from "framer-motion";

const images = [
  {src: admixturemodelling, alt:'admixture modelling'}, 
  {src: PCA, alt:'Principal Component Analysis'}, 
  {src: YDNA, alt:'Y-chromosome haplogroup'}, 
  {src: customdataset, alt:'curating custom dataset'}, 
  {src: rawfileconversion, alt:'converting raw file format to 23andme'}, 
];

export const LogoTicker = () => {
  return (
    <div className="bg-black text-white py-[72px] sm:py-24">
      <div className="container">
        <h2 className="text-xl text-center text-white/70">Services that we offer</h2>
        <div className="flex overflow-hidden mt-9 before:content-[''] before:z-10 after:content-[''] before:absolute after:absolute before:h-full after:h-full before:w-5 after:w-5 relative after:right-0 before:left-0 before:top-0 after:top-0 before:bg-[linear-gradient(to_right,#000,rgb(0,0,0,0)] after:bg-[linear-gradient(to_left,#000,rgb(0,0,0,0)]">
          <motion.div 
                      transition={{
                        duration: 10,
                        ease: "linear",
                        repeat: Infinity,
                      }}
                      initial={{translateX: 0}}
                      animate={{translateX: "-50%"}}
                      className="flex gap-16 flex-none pr-16">
          {images.map(({ src, alt }) => (
            <Image key={alt} src={src} alt={alt} className="flex-none  h-10 w-2000" />
          ))}
          {images.map(({ src, alt }) => (
            <Image key={alt} src={src} alt={alt} className="flex-none  h-10 w-2000" />
          ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};