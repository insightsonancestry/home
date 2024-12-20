'use client'
import React from 'react';
import PlusIcon from '../assets/icons/plus.svg';
import MinusIcon from '../assets/icons/minus.svg';
import {AnimatePresence, motion} from "framer-motion";

const items = [
  {
    question: "What methodology is followed for admixture modelling?",
    answer: "In instances where the customer’s ethnic group has been successfully modeled in academic research, the same model will be utilized. If such a model is not available, a rotating strategy will be employed to identify the most suitable model.",
  },
  {
    question: "How long will it take for my order to get processed and how will I receive it?",
    answer: "Under normal circumstances, the maximum timeframe is 7 business days. We strive to deliver the results as soon as possible via email.",
  },
  {
    question: "Which raw file format should I upload?",
    answer: "We accept raw files from companies such as 23andMe, AncestryDNA, FTDNA (both old and new formats), MyHeritage, Mapmygenome, LivingDNA, and FamFinder by Gene By Gene.",
  },
  {
    question: "What if my admixture model doesn't pass with a p-value of 0.01 or 0.05? Do I get a refund?",
    answer: "We do not guarantee a successful model for the fee charged for admixture modeling. The fee covers the preparation of the dataset and running the models. We will provide the best possible model for your ancestry profile even if a passing model is not found.",
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
            <AnimatePresence>
            {isOpen && (
            <motion.div
              initial={{
                opacity: 0,
                height: 0,
                marginTop: 0,
              }}
              animate={{
                opacity: 1,
                height: "auto",
                marginTop: "16px",
              }}
              exit = {{
                opacity: 0,
                height: 0,
                marginTop: 0,
              }}
              >
                {answer}
                </motion.div>
                )}
            </AnimatePresence>
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