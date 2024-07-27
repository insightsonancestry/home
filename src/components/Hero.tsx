import ArrowIcon from '../assets/icons/arrow-w.svg';
import Image from "next/image";
import cursorImage from '../assets/images/cursor.png';
import dnaImage from '../assets/images/dna.png';
import { motion } from 'framer-motion';
import BuyButton from './BuyButton';

export const Hero = () => {
  return (
    <div className="bg-black text-white bg-[linear-gradient(to_bottom,#000000_20%,#062d55_34%,#0d5299_65%,#2385e8_82%)] py-[72px] sm:py-24 relative overflow-clip">
      <div className="absolute h-[375px] w-[750px] sm:w-[1536px] sm:h-[768px] lg:w-[2400px] lg:h-[1200px] rounded-[100%] bg-black left-1/2 -translate-x-1/2 border border-[#4d99d6] bg-[radial-gradient(closest-side,#000_82%,#2a45bb)] top-[calc(100%-96px)] sm:top-[calc(100%-120px)]"></div>
      <div className="container relative">
        <div className="flex items-center justify-center">
          <a href="#" className="inline-flex flex-col sm:flex-row gap-3 border py-1 px-2 rounded-lg border-white/30">
            <span className="bg-[linear-gradient(to_right,rgb(83,189,227),rgb(112,237,239))] text-transparent bg-clip-text [-webkit-background-clip:text] text-center sm:text-left">Affordable ancestry modelling is here</span>
            <span className="inline-flex items-center gap-1 justify-center sm:justify-start">
              <span>Read more</span>
              <ArrowIcon />
            </span>
          </a>
        </div>
        <div className="flex justify-center mt-8">
          <div className="inline-flex relative">
            <h1 className="text-7xl sm:text-9xl font-bold tracking-tighter text-center inline-flex">Decode your<br />ancestry</h1>
            <Image src={cursorImage} height="200" width="200" alt="" className="absolute right-[600px] top-[150px] hidden sm:inline" />
            <Image src={dnaImage} alt="" height="400" width="300" className="absolute top-[50px] left-[550px] hidden sm:inline" />
          </div>
        </div>
        <div className="flex justify-center">
          <p className="text-center text-xl mt-8 max-w-md">Unlock the secrets of your ancestry with our affordable DNA analysis services. We specialize in connecting your DNA to ancient populations, offering you a unique insight into your genetic heritage.</p>
        </div>
        <div className="flex justify-center mt-8">
          <BuyButton />
        </div>
      </div>
    </div>
  );
};