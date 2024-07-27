import Image from "next/image";
import logoImage from '../assets/images/logosaas.png';
import MenuIcon from '../assets/icons/menu.svg';
import ShopButton from './ShopButton'; // or BuyButton, based on your naming

export const Navbar = () => {
  return (
    <div className="bg-black">
      <div className="px-4">
        <div className="py-4 flex items-center justify-between">
          <div className="relative">
            <div className="absolute w-full top-2 bottom-0 bg-[linear-gradient(to_right,#0C60D0,#1816AB,#53BDE3,#171CAE,#70EDEF)] blur-md"></div>
            <Image src={logoImage} alt="Saas logo" className="h-12 w-12 relative" draggable="false" />
          </div>
          <div className="border border-white border-opacity-30 h-10 w-10 inline-flex justify-center items-center rounded-lg hidden">
            <MenuIcon className="text-white" />
          </div>
          <nav className="items-center gap-6 hidden sm:flex">
            <a href="#features" className="relative text-opacity-60 text-white hover:text-opacity-100 transition duration-600 before:absolute before:bottom-0 before:left-0 before:w-0 before:h-0.5 before:bg-white hover:before:w-full hover:before:transition-all hover:before:duration-1000">Services</a>
            <a href="#faqs" className="relative text-opacity-60 text-white hover:text-opacity-100 transition duration-600 before:absolute before:bottom-0 before:left-0 before:w-0 before:h-0.5 before:bg-white hover:before:w-full hover:before:transition-all hover:before:duration-1000">FAQ</a>
            <a href="mailto:insightsonancestry@gmail.com" className="relative text-opacity-60 text-white hover:text-opacity-100 transition duration-600 before:absolute before:bottom-0 before:left-0 before:w-0 before:h-0.5 before:bg-white hover:before:w-full hover:before:transition-all hover:before:duration-1000">Contact us</a>
            <ShopButton />
          </nav>
        </div>
      </div>
    </div>
  );
};