"use client";
import { Feature } from './Feature';
import { motion } from 'framer-motion';

const features = [
  {
    title: 'Admixture modeling',
    description: 'Admixture modeling using qpAdm which is the gold standard according to academics for precise ancestry composition analysis.',
  },
  {
    title: 'PCA Analysis',
    description: 'Principal Component Analysis with smartPCA for in-depth population structure insights.',
  },
  {
    title: 'Y-Haplogroup Calls',
    description: 'Manual Y-haplogroup calls to trace paternal lineage.',
  },
  {
    title: 'Custom Dataset Curation',
    description: 'Curating custom datasets by integrating publicly available academic samples with personal samples for amateur population genetics enthusiasts.',
  },
  {
    title: 'Raw file conversion',
    description: 'Converting raw files from companies like AncestryDNA, LivingDNA, Family Tree DNA and Mapmygenome into the widely used 23andme format.',
  },
  {
    title: 'Extracting raw files of ancient DNA samples',
    description: 'Extracting 23andme format raw files of ancient DNA samples in the Harvard AADR dataset.',
  }
];

export const Features = () => {
  return (
    <section id="features">
      <div className="relative py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-10 lg:gap-16">
            {/* Left sticky text */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <span className="text-[10px] uppercase tracking-[2px]" style={{ color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--accent)' }}>⧬</span> Our Services
              </span>
              <motion.h2
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl sm:text-4xl font-bold tracking-tighter mt-3 uppercase"
                style={{ color: 'var(--text-bright)' }}
              >
                Everything you need to know
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-sm mt-4 max-w-sm leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                This section highlights the benefits of our services, helping customers understand how our offerings can enhance their research and guide their decisions.
              </motion.p>
            </div>

            {/* Right side — stacking cards */}
            <div className="space-y-4">
              {features.map(({ title, description }, i) => (
                <motion.div
                  key={title}
                  className="sticky"
                  style={{ top: `${96 + i * 20}px` }}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <Feature title={title} description={description} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
