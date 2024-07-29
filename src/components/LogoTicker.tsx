import Image from 'next/image';
import admixturemodelling from '../assets/images/admixture_modelling.png';
import PCA from '../assets/images/pca.png';
import YDNA from '../assets/images/ydna.png';
import customdataset from '../assets/images/customdataset.png';
import rawfileconversion from '../assets/images/rawfile.png';
import extractingrawfiles from '../assets/images/extracting-rawfiles.png';

const images = [
  { src: admixturemodelling, alt: "admixture modelling text" },
  { src: PCA, alt: "PCA" },
  { src: YDNA, alt: "Y-DNA haplogroup" },
  { src: customdataset, alt: "custom dataset" },
  { src: rawfileconversion, alt: "raw file conversion" },
  { src: extractingrawfiles, alt: "extracting raw files of ancient DNA samples" }
];

export const LogoTicker = () => {
  return (
    <div className="bg-black text-white py-[72px] sm:py-24">
      <div className="container">
        <h2 className="text-xl text-center text-white/70">Services that we offer</h2>
        <div className="overflow-hidden mt-9 before:content-[''] after:content[''] before:absolute after:absolute before:h-full after:h-full before:w-5 after:w-5 relative after:right-0 before:left-0 before:top-0 after:top-0 before:bg-[linear-gradient(to_right,#000,rgb(0,0,0,0))] after:bg-[linear-gradient(to_left,#000,rgb(0,0,0,0))]">
          <div className="flex gap-16 justify-center items-center">
          {images.map(({src, alt}) => (
            <Image 
              src={src} 
              alt={alt}
              key={alt}
              className="flex-none h-8 w-auto"
            />
          ))}
          </div>
        </div>
      </div>
    </div>
  );
};