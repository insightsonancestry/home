import Image from "next/image";
import infographic from "../assets/images/Screenshot 2024-07-27 at 7.13.38 PM.png";

export const ProductShowcase = () => {
  return ( 
      <div className="bg-black text-white bg-gradient-to-b from-black to-[#213897] py-[72px] sm:py-24">
        <div className="container">
          <h2 className="text-center text-5xl sm:text-6xl font-bold tracking-tighter">Simple infographics</h2>
            <div className="max-w-xl mx-auto">
            <p className="text-xl text-center text-white/70 mt-5">Our analytical tools for raw files are complex, so we use infographics to present the results in a more accessible manner for our customers.</p>
            <Image src={infographic} alt="qpAdm infographic" className="mt-14" />
            </div>
        </div>

      </div>
     

  );
};
