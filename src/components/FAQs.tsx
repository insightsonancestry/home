'use client'
import React from 'react';
import PlusIcon from '../assets/icons/plus.svg';
import MinusIcon from '../assets/icons/minus.svg';
import { AnimatePresence, motion } from "framer-motion";

const items = [
  {
    question: "What methodology is followed for admixture modelling?",
    answer: "In instances where the customer's ethnic group has been successfully modeled in academic research, the same model will be utilized. If such a model is not available, a rotating strategy will be employed to identify the most suitable model.",
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

const AccordionItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <div
      className="py-5 border-b cursor-pointer group"
      style={{ borderColor: 'var(--border)' }}
      onClick={() => setIsOpen(!isOpen)}
    >
      <div className="flex items-center">
        <span className="flex-1 text-sm font-bold uppercase tracking-wide transition-colors"
          style={{ color: isOpen ? 'var(--accent)' : 'var(--text-primary)' }}>
          {question}
        </span>
        <div className="ml-4 h-7 w-7 flex items-center justify-center flex-shrink-0 border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
          {isOpen ? <MinusIcon /> : <PlusIcon />}
        </div>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: "12px" }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-muted)' }}
          >
            {answer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const FAQs = () => {
  return (
    <section id="faqs">
      <div className="relative py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-16">
            <div>
              <span className="text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)' }}>⧬</span> FAQ
              </span>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl sm:text-4xl font-bold tracking-tighter mt-3 uppercase"
                style={{ color: 'var(--text-bright)' }}
              >
                Frequently asked questions
              </motion.h2>
            </div>
            <div>
              {items.map(({ question, answer }) => (
                <AccordionItem question={question} answer={answer} key={question} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
