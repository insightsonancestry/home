"use client";
import Image from "next/image";
import infographic from "../assets/images/Screenshot 2024-07-27 at 7.13.38 PM.png";
import {motion, useScroll, useTransform} from "framer-motion";
import { useEffect, useRef } from "react";

export const ProductShowcase = () => {
  const appImage = useRef<HTMLImageElement>(null);
  const {scrollYProgress} = useScroll({
       target: appImage,
       offset: ["start end", "end end"],
  });
 const rotateX = useTransform(scrollYProgress, [0,1], [25, 0]);
 const opacity = useTransform(scrollYProgress, [0, 1], [0.25, 1]);
  return ( 
      <div className="bg-black text-white bg-gradient-to-b from-black to-[#213897] py-[72px] sm:py-24">
        <div className="container">
          <h2 className="text-center text-5xl sm:text-6xl font-bold tracking-tighter">Simple infographics</h2>
            <div className="max-w-xl mx-auto">
            <p className="text-xl text-center text-white/70 mt-5">Our analytical tools for raw files are complex, so we use infographics to present the results in a more accessible manner for our customers.</p>
            <motion.div 
            style = {{
             opacity,
             rotateX,
             transformPerspective: '800px',
            }}
            >
            <Image 
            src={infographic} 
            alt="qpAdm infographic" 
            className="mt-14" 
            ref={appImage}
            />
            </motion.div>
            </div>
        </div>

      </div>
     

  );
};
