'use client'
import React from 'react';
import PlusIcon from '../assets/icons/plus.svg';
import MinusIcon from '../assets/icons/minus.svg';
import clsx from "clsx";

const items = [
  {
    question: "What payment methods do you accept?",
    answer: "We accept all cards accepted by PayPal.",
  },
  {
    question: "How long will it take for my order to get processed and how will I receive it?",
    answer: "Under normal circumstances, the maximum timeframe is 5 days. We strive to deliver the results as soon as possible via email.",
  },
  {
    question: "Which raw file format should I upload?",
    answer: "We accept raw files from companies such as 23andMe, AncestryDNA, FTDNA (both old and new formats), MyHeritage, Mapmygenome, LivingDNA, and FamFinder by Gene By Gene.",
  },
  {
    question: "Is my data secure?",
    answer: "Customers' raw files and personal details are not shared with any other entity.",
  },
];

const AccordionItem = ({question, answer}: {question:string; answer: string;}) => 
  {
    const [isOpen, setIsOpen ] = React.useState(false);
  return (
    <div className="py-7 border-b border-white/30" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex items-center">
              <span className="flex-1 text-lg font-bold">{question}</span>
            {isOpen? <MinusIcon/>:<PlusIcon/>}
            </div>
            <div className={clsx("mt-4",{
              hidden: !isOpen,
              "": isOpen === true,
              })} 
              >
                {answer}
                </div>
          </div>
  )

}

export const FAQs = () => {
  return (
    <section id="faqs">
    <div className="bg-black text-white bg-gradient-to-b from-[#213897] to-black py-[72px] sm:py-24">
      <div className="container">
        <h2 className="text-center text-5xl sm:text-6xl sm:max-w-[648px] mx-auto font-bold tracking-tighter">Frequently asked questions</h2>
        <div className="mt-12 max-w-[648px] mx-auto">
        {items.map(({ question, answer }) => (
          <AccordionItem question={question} answer={answer} key={question} />
        ))}
        </div>
      </div>
    </div>
    </section>

  );
};